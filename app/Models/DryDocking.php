<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DryDocking extends Model
{
    use HasFactory, HasUuids; // Necessário para gerar o UUID automático no ID

    // Define quais campos podem ser preenchidos na hora de salvar
    protected $fillable = [
        'vessel_id',
        'shipyard',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'budget',
        'actual_cost',
        'status',
        'notes',
    ];

    // Opcional: Garante que o Laravel converta as datas e moedas automaticamente
    protected $casts = [
        'planned_start_date' => 'date',
        'planned_end_date'   => 'date',
        'actual_start_date'  => 'date',
        'actual_end_date'    => 'date',
        'budget'             => 'decimal:2',
        'actual_cost'        => 'decimal:2',
    ];

    /**
     * Relacionamento: Uma Docagem pertence a uma Embarcação
     */
    public function vessel()
    {
        return $this->belongsTo(Vessel::class, 'vessel_id');
    }
}