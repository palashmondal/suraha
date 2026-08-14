<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * A file attached to an investigation report event — the report PDF (kind=pdf) or a photo
 * (kind=image). Stored on the public disk; `url` mirrors the avatar pattern in UserResource.
 */
class ComplaintAttachment extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id', 'tenant_id'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(ComplaintEvent::class, 'complaint_event_id');
    }

    public function url(): string
    {
        // Relative (same-origin) so the browser loads it from the current host over the same
        // scheme — avoids mixed-content/host/port issues behind the reverse proxy. /storage is
        // routed to Laravel (see infra/Caddyfile*).
        return '/storage/'.$this->path;
    }
}
