<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Roda todo dia 00:01: as OS agendadas cuja data chegou viram "Aberta", aparecem no
// Andamento Semanal e os responsáveis são notificados por e-mail e no sino do perfil.
Schedule::command('app:check-scheduled-os')->dailyAt('00:01');
