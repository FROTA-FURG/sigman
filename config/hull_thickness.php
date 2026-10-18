<?php

/*
 * Medição de Espessura de chapas do casco (ultrassom).
 *
 * Limites únicos para todo o casco (perda sobre a espessura de projeto):
 * 20% = alerta, 25% = crítico (IACS). As regiões de cada embarcação são
 * criadas pelo `php artisan hull-thickness:import`; o desenho, a moldura e
 * os contornos das chapas são feitos no próprio sistema (Mapeamento).
 */

return [
    'limite_alerta' => 0.20,
    'limite_critico' => 0.25,

    // Ano de construção do casco (base da taxa de corrosão "norma"), conforme
    // os artigos da frota. O import grava em vessels.year.
    'construcao' => [
        'AS' => 1973,
        'CM1' => 2017,
    ],

    // Regiões por embarcação (tag do sistema): código => [nome, nº de chapas no desenho].
    'regioes' => [
        'AS' => [
            'BB' => ['Bombordo', 34],
            'BE' => ['Boreste', 35],
            'CC' => ['Convés castelo', 22],
            'CP' => ['Convés principal', 16],
            'AV' => ['Antepara de vante', 3],
            'AR' => ['Antepara de ré', 4],
            'EP' => ['Espelho de popa', 3],
        ],
        'CM1' => [
            'BB' => ['Bombordo', 34],
            'BE' => ['Boreste', 34],
            'CP' => ['Convés', 15],
            'AV' => ['Antepara de vante', 2],
            'AR' => ['Antepara de ré', 3],
            'EP' => ['Espelho de popa', 1],
        ],
    ],

    // Chave da embarcação no JSON da planilha => tag no sistema.
    'tag_da_planilha' => ['AS' => 'AS', 'CMI' => 'CM1'],

    // Imagem de região: tamanho máximo (KB) e largura do quadro de coordenadas.
    'imagem_max_kb' => 15360,
    'largura_do_quadro' => 1000,
];
