<?php

namespace Database\Seeders;

use App\Models\Vessel;
use Illuminate\Database\Seeder;

class VesselSeeder extends Seeder
{
    public function run(): void
    {
        $vessels = [
            [
                'name' => 'Atlântico Sul',
                'tag' => 'AS',
                'type' => 'Navio Oceanográfico',
                'status' => 'Operacional',
                'health_score' => 92,
                'active_wos' => 4,
                'pending_srs' => 2,
                'last_inspection' => '2023-07-12',
                'model_path' => '/models/CMI_SIGMAN.glb',
                'dimensions' => ['length' => '32m', 'beam' => '8m', 'draft' => '2.5m'],
                'builder' => 'INACE',
                'year' => '2010'
            ],
            [
                'name' => 'Ciências do Mar 1',
                'tag' => 'CM1',
                'type' => 'Navio de Ensino e Pesquisa',
                'status' => 'Atenção',
                'health_score' => 78,
                'active_wos' => 7,
                'pending_srs' => 5,
                'last_inspection' => '2023-08-05',
                'model_path' => '/models/CMI_SIGMAN.glb',
                'dimensions' => ['length' => '32m', 'beam' => '8m', 'draft' => '2.5m'],
                'builder' => 'INACE',
                'year' => '2017'
            ],
            [
                'name' => 'Lancha Larus',
                'tag' => 'LL',
                'type' => 'Lancha de Apoio',
                'status' => 'Manutenção',
                'health_score' => 15,
                'active_wos' => 12,
                'pending_srs' => 1,
                'last_inspection' => '2023-08-20',
                'model_path' => '/models/LARUS_3D_CAD.glb',
                'dimensions' => ['length' => '15m', 'beam' => '4m', 'draft' => '1.2m'],
                'builder' => 'Estaleiro Local',
                'year' => '2005'
            ]
        ];

        foreach ($vessels as $vessel) {
            Vessel::create($vessel);
        }
    }
}