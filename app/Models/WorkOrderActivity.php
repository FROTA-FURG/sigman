<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WorkOrderActivity extends Model
{
    use HasUuids;

    protected $table = 'work_order_activity'; 

    protected $fillable = [
        'responsible_user_id',
        'responsible_name',
        'work_order_id',
        'started_at',
        'completed_at',
        'description',
    ];

    protected static function booted(): void
    {
        static::creating(fn (self $a) => $a->created_by = auth()->id());
        static::saving(fn (self $a) => $a->updated_by = auth()->id());

        // Lançar/editar/excluir uma atividade conta como atualização da OS
        // ("Última atualização" da OS). Não é $touches de propósito: aquele
        // faz um UPDATE direto, sem passar pelo evento que grava updated_by.
        static::saved(fn (self $a) => $a->workOrder?->touch());
        static::deleted(fn (self $a) => $a->workOrder?->touch());
    }

    protected $casts = [
        'started_at'   => 'datetime', 
        'completed_at' => 'datetime',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class, 'work_order_id');
    }

    public function responsibleUser()
    {
        // withTrashed: usuário desativado (soft delete) continua aparecendo
        // como quem executou, em vez de "Não informado".
        return $this->belongsTo(User::class, 'responsible_user_id')->withTrashed();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Quem alterou por último ("updater" para não colidir com a coluna updated_by). */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by')->withTrashed();
    }
}
