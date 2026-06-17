<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Vessel extends Model
{
    use HasUuids; 

    protected $fillable = [
        'code',
        'name',
        'class',
        'location',
        'tag',
        'type',
        'status',             // Operacional, Com Problema, Manutenção
        'navigation_status',  // Atracada, Navegando, Ancorada
        'health_score',   
        'active_wos',
        'pending_srs',
        'last_inspection',
        'model_path',
        'dimensions',
        'builder',
        'year',
        'crew_capacity',
        
    ];

    protected $casts = [
        'dimensions' => 'array', 
        'last_inspection' => 'date',
    ];

    public function equipments()
    {
        return $this->hasMany(Equipment::class);
    }
    
    public function users()
    {
        return $this->hasMany(User::class);
    }
}