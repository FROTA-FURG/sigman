<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Concerns\HasUuids; 
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids; 

    use SoftDeletes;
    
    protected $fillable = [
        'username',
        'nickname',
        'email',
        'cpf',
        'phone',           
        'password',
        'role_id',
        'vessel_id',
        'status',        
        'last_updated_by'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }
}