<?php

/*
 * Catálogo da Análise de Óleo: famílias de equipamento e os parâmetros
 * analisados em cada uma (mesmos grupos e colunas da planilha de gestão).
 *
 * `sentido` diz como o limite é lido:
 *   max   -> acima do limite é ruim (desgaste, contaminação)
 *   min   -> abaixo é ruim (TBN, reserva alcalina)
 *   faixa -> fora de [inf, sup] é ruim (viscosidade)
 *
 * As chaves dos parâmetros são as mesmas de oil_samples.results e de
 * oil_sampling_points.limits.
 */

return [
    'familias' => [
        'motor' => [
            'rotulo' => 'Motor de Combustão',
            'grupos' => [
                ['nome' => 'Físico-Químicos', 'parametros' => [
                    ['chave' => 'agua', 'rotulo' => 'Água', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'viscosidade', 'rotulo' => 'Viscosidade a 40°C', 'unidade' => 'cSt', 'sentido' => 'faixa'],
                    ['chave' => 'tbn', 'rotulo' => 'TBN', 'unidade' => 'mgKOH/g', 'sentido' => 'min'],
                    ['chave' => 'fuligem', 'rotulo' => 'Fuligem', 'unidade' => 'abs/cm⁻¹', 'sentido' => 'max'],
                ]],
                ['nome' => 'Espectrometria', 'parametros' => [
                    ['chave' => 'fe', 'rotulo' => 'Fe', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'al', 'rotulo' => 'Al', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'cr', 'rotulo' => 'Cr', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'cu', 'rotulo' => 'Cu', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'pb', 'rotulo' => 'Pb', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'sn', 'rotulo' => 'Sn', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'si', 'rotulo' => 'Si', 'unidade' => 'ppm', 'sentido' => 'max'],
                ]],
                ['nome' => 'Infravermelho', 'parametros' => [
                    ['chave' => 'glicol', 'rotulo' => 'Glicol', 'unidade' => '%', 'sentido' => 'max'],
                    ['chave' => 'nitracao', 'rotulo' => 'Nitração', 'unidade' => 'abs/cm⁻¹', 'sentido' => 'max'],
                    ['chave' => 'sulfatacao', 'rotulo' => 'Sulfatação', 'unidade' => 'abs/cm⁻¹', 'sentido' => 'max'],
                    ['chave' => 'oxidacao', 'rotulo' => 'Oxidação', 'unidade' => 'abs/cm⁻¹', 'sentido' => 'max'],
                ]],
            ],
        ],
        'redutora' => [
            'rotulo' => 'Caixa Redutora / Reversora',
            'grupos' => [
                ['nome' => 'Físico-Químicos', 'parametros' => [
                    ['chave' => 'agua', 'rotulo' => 'Água', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'viscosidade', 'rotulo' => 'Viscosidade a 40°C', 'unidade' => 'cSt', 'sentido' => 'faixa'],
                    ['chave' => 'tan', 'rotulo' => 'TAN', 'unidade' => 'mgKOH/g', 'sentido' => 'max'],
                ]],
                ['nome' => 'Espectrometria', 'parametros' => [
                    ['chave' => 'fe', 'rotulo' => 'Fe', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'cu', 'rotulo' => 'Cu', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'si', 'rotulo' => 'Si', 'unidade' => 'ppm', 'sentido' => 'max'],
                ]],
            ],
        ],
        'hidraulica' => [
            'rotulo' => 'Unidade Hidráulica',
            'grupos' => [
                ['nome' => 'Físico-Químicos', 'parametros' => [
                    ['chave' => 'agua', 'rotulo' => 'Água', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'viscosidade', 'rotulo' => 'Viscosidade a 40°C', 'unidade' => 'cSt', 'sentido' => 'faixa'],
                    ['chave' => 'tan', 'rotulo' => 'TAN', 'unidade' => 'mgKOH/g', 'sentido' => 'max'],
                ]],
                ['nome' => 'Contagem de Partículas', 'parametros' => [
                    ['chave' => 'nas', 'rotulo' => 'Classe NAS', 'unidade' => 'NAS', 'sentido' => 'max'],
                ]],
                ['nome' => 'Espectrometria', 'parametros' => [
                    ['chave' => 'cu', 'rotulo' => 'Cu', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'fe', 'rotulo' => 'Fe', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'cr', 'rotulo' => 'Cr', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'pb', 'rotulo' => 'Pb', 'unidade' => 'ppm', 'sentido' => 'max'],
                    ['chave' => 'si', 'rotulo' => 'Si', 'unidade' => 'ppm', 'sentido' => 'max'],
                ]],
            ],
        ],
    ],

    // Condição da amostra / do item do plano: slug no banco => rótulo na tela.
    'condicoes' => [
        'normal' => 'Normal',
        'atencao' => 'Atenção',
        'intervir' => 'Intervir',
    ],
];
