<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Cria o perfil "terceiro" (empresa terceirizada) de forma idempotente,
     * sem precisar re-rodar o DatabaseSeeder (que recriaria o usuário dev).
     */
    public function up(): void
    {
        Role::firstOrCreate(['name' => 'terceiro']);
    }

    public function down(): void
    {
        Role::where('name', 'terceiro')->delete();
    }
};
