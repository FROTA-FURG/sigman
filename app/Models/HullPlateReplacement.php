<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Troca de chapa: a tendência de corrosão recomeça a partir daqui. */
class HullPlateReplacement extends Model
{
    use HasUuids;

    protected $fillable = ['hull_plate_id', 'replaced_at', 'dry_docking_id', 'new_thickness_mm', 'notes', 'created_by'];

    protected $casts = [
        'replaced_at' => 'date',
        'new_thickness_mm' => 'float',
    ];

    public function plate()
    {
        return $this->belongsTo(HullPlate::class, 'hull_plate_id');
    }
}
