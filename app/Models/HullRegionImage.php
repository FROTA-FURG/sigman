<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Imagem (desenho) de uma região. O histórico nunca é apagado: replaced_at marca a saída de uso. */
class HullRegionImage extends Model
{
    use HasUuids;

    protected $fillable = [
        'hull_region_id', 'path', 'original_name', 'size', 'width_px', 'height_px',
        'x', 'y', 'width', 'height', 'scale',
        'uploaded_by', 'uploaded_at', 'positioned_by', 'positioned_at', 'replaced_at', 'removed_by',
    ];

    protected $casts = [
        'size' => 'integer',
        'width_px' => 'integer',
        'height_px' => 'integer',
        'x' => 'float',
        'y' => 'float',
        'width' => 'float',
        'height' => 'float',
        'scale' => 'float',
        'uploaded_at' => 'datetime',
        'positioned_at' => 'datetime',
        'replaced_at' => 'datetime',
    ];

    public function region()
    {
        return $this->belongsTo(HullRegion::class, 'hull_region_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function positioner()
    {
        return $this->belongsTo(User::class, 'positioned_by');
    }

    public function remover()
    {
        return $this->belongsTo(User::class, 'removed_by');
    }
}
