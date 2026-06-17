<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ServiceRequest extends Model
{
    use HasUuids;

    protected $table = 'service_requests';
            
    protected $fillable = [
        'ss_number',
        'vessel_id',       
        'equipment_id',
        'tag_number',
        'requester_name',   
        'description',     
        'desired_date',     
        'maintenance_type',
        'priority',
        'status',
        'budget',
        'vendor_cnpj',
        'vendor_name',
        'completed_at'
    ];

    protected $casts = [
        'desired_date' => 'date',
        'completed_at' => 'datetime',
    ];
    
    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }
    
    public function vessel()
    {
        return $this->belongsTo(Vessel::class, 'vessel_id'); 
    }

    public function responsibleUser()
    {
        return $this->belongsTo(User::class, 'responsible_user_id');
    }

    // Relação: Uma SS pode gerar 1 OS
    public function workOrder()
    {
        return $this->hasOne(WorkOrder::class, 'ss_number');
    }
}