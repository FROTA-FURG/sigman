<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Traduz o slug de periodicidade da OS (o mesmo usado no filtro da tela de
 * Ordens de Serviço) num intervalo de calendário, pra saber "daqui a quanto
 * tempo" é a próxima ocorrência de uma tarefa recorrente.
 *
 * Nem toda periodicidade tem um intervalo de calendário fixo: "docking"
 * (docagem) segue o ciclo do estaleiro, não uma data previsível, e algumas
 * OS trazem periodicidade em horas de uso do equipamento (ex.: "500h",
 * herdadas direto do texto da planilha de origem). Essas não entram no mapa
 * de propósito -- não dá pra calcular "próxima data" sem uma data-base
 * confiável, então quem chama isso precisa checar `hasInterval()` antes.
 */
class PeriodicityInterval
{
    private const MESES = [
        'monthly' => 1,
        'bimonthly' => 2,
        'quarterly' => 3,
        'semiannual' => 6,
    ];

    private const ANOS = [
        'annual' => 1,
        'biennial' => 2,
        'triennial' => 3,
        'quadrennial' => 4,
        'sexennial' => 6,
    ];

    private const DIAS = [
        'daily' => 1,
        'weekly' => 7,
        'biweekly' => 14,
    ];

    public static function hasInterval(?string $periodicity): bool
    {
        if ($periodicity === null) {
            return false;
        }

        return array_key_exists($periodicity, self::MESES)
            || array_key_exists($periodicity, self::ANOS)
            || array_key_exists($periodicity, self::DIAS);
    }

    /** Aplica o intervalo $vezes sobre $data. Retorna null se não houver intervalo definido. */
    public static function proximaData(?string $periodicity, Carbon $data, int $vezes = 1): ?Carbon
    {
        if (! self::hasInterval($periodicity)) {
            return null;
        }

        $resultado = $data->copy();

        if (isset(self::DIAS[$periodicity])) {
            return $resultado->addDays(self::DIAS[$periodicity] * $vezes);
        }
        if (isset(self::MESES[$periodicity])) {
            return $resultado->addMonths(self::MESES[$periodicity] * $vezes);
        }

        return $resultado->addYears(self::ANOS[$periodicity] * $vezes);
    }
}
