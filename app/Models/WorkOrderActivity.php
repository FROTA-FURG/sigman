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
        'work_order_id',
        'started_at',
        'completed_at',
        'description',
    ];

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
        return $this->belongsTo(User::class, 'responsible_user_id');
    }
}