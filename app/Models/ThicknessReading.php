<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Leitura de um ponto de uma chapa numa campanha. */
class ThicknessReading extends Model
{
    public $timestamps = false;

    protected $fillable = ['thickness_campaign_id', 'hull_plate_id', 'point_number', 'thickness_mm'];

    protected $casts = [
        'point_number' => 'integer',
        'thickness_mm' => 'float',
    ];

    public function campaign()
    {
        return $this->belongsTo(ThicknessCampaign::class, 'thickness_campaign_id');
    }

    public function plate()
    {
        return $this->belongsTo(HullPlate::class, 'hull_plate_id');
    }
}
