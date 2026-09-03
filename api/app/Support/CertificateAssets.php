<?php

declare(strict_types=1);

namespace App\Support;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\Writer\SvgWriter;
use Picqer\Barcode\Types\TypeCode128;
use Picqer\Barcode\Renderers\SvgRenderer;

/**
 * The QR and barcode on a birth certificate.
 *
 * Both are generated for real rather than drawn: a decorative QR that scans to nothing is worse
 * than none on a document whose whole purpose is to be verifiable. They are returned as data URIs
 * so the certificate stays a single self-contained file with no external requests.
 */
class CertificateAssets
{
    public static function qr(string $content): string
    {
        $svg = (new Builder(
            writer: new SvgWriter(),
            data: $content,
            encoding: new Encoding('UTF-8'),
            size: 220,
            margin: 0,
        ))->build()->getString();

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    /**
     * A seal from resources/certificate, inlined as a data URI. Returns null when the file is
     * absent so the certificate can fall back rather than render a broken image.
     */
    public static function seal(string $file): ?string
    {
        $path = resource_path('certificate/'.$file);

        if (! is_file($path)) {
            return null;
        }

        $mime = str_ends_with($file, '.svg') ? 'image/svg+xml' : 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path));
    }

    public static function barcode(string $content): string
    {
        $barcode = (new TypeCode128())->getBarcode($content);
        $svg = (new SvgRenderer())->render($barcode, 420, 60);

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
}
