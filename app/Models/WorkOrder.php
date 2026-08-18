<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WorkOrder extends Model
{
    use HasUuids;

    protected $table = 'work_orders';
            
    protected $fillable = [
        'os_number',
        'equipment_id',
        'ss_number',
        'tag_number',      
        'series_number_id',
        'description', 
        'model',
        'manufacturer',
        'maintenance_type',
        'priority',
        'periodicity',
        'in_52_week_plan', // OS faz parte do Plano de 52 Semanas (cronograma anual), não é avulsa
        'status',
        'vendor_name',
        'third_party_id',
        'estimated_hours',
        'intern_status',   // Status da OS (Aprovado estagiário e encaminhado para o engenheiro)
        'intern_reason',   // Razão pelo atraso da OS (se aplicável)
        'intern_name',     // Nome do estagiário responsável por aprovar a OS
        'engineer_comment',    // Observação do engenheiro no planejamento (antes do disparo)
        'engineer_comment_by',
        'engineer_comment_at',
        'is_inactive',          // Ocorrência não vai acontecer na data marcada; foi reprogramada
        'inactivated_at',
        'inactivated_by',
        'inactivation_reason',
        'rescheduled_from_id',  // Nesta OS: aponta pra OS antiga que ela substituiu
        'completed_at',
        'dispatched_at',   // Quando a OS foi disparada e os responsáveis avisados por e-mail
        'approved_by',     // Engenheiro que deu a validação final na OS
        'approved_at',     // Quando essa validação aconteceu
        'created_at',
    ];

    protected $casts = [
        'in_52_week_plan' => 'boolean',
        'engineer_comment_at' => 'datetime',
        'is_inactive'      => 'boolean',
        'inactivated_at'   => 'datetime',
        'completed_at'  => 'datetime',
        'dispatched_at' => 'datetime',
        'approved_at'   => 'datetime',
        'created_at'    => 'datetime',
    ];

    // Nome "approver" (e não "approvedBy") para o relacionamento não colidir
    // com a coluna approved_by na serialização para o front.
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
    
    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function activities()
    {
        return $this->hasMany(WorkOrderActivity::class, 'work_order_id');
    }

    public function vessel()
    {
        return $this->hasOneThrough(Vessel::class, Equipment::class);
    }

    // Relação: Esta OS pertence a uma SS
    public function serviceRequest()
    {
        return $this->belongsTo(ServiceRequest::class, 'ss_number');
    }

    // Empresa terceirizada responsável pela OS (nulo = OS interna)
    public function thirdParty()
    {
        return $this->belongsTo(ThirdParty::class);
    }

    public function inactivatedByUser()
    {
        return $this->belongsTo(User::class, 'inactivated_by');
    }

    /** A OS antiga que esta substituiu (quando esta nasceu de uma inativação). */
    public function rescheduledFrom()
    {
        return $this->belongsTo(WorkOrder::class, 'rescheduled_from_id');
    }

    /** A OS nova que substituiu esta (quando esta foi inativada e reprogramada). */
    public function rescheduledTo()
    {
        return $this->hasOne(WorkOrder::class, 'rescheduled_from_id');
    }
}
