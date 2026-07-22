<?php

namespace App\Services;

use App\Models\Role;
use App\Models\ThirdParty;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ThirdPartyService
{
    public function getAllThirdParties()
    {
        return ThirdParty::with('users')->orderBy('razao_social')->get();
    }

    /**
     * Cria a empresa terceirizada E o seu login de acesso, numa transação só.
     * O login nasce com role=terceiro e vinculado à empresa (third_party_id),
     * sem vessel_id — o terceiro não é tripulante de uma embarcação.
     */
    public function createThirdParty(array $data): ThirdParty
    {
        return DB::transaction(function () use ($data) {
            $thirdParty = ThirdParty::create([
                'razao_social' => $data['razao_social'],
                'cnpj'         => $data['cnpj'],
                'contact_name' => $data['contact_name'] ?? null,
                'email'        => $data['email'],
                'phone'        => $data['phone'] ?? null,
                'status'       => $data['status'] ?? 'Active',
            ]);

            $terceiroRole = Role::where('name', 'terceiro')->firstOrFail();

            User::create([
                'username'        => $data['razao_social'],
                'nickname'        => $data['contact_name'] ?? $data['razao_social'],
                'email'           => $data['email'],
                'cpf'             => $data['cnpj'], // reaproveita o campo de documento; CNPJ é o identificador da empresa
                'phone'           => $data['phone'] ?? null,
                'password'        => Hash::make($data['password']),
                'role_id'         => $terceiroRole->id,
                'third_party_id'  => $thirdParty->id,
                'status'          => 'Active',
                'last_updated_by' => $data['last_updated_by'] ?? 'Sistema',
            ]);

            return $thirdParty;
        });
    }

    /**
     * Atualiza a empresa e propaga os dados de contato para os logins vinculados.
     */
    public function updateThirdParty(string $id, array $data): ThirdParty
    {
        return DB::transaction(function () use ($id, $data) {
            $thirdParty = ThirdParty::findOrFail($id);
            $thirdParty->update($data);

            // Mantém o login em sincronia com os dados da empresa
            $userData = [
                'username'        => $data['razao_social'] ?? $thirdParty->razao_social,
                'nickname'        => $data['contact_name'] ?? $thirdParty->contact_name,
                'email'           => $data['email'] ?? $thirdParty->email,
                'phone'           => $data['phone'] ?? $thirdParty->phone,
                'last_updated_by' => $data['last_updated_by'] ?? 'Sistema',
            ];

            if (! empty($data['password'])) {
                $userData['password'] = Hash::make($data['password']);
            }

            $thirdParty->users()->update($userData);

            return $thirdParty;
        });
    }
}
