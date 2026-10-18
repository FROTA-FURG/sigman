<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Chapa do casco: espessura de projeto (E.P.) e o contorno desenhado no quadro da região. */
class HullPlate extends Model
{
    use HasUuids;

    protected $fillable = [
        'hull_region_id', 'number', 'plate_type', 'design_thickness_mm', 'area_m2',
        'contour', 'contour_updated_by', 'contour_updated_at', 'source_ref', 'notes',
    ];

    protected $casts = [
        'number' => 'integer',
        'design_thickness_mm' => 'float',
        'area_m2' => 'float',
        'contour' => 'array',
        'contour_updated_at' => 'datetime',
    ];

    public function region()
    {
        return $this->belongsTo(HullRegion::class, 'hull_region_id');
    }

    public function readings()
    {
        return $this->hasMany(ThicknessReading::class);
    }

    public function replacements()
    {
        return $this->hasMany(HullPlateReplacement::class)->orderBy('replaced_at');
    }

    public function contourUpdater()
    {
        return $this->belongsTo(User::class, 'contour_updated_by');
    }
}
