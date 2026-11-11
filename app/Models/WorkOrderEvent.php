<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Uma linha do histórico da OS (ver migration create_work_order_events_table).
 * Só cresce: nada aqui é editado depois de gravado.
 */
class WorkOrderEvent extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'work_order_id', 'user_id', 'user_name', 'user_role', 'action', 'from_value', 'to_value', 'note',
    ];

    protected $casts = ['created_at' => 'datetime'];

    /** Registra um evento em nome de quem está logado. */
    public static function registrar(WorkOrder $os, string $acao, array $dados = [], ?User $quem = null): self
    {
        $quem ??= auth()->user();
        $quem?->loadMissing('role');

        return static::create([
            'work_order_id' => $os->id,
            'user_id'    => $quem?->id,
            'user_name'  => $quem ? ($quem->nickname ?: $quem->username) : null,
            'user_role'  => $quem?->role?->name,
            'action'     => $acao,
            'from_value' => $dados['de'] ?? null,
            'to_value'   => $dados['para'] ?? null,
            'note'       => isset($dados['nota']) && trim((string) $dados['nota']) !== '' ? trim($dados['nota']) : null,
        ]);
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
