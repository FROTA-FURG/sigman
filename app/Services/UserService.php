<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function getAllUsers()
    {
        return User::with('role', 'vessel')->get();
    }

    public function getUserById(string $id) 
    {
        return User::with('role')->findOrFail($id);
    }

    public function createUser(array $data)
    {
        $data = $this->normalizeVesselScope($data);

        return User::create([
            'username'         => $data['username'],
            'nickname'         => $data['nickname'] ?? null,
            'email'            => $data['email'],
            'cpf'              => $data['cpf'],
            'phone'            => $data['phone'] ?? null,
            'password'         => Hash::make($data['password']),
            'vessel_id'        => $data['vessel_id'],
            'has_fleet_access' => $data['has_fleet_access'],
            'role_id'          => $data['role_id'],
            'status'           => $data['status'] ?? 'Active',
            'last_updated_by'  => $data['last_updated_by'] ?? 'Sistema',
        ]);
    }

    public function updateUser(string $id, array $data)
    {
        $user = User::findOrFail($id);
        $user->update($this->normalizeVesselScope($data));
        return $user;
    }

    /**
     * Deixa o vínculo com embarcação em um dos três estados válidos, sem
     * combinação contraditória:
     *
     *   toda a frota  -> has_fleet_access = true  e vessel_id = null
     *   uma embarcação-> has_fleet_access = false e vessel_id = <uuid>
     *   nenhuma       -> has_fleet_access = false e vessel_id = null
     *
     * O formulário manda vessel_id = '' para "nenhuma"; string vazia iria
     * para o banco como texto numa coluna uuid, então vira null aqui.
     */
    private function normalizeVesselScope(array $data): array
    {
        if (! array_key_exists('vessel_id', $data) && ! array_key_exists('has_fleet_access', $data)) {
            return $data; // atualização parcial que nem toca no vínculo
        }

        $data['has_fleet_access'] = filter_var($data['has_fleet_access'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $vesselId = $data['vessel_id'] ?? null;
        $data['vessel_id'] = $data['has_fleet_access'] || $vesselId === '' ? null : $vesselId;

        return $data;
    }
}