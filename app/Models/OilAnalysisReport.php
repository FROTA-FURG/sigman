<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Laudo em PDF submetido em lote ("Submeter Laudos"). Fica guardado como
 * aguardando_leitura até a leitura automática dos laudos existir; aí vira
 * uma OilSample e passa a processado.
 */
class OilAnalysisReport extends Model
{
    use HasUuids;

    protected $fillable = [
        'vessel_id',
        'oil_sample_id',
        'path',
        'original_name',
        'size',
        'status',
        'uploaded_by',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
