<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Ponto de coleta da Análise de Óleo: o equipamento monitorado (uma aba de
 * "Informações das coletas e análises" da planilha de gestão), com a família
 * e os limites de condenação. `equipment_id` liga ao cadastro do sistema --
 * é por ele que a tela gera OS e lista as manutenções do equipamento.
 */
class OilSamplingPoint extends Model
{
    use HasUuids;

    protected $fillable = [
        'vessel_id',
        'equipment_id',
        'sheet_key',
        'sheet_tag',
        'name',
        'family',
        'limits',
    ];

    protected $casts = [
        'limits' => 'array',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function samples()
    {
        return $this->hasMany(OilSample::class);
    }
}
