<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Parte do casco de uma embarcação (bombordo, boreste, convés...). O quadro
 * de coordenadas (frame_*) nasce com a 1ª imagem enviada; contornos das
 * chapas e posição das imagens usam esse quadro.
 */
class HullRegion extends Model
{
    use HasUuids;

    protected $fillable = [
        'vessel_id', 'code', 'name', 'plate_count', 'sort_order',
        'frame_width', 'frame_height', 'current_image_id', 'image_updated_by', 'image_updated_at',
    ];

    protected $casts = [
        'plate_count' => 'integer',
        'sort_order' => 'integer',
        'frame_width' => 'float',
        'frame_height' => 'float',
        'image_updated_at' => 'datetime',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function plates()
    {
        return $this->hasMany(HullPlate::class)->orderBy('number');
    }

    public function images()
    {
        return $this->hasMany(HullRegionImage::class)->orderByDesc('uploaded_at');
    }

    public function currentImage()
    {
        return $this->belongsTo(HullRegionImage::class, 'current_image_id');
    }

    public function imageUpdater()
    {
        return $this->belongsTo(User::class, 'image_updated_by');
    }
}
