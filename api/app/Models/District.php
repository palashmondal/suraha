<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class District extends Model
{
    protected $fillable = ['name', 'name_en', 'code'];

    /** @return HasMany<Upazila, $this> */
    public function upazilas(): HasMany
    {
        return $this->hasMany(Upazila::class);
    }
}
