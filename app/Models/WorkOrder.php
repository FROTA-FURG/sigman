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
        'estimated_hours',
        'completed_at',
        'created_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
        'created_at'   => 'datetime',
    ];
    
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
}
