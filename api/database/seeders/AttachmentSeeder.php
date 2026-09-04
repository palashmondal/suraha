<?php

namespace Database\Seeders;

use App\Models\Assistance;
use App\Models\Attachment;
use App\Models\Complaint;
use App\Models\Suggestion;
use App\Models\Upazila;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Dummy সংযুক্তি for the dev seed: a couple of photos and a PDF on some of the citizen
 * submissions, so the detail pages have a real gallery to render (thumbnails, the lightbox and
 * its image navigation) without anyone uploading files by hand.
 *
 * The files are generated here rather than committed as fixtures — a repo does not need to carry
 * placeholder JPEGs.
 */
class AttachmentSeeder extends Seeder
{
    /** Label + background colour for each generated photo. */
    private const PHOTOS = [
        ['Ghatanasthal 1', [86, 108, 158]],
        ['Ghatanasthal 2', [148, 106, 92]],
        ['Kagojpotro', [92, 138, 110]],
    ];

    public function run(): void
    {
        foreach (Upazila::all() as $upazila) {
            tenancy()->initialize($upazila);

            // Two of each kind — enough that the gallery shows multiple images (so the lightbox
            // arrows have somewhere to go) on some records and nothing on others.
            foreach (Complaint::query()->take(2)->get() as $i => $complaint) {
                $this->attachPhotos($complaint, $i === 0 ? 3 : 1);
                $this->attachPdf($complaint, 'অভিযোগের-সংযুক্তি.pdf', 'Complaint attachment');
            }

            foreach (Assistance::query()->take(2)->get() as $i => $assistance) {
                $this->attachPhotos($assistance, $i === 0 ? 2 : 1);
                if ($i === 0) {
                    $this->attachPdf($assistance, 'চিকিৎসা-কাগজপত্র.pdf', 'Medical papers');
                }
            }

            foreach (Suggestion::query()->take(1)->get() as $suggestion) {
                $this->attachPhotos($suggestion, 2);
            }

            tenancy()->end();
        }
    }

    private function attachPhotos(object $record, int $count): void
    {
        foreach (array_slice(self::PHOTOS, 0, $count) as [$label, $rgb]) {
            $this->store($record, $this->jpeg($label, $rgb), 'jpg', $label.'.jpg', 'image/jpeg', 'image');
        }
    }

    private function attachPdf(object $record, string $name, string $heading): void
    {
        $this->store($record, $this->pdf($heading), 'pdf', $name, 'application/pdf', 'pdf');
    }

    private function store(object $record, string $bytes, string $ext, string $name, string $mime, string $kind): void
    {
        $path = $record->getTable().'/'.$record->getKey().'/'.uniqid().'.'.$ext;
        Storage::disk('public')->put($path, $bytes);

        $attachment = $record->attachments()->make([
            'path' => $path,
            'original_name' => $name,
            'mime' => $mime,
            'kind' => $kind,
        ]);
        $attachment->tenant_id = $record->tenant_id;
        $attachment->save();
    }

    /** A plain 900×600 placeholder photo — GD has no Bangla font, so the label is transliterated. */
    private function jpeg(string $label, array $rgb): string
    {
        $img = imagecreatetruecolor(900, 600);
        imagefilledrectangle($img, 0, 0, 900, 600, imagecolorallocate($img, ...$rgb));
        imagefilledrectangle($img, 40, 40, 860, 560, imagecolorallocate($img, (int) ($rgb[0] * 0.8), (int) ($rgb[1] * 0.8), (int) ($rgb[2] * 0.8)));
        imagestring($img, 5, 60, 70, $label, imagecolorallocate($img, 255, 255, 255));

        ob_start();
        imagejpeg($img, null, 80);
        imagedestroy($img);

        return (string) ob_get_clean();
    }

    /** A minimal one-page PDF, written out directly — no library for three lines of text. */
    private function pdf(string $heading): string
    {
        $text = "BT /F1 24 Tf 60 700 Td ({$heading}) Tj ET";
        $objects = [
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
            "<< /Length ".strlen($text)." >>\nstream\n{$text}\nendstream",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n{$object}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= "trailer\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";

        return $pdf;
    }
}
