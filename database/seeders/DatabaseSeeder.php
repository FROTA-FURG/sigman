<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $roles = ['dev', 'coordinator', 'engineer', 'technician', 'intern', 'seaman'];

        foreach ($roles as $roleName){
            Role::firstOrCreate(['name' => $roleName]);
        }
        

        $devRole = Role::where('name','dev')->first();

        User::factory()->create([
            'username' => 'Ryan de Leon',
            'nickname' => 'Ryan',
            'role_id' => $devRole->id,
            'cpf' => '111.111.222-99',
            'email' => 'ryan@gmail.com',
            'password' => Hash::make('senha123'),
        ]);
    }
}
