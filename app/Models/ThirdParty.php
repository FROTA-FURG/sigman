<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class ThirdParty extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'third_parties';

    protected $fillable = [
        'razao_social',
        'cnpj',
        'contact_name',
        'email',
        'phone',
        'status',
    ];

    // Logins de acesso da empresa (users com role=terceiro)
    public function users()
    {
        return $this->hasMany(User::class);
    }

    // Ordens de serviço atribuídas a esta empresa
    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class);
    }
}
