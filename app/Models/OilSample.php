<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Uma coleta de óleo e o resultado do laudo. `results` guarda os valores por
 * parâmetro (as chaves vêm do catálogo da família, config/oil_analysis.php).
 *
 * `condition` é a condição oficial (a do laudo, ou a calculada pelos limites
 * quando o lançamento é manual). `lab_opinion` é o parecer do laboratório --
 * costuma ser genérico -- e `team_action` a ação específica da equipe.
 */
class OilSample extends Model
{
    use HasUuids;

    protected $fillable = [
        'oil_sampling_point_id',
        'sample_number',
        'laboratory',
        'product',
        'nominal_viscosity',
        'volume',
        'service_hours',
        'top_up',
        'oil_changed',
        'collected_at',
        'report_number',
        'results',
        'condition',
        'lab_opinion',
        'team_action',
        'source',
        'report_path',
        'report_original_name',
        'created_by',
    ];

    protected $casts = [
        'results' => 'array',
        'oil_changed' => 'boolean',
        'collected_at' => 'date',
        'nominal_viscosity' => 'float',
        'volume' => 'float',
        'service_hours' => 'float',
        'top_up' => 'float',
    ];

    public function point()
    {
        return $this->belongsTo(OilSamplingPoint::class, 'oil_sampling_point_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
