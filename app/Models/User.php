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
        'has_fleet_access', // responde por toda a frota, não por uma embarcação só
        'third_party_id',
        'status',
        'last_updated_by'
    ];

    // last_seen_at só aparece pra gestão (UserController::index faz o makeVisible).
    protected $hidden = [
        'password',
        'remember_token',
        'last_seen_at',
        'last_logout_at',
    ];

    protected $casts = [
        'has_fleet_access' => 'boolean',
        'last_seen_at' => 'datetime',
        'last_logout_at' => 'datetime',
    ];

    /** Minutos sem requisição até deixar de contar como "online". */
    public const ONLINE_MINUTOS = 5;

    /**
     * Online = teve requisição nos últimos minutos e não saiu depois disso.
     * Calculado no servidor pra não depender do relógio de quem olha.
     */
    public function estaOnline(): bool
    {
        if (! $this->last_seen_at || $this->last_seen_at->lt(now()->subMinutes(self::ONLINE_MINUTOS))) {
            return false;
        }

        return ! $this->last_logout_at || $this->last_logout_at->lt($this->last_seen_at);
    }

    /**
     * Cargos que podem responder por toda a frota. Estagiário e marinheiro
     * são tripulação de um navio específico; terceiro é empresa externa e
     * não é vinculado a embarcação nenhuma.
     */
    public const FLEET_CAPABLE_ROLES = ['dev', 'coordinator', 'engineer', 'technician'];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    /** Este usuário enxerga/responde pela embarcação informada? */
    public function coversVessel(?string $vesselId): bool
    {
        if ($this->has_fleet_access) {
            return true;
        }

        return $vesselId !== null && $this->vessel_id === $vesselId;
    }

    // Empresa terceirizada à qual este login pertence (só para role=terceiro)
    public function thirdParty()
    {
        return $this->belongsTo(ThirdParty::class);
    }
}