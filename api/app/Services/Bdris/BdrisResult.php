<?php

declare(strict_types=1);

namespace App\Services\Bdris;

/**
 * Outcome of a BDRIS birth-registration submission.
 */
final readonly class BdrisResult
{
    public function __construct(
        public string $registrationNo,
        public string $reference,
    ) {}
}
