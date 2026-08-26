<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Vínculo entre uma OS e uma Janela de Execução. Nunca é apagado quando a
 * OS sai da janela -- só marcado com removed_at/removed_by -- pra manter o
 * histórico de quais janelas cada OS já passou (mesmo as removidas).
 */
class ExecutionWindowWorkOrder extends Model
{
    protected $table = 'execution_window_work_order';

    protected $fillable = [
        'execution_window_id',
        'work_order_id',
        'added_by',
        'added_at',
        'removed_by',
        'removed_at',
    ];

    protected $casts = [
        'added_at' => 'datetime',
        'removed_at' => 'datetime',
    ];

    public function executionWindow()
    {
        return $this->belongsTo(ExecutionWindow::class);
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function addedByUser()
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public function removedByUser()
    {
        return $this->belongsTo(User::class, 'removed_by');
    }
}
