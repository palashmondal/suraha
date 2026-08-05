<?php

declare(strict_types=1);

namespace App\Services\Bdris;

use App\Models\BirthRegistration;

/**
 * Development BDRIS gateway: returns a plausible 17-digit registration number without calling a
 * real service, so the pregnancy → approval → certificate chain is fully testable. Idempotent —
 * re-submitting a record that already has a number returns the same one.
 */
class MockBdrisGateway implements BdrisGateway
{
    public function submit(BirthRegistration $registration): BdrisResult
    {
        if ($registration->registration_no) {
            return new BdrisResult($registration->registration_no, $registration->bdris_reference ?? 'MOCK');
        }

        // BDRIS numbers are 17 digits; prefix with the birth year for realism.
        $year = optional($registration->date_of_birth)->format('Y') ?? now()->format('Y');
        $registrationNo = $year.str_pad((string) random_int(0, 9999999999999), 13, '0', STR_PAD_LEFT);

        return new BdrisResult($registrationNo, 'MOCK-'.strtoupper(bin2hex(random_bytes(4))));
    }
}
