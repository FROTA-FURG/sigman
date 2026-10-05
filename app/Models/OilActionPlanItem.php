<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Item do Plano de Ação da Análise de Óleo. O plano vigente e o histórico
 * vivem na mesma tabela: `status` vigente/arquivado. Gerar um item novo para
 * o ponto arquiva o anterior (o que a planilha fazia copiando a linha para as
 * abas "ARMAZ.").
 */
class OilActionPlanItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'vessel_id',
        'oil_sampling_point_id',
        'oil_sample_id',
        'equipment_name',
        'sheet_tag',
        'frequency_months',
        'frequency_hours',
        'collected_at',
        'next_collection_at',
        'hour_meter',
        'next_hour_meter',
        'condition',
        'action',
        'notes',
        'responsible',
        'deadline',
        'lab_opinion',
        'status',
        'archived_at',
        'source',
        'created_by',
    ];

    protected $casts = [
        'collected_at' => 'date',
        'next_collection_at' => 'date',
        'deadline' => 'date',
        'archived_at' => 'datetime',
        'frequency_months' => 'float',
        'frequency_hours' => 'float',
        'hour_meter' => 'float',
        'next_hour_meter' => 'float',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function point()
    {
        return $this->belongsTo(OilSamplingPoint::class, 'oil_sampling_point_id');
    }

    public function sample()
    {
        return $this->belongsTo(OilSample::class, 'oil_sample_id');
    }
}
