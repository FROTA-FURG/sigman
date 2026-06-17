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
        return User::create([
            'username'        => $data['username'],
            'nickname'        => $data['nickname'] ?? null,
            'email'           => $data['email'],
            'cpf'             => $data['cpf'],
            'phone'           => $data['phone'] ?? null,
            'password'        => Hash::make($data['password']),
            'vessel_id'       => $data['vessel_id'] ?? 'null',
            'role_id'         => $data['role_id'],
            'status'          => $data['status'] ?? 'Active',
            'last_updated_by' => $data['last_updated_by'] ?? 'Sistema',
        ]);
    }

    public function updateUser(string $id, array $data)
    {
        $user = User::findOrFail($id);
        $user->update($data);
        return $user;
    }
}