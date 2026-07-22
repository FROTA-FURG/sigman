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
        'status',
        'vendor_name',
        'third_party_id',
        'estimated_hours',
        'intern_status',   // Status da OS (Aprovado estagiário e encaminhado para o engenheiro)
        'intern_reason',   // Razão pelo atraso da OS (se aplicável)
        'intern_name',     // Nome do estagiário responsável por aprovar a OS
        'completed_at',
        'dispatched_at',   // Quando a OS foi disparada e os responsáveis avisados por e-mail
        'approved_by',     // Engenheiro que deu a validação final na OS
        'approved_at',     // Quando essa validação aconteceu
        'created_at',
    ];

    protected $casts = [
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
}
