<?php

declare(strict_types=1);

namespace App\Services\Bdris;

use App\Models\BirthRegistration;

/**
 * Swappable BDRIS gateway (SURAHA_BUILD_PROMPT §1.1(1), §10). On delivery approval a birth
 * registration is submitted here; the real adapter calls the official BDRIS API (auth, retries,
 * idempotency) while MockBdrisGateway stands in during development until SEAL is granted access.
 * The endpoint/credentials are configuration (config/bdris.php), so a self-hosted upazila can
 * supply its own.
 */
interface BdrisGateway
{
    public function submit(BirthRegistration $registration): BdrisResult;
}
