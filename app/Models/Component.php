<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Component extends Model
{
     use HasUuids; 

    protected $table = 'component';

    protected $fillable = [
        'equipment_id',       
        'name',
        'manufacturer',
        'model',
        'purchase_date', 
        'in_service_date',
        'criticality',    
        'status',       
        'image_url',      
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function parent()
    {
        return $this->belongsTo(Equipment::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Equipment::class, 'parent_id');
    }

    public function components()
    {
        return $this->hasMany(Component::class);
    }
}
