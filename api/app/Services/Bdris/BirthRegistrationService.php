<?php

declare(strict_types=1);

namespace App\Services\Bdris;

use App\Enums\BirthRegStatus;
use App\Models\BirthRegistration;
use App\Models\Upazila;
use App\Support\CertificateAssets;
use App\Models\Pregnancy;
use Illuminate\Support\Facades\Storage;

/**
 * Orchestrates the pregnancy → Sochib approval → BDRIS → certificate chain (§8.1 steps 4–5).
 */
class BirthRegistrationService
{
    public function __construct(private BdrisGateway $bdris) {}

    /**
     * Sochib approval of a delivered pregnancy: create (or reuse) the linked birth-registration
     * record from the already-collected fields, then submit it to BDRIS. Idempotent per pregnancy.
     */
    public function approveFromPregnancy(Pregnancy $pregnancy, array $overrides = [], ?int $userId = null): BirthRegistration
    {
        $reg = BirthRegistration::firstOrNew(['pregnancy_id' => $pregnancy->id]);

        if (! $reg->exists) {
            $reg->fill([
                'child_name' => $overrides['child_name'] ?? null,
                'mother_name' => $pregnancy->mother_name_bn,
                'father_name' => $overrides['father_name'] ?? $pregnancy->husband_name,
                'union_id' => $pregnancy->union_id,
                'ward_no' => $pregnancy->ward_no,
                'date_of_birth' => $pregnancy->actual_delivery_date,
                'sex' => $pregnancy->baby_sex,
                'created_by' => $userId,
            ]);
            $reg->save(); // tenant_id auto-fills via BelongsToTenant
        }

        return $this->submitToBdris($reg);
    }

    /**
     * Submit a birth registration to BDRIS and, on success, store the registration number and a
     * generated certificate. Already-entered records are returned unchanged (idempotency).
     */
    public function submitToBdris(BirthRegistration $reg): BirthRegistration
    {
        if ($reg->isEntered()) {
            return $reg;
        }

        $result = $this->bdris->submit($reg);

        $reg->registration_no = $result->registrationNo;
        $reg->bdris_reference = $result->reference;
        $reg->bdris_submitted_at = now();
        $reg->status = BirthRegStatus::ENTERED;
        $reg->certificate_path = $this->generateCertificate($reg);
        $reg->save();

        return $reg;
    }

    /**
     * Render + store the birth certificate. A self-contained HTML document for now (no PDF
     * dependency); a real adapter would render a PDF via dompdf/Snappy (§12). Tenant-scoped path.
     */
    private function generateCertificate(BirthRegistration $reg): string
    {
        $path = "certificates/{$reg->tenant_id}/birthreg-{$reg->id}.html";
        Storage::disk('public')->put($path, $this->certificateHtml($reg));

        return $path;
    }

