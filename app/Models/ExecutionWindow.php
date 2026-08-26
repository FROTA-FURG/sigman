<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

/**
 * "Janela de Execução": um lote de OS agrupado numa janela de datas
 * escolhida conforme a disponibilidade da embarcação. Não é o mesmo que o
 * Plano de 52 Semanas (isso é o cronograma anual por equipamento) nem a
 * aba Planejamento (isso é a fila de disparo) -- aqui é "o que a equipe
 * comprometeu executar entre a data X e a data Y".
 */
class ExecutionWindow extends Model
{
    use HasUuids;

    protected $fillable = [
        'vessel_id',
        'start_date',
        'end_date',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** Todos os vínculos com OS desta janela, incluindo os já removidos (histórico). */
    public function memberships()
    {
        return $this->hasMany(ExecutionWindowWorkOrder::class);
    }

    /** Só os vínculos ainda ativos (a OS realmente está na janela hoje). */
    public function activeMemberships()
    {
        return $this->memberships()->whereNull('removed_at');
    }
}
