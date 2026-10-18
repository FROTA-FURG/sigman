<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Campanha de medição por ultrassom de uma embarcação. */
class ThicknessCampaign extends Model
{
    use HasUuids;

    protected $fillable = [
        'vessel_id', 'measured_at', 'dry_docking_id', 'third_party_id',
        'inspector_name', 'inspector_qualification', 'instrument', 'instrument_calibrated_at',
        'report_path', 'report_original_name', 'source', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'measured_at' => 'date',
        'instrument_calibrated_at' => 'date',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function readings()
    {
        return $this->hasMany(ThicknessReading::class);
    }

    public function dryDocking()
    {
        return $this->belongsTo(DryDocking::class);
    }
}