    /**
     * The certificate, laid out as the official BDRIS জন্ম নিবন্ধন সনদ: government header with a
     * scannable QR and barcode, registration/issuance dates either side of the number, and the
     * bilingual identity rows over a watermark.
     *
     * Bengali labels sit beside their English counterparts as on the official form, but each row
     * carries ONE value. The record holds only Bengali names — printing a transliteration we do
     * not have would be inventing what the certificate asserts.
     */
    private function certificateHtml(BirthRegistration $reg): string
    {
        $reg->loadMissing('union', 'pregnancy');

        $upazila = Upazila::with('district')->find($reg->tenant_id);
        $district = $upazila?->district?->name_bn ?? '';
        $union = $reg->union?->name_bn ?? '';

        $dob = $reg->date_of_birth;
        $issued = $reg->bdris_submitted_at ?? $reg->updated_at ?? now();

        $place = trim(implode(', ', array_filter([$upazila?->name_bn, $district])));
        $address = trim(implode(', ', array_filter([
            $reg->pregnancy?->address,
            $union ? $union.' ইউনিয়ন' : null,
            $reg->ward_no ? 'ওয়ার্ড-'.$reg->ward_no : null,
            $district,
        ])));

        $rows = [
            ['নাম', 'Name', $reg->child_name ?? '—'],
            ['মাতা', 'Mother', $reg->mother_name ?? '—'],
            ['মাতার জাতীয়তা', 'Nationality', 'বাংলাদেশী'],
            ['পিতা', 'Father', $reg->father_name ?? '—'],
            ['পিতার জাতীয়তা', 'Nationality', 'বাংলাদেশী'],
            ['জন্মস্থান', 'Place of Birth', $place ?: '—'],
            ['স্থায়ী ঠিকানা', 'Permanent Address', $address ?: '—'],
        ];

        $body = '';
        foreach ($rows as [$bn, $en, $value]) {
            $body .= '<tr><td class="lb">'.e($bn).'</td><td class="le">'.e($en).'</td>'
                .'<td class="v">: '.e((string) $value).'</td></tr>';
        }

        $crest = CertificateAssets::seal('bd-govt-seal.png');
        // The Registrar General's seal is the watermark. Until that file is dropped in, the
        // national seal stands in rather than leaving a blank page behind the text.
        $watermark = CertificateAssets::seal('registrar-seal.png') ?? $crest;

        $qr = CertificateAssets::qr($this->verifyUrl($reg));
        $barcode = $reg->registration_no ? CertificateAssets::barcode($reg->registration_no) : '';
        $sex = $reg->sex === 'female' ? 'Female' : ($reg->sex === 'male' ? 'Male' : '—');

        // The official form's footer cites bdris.gov.bd. Saying that while the gateway is mocked
        // would put a false provenance on a government document, so it states what is true.
        $footer = config('bdris.driver') === 'mock'
            ? 'এই সনদটি সুরাহা সিস্টেম থেকে তৈরি (ডেমো/পরীক্ষামূলক) — BDRIS সংযোগ সক্রিয় নয়।'
            : 'This certificate is generated from bdris.gov.bd, and to verify this certificate, please scan the above QR Code & Bar Code';

        $regNo = e((string) ($reg->registration_no ?? '—'));
        $dobStr = $dob?->format('d/m/Y') ?? '—';
        $inWord = $dob ? $this->dateInWords($dob) : '—';

        return <<<HTML
        <!doctype html><html lang="bn"><head><meta charset="utf-8">
        <title>জন্ম নিবন্ধন সনদ - {$regNo}</title>
        <style>
          @page{size:A4;margin:14mm}
          *{box-sizing:border-box}
          body{font-family:'Noto Sans Bengali','Nirmala UI',system-ui,sans-serif;color:#111;margin:0;background:#f4f4f4}
          .sheet{position:relative;width:190mm;min-height:267mm;margin:8mm auto;padding:12mm 14mm;background:#fff;
                 box-shadow:0 2px 12px rgba(0,0,0,.18);overflow:hidden}
          .wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              opacity:.12;pointer-events:none}
          .wm img{width:95mm;height:auto}
          .top{display:flex;align-items:flex-start;justify-content:space-between;gap:8mm}
          .top img{display:block}
          .qr{width:26mm}.bar{width:52mm}
          .crest{width:17mm;height:17mm;display:block;margin:0 auto 2mm}
          .head{flex:1;text-align:center}
          .head h1{font-size:13.5pt;margin:0 0 1.5mm;font-weight:600}
          .head p{margin:0 0 1mm;font-size:10.5pt}
          .rule{font-size:9.5pt;color:#333}
          h2{text-align:center;font-size:14pt;margin:6mm 0 4mm}
          .meta{display:flex;justify-content:space-between;align-items:flex-start;font-size:10pt;margin-bottom:5mm}
          .meta .mid{text-align:center}
          .meta .mid b{display:block;font-size:12pt;letter-spacing:.4px;margin-top:1mm}
          .dob{display:flex;justify-content:space-between;font-size:10.5pt;margin-bottom:1.5mm}
          .word{font-size:10.5pt;margin-bottom:6mm}
          table{width:100%;border-collapse:collapse;position:relative;z-index:1}
          td{padding:2.1mm 0;font-size:10.5pt;vertical-align:top}
          .lb{width:32mm}.le{width:34mm}.v{font-weight:500}
          .sign{display:flex;justify-content:space-between;margin-top:24mm;font-size:10pt;text-align:center}
          .sign div{width:70mm}
          .sign b{display:block;font-weight:600;margin-bottom:1mm}
          .foot{margin-top:12mm;text-align:center;font-size:8.5pt;color:#444}
        </style></head><body>
        <div class="sheet">
          <div class="wm"><img src="{$watermark}" alt=""></div>

          <div class="top">
            <img class="qr" src="{$qr}" alt="QR">
            <div class="head">
              <img class="crest" src="{$crest}" alt="">
              <h1>Government of the People's Republic of Bangladesh</h1>
              <p>Office of the Registrar, Birth and Death Registration</p>
              <p>{$union} Union Parishad</p>
              <p>{$upazila?->name_bn}, {$district}</p>
              <p class="rule">(Rule 9, 10)</p>
            </div>
            <img class="bar" src="{$barcode}" alt="{$regNo}">
          </div>

          <h2>জন্ম নিবন্ধন সনদ / Birth Registration Certificate</h2>

          <div class="meta">
            <div>Date of Registration<br><b style="font-size:10pt">{$issued->format('d/m/Y')}</b></div>
            <div class="mid">Birth Registration Number<b>{$regNo}</b></div>
            <div style="text-align:right">Date of Issuance<br><b style="font-size:10pt">{$issued->format('d/m/Y')}</b></div>
          </div>

          <div class="dob"><span>Date of Birth &nbsp; : {$dobStr}</span><span>Sex : {$sex}</span></div>
          <div class="word">In Word &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : {$inWord}</div>

          <table>{$body}</table>

          <div class="sign">
            <div><b>Seal &amp; Signature</b>Assistant to Registrar<br>(Preparation, Verification)</div>
            <div><b>Seal &amp; Signature</b>Registrar</div>
          </div>

          <div class="foot">{$footer}</div>
        </div></body></html>
        HTML;
    }

    /** Where a holder can check this certificate — the upazila's own public tracking page. */
    private function verifyUrl(BirthRegistration $reg): string
    {
        return 'https://'.$reg->tenant_id.'.'.config('tenancy.base_domain').'/track';
    }

    /** "Twenty Eighth of March Nineteen Ninety Six", as the official form spells the date out. */
    private function dateInWords(\Carbon\CarbonInterface $d): string
    {
        $ordinals = [1 => 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth',
            'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth',
            'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty First', 'Twenty Second',
            'Twenty Third', 'Twenty Fourth', 'Twenty Fifth', 'Twenty Sixth', 'Twenty Seventh',
            'Twenty Eighth', 'Twenty Ninth', 'Thirtieth', 'Thirty First'];

        $year = (int) $d->format('Y');
        $formatter = new \NumberFormatter('en', \NumberFormatter::SPELLOUT);
        // 1996 reads "Nineteen Ninety Six", not "One Thousand Nine Hundred…", so spell it in pairs.
        $words = $year >= 1000 && $year < 10000 && $year % 100 !== 0
            ? $formatter->format(intdiv($year, 100)).' '.$formatter->format($year % 100)
            : $formatter->format($year);

        // Title-case the spelled-out year and drop its hyphens ("Twenty-six" → "Twenty Six"),
        // leaving "of" lowercase as the official form prints it.
        $words = ucwords(str_replace('-', ' ', $words));

        return $ordinals[(int) $d->format('j')].' of '.$d->format('F').' '.$words;
    }
}
