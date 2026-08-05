<?php

declare(strict_types=1);

namespace App\Services\Bdris;

use App\Enums\BirthRegStatus;
use App\Models\BirthRegistration;
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

    private function certificateHtml(BirthRegistration $reg): string
    {
        $rows = [
            'জন্ম নিবন্ধন নাম্বার' => $reg->registration_no,
            'সন্তানের নাম' => $reg->child_name ?? '—',
            'মায়ের নাম' => $reg->mother_name,
            'পিতার নাম' => $reg->father_name ?? '—',
            'জন্ম তারিখ' => optional($reg->date_of_birth)->format('d-m-Y') ?? '—',
            'লিঙ্গ' => $reg->sex === 'female' ? 'মেয়ে' : ($reg->sex === 'male' ? 'ছেলে' : '—'),
        ];

        $cells = '';
        foreach ($rows as $label => $value) {
            $cells .= '<tr><td class="l">'.e($label).'</td><td class="v">'.e((string) $value).'</td></tr>';
        }

        return <<<HTML
        <!doctype html><html lang="bn"><head><meta charset="utf-8">
        <title>জন্ম সনদ - {$reg->registration_no}</title>
        <style>
          body{font-family:'Noto Sans Bengali',system-ui,sans-serif;padding:48px;color:#1D1B20}
          .card{max-width:640px;margin:0 auto;border:2px solid #6750A4;border-radius:16px;padding:40px}
          h1{color:#6750A4;text-align:center;margin:0 0 4px}
          .sub{text-align:center;color:#49454F;margin-bottom:28px}
          table{width:100%;border-collapse:collapse}
          td{padding:10px 8px;border-bottom:1px solid #E7E2EB}
          .l{color:#49454F;width:45%}.v{font-weight:600}
        </style></head><body>
        <div class="card">
          <h1>জন্ম সনদ</h1>
          <div class="sub">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · সুরাহা</div>
          <table>{$cells}</table>
        </div></body></html>
        HTML;
    }
}
