<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Central key/value settings an admin can change from the UI — currently the SMS credentials.
 * Values are encrypted at rest, because an API key is a credential wherever it is kept.
 *
 * Reads are cached for the request: config resolution hits this on every SMS send.
 */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['value' => 'encrypted'];
    }

    /** The stored value, or the config default when an admin has never set one. */
    public static function get(string $key, ?string $fallback = null): ?string
    {
        static $cache = [];

        if (! array_key_exists($key, $cache)) {
            // The table may not exist yet during the very first migrate.
            $cache[$key] = rescue(fn () => static::find($key)?->value, null, false);
        }

        return $cache[$key] ?: $fallback;
    }

    public static function put(string $key, ?string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
