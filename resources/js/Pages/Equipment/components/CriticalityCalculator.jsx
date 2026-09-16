import { useMemo, useState } from 'react';

/**
 * Matriz de criticidade do estudo do estagiário (CLASSIFICAÇÃO 14224 -
 * CRITÉRIOS CRITICIDADE ABC.csv): 7 critérios, cada um vale de 1 a 3
 * pontos, soma total de 7 a 21 -> classifica em C/B/A. A metodologia
 * ainda está em estudo (o próprio material cita "pesquisar valores pra
 * basear no MTBF"), por isso isso aqui é só uma ferramenta de apoio --
 * o campo de criticidade continua podendo ficar em branco.
 */
const CRITERIOS = [
    {
        chave: 'S',
        nome: 'Segurança e Meio Ambiente',
        notas: [
            'Sem risco à integridade física ou ao meio ambiente',
            'Possibilidade de lesão leve, incidente sem consequências graves ou impacto ambiental de pequena magnitude',
            'Possibilidade de acidente grave/fatal ou impacto ambiental relevante',
        ],
    },
    {
        chave: 'Q',
        nome: 'Qualidade',
        notas: [
            'Não compromete resultados, dados ou amostras',
            'Pode gerar retrabalho, repetição de ensaio ou perda parcial de dados/amostras',
            'Pode invalidar resultados, comprometer amostras críticas ou causar perda significativa de dados',
        ],
    },
    {
        chave: 'B',
        nome: 'Sistema Alternativo (Backup)',
        notas: [
            'Redundância disponível e capaz de assumir a função sem interrupção significativa',
            'Backup disponível, mas requer intervenção/configuração e gera alguma indisponibilidade',
            'Não existe backup funcional ou a indisponibilidade permanece até o reparo',
        ],
    },
    {
        chave: 'P',
        nome: 'Produção',
        notas: [
            'Indisponibilidade < 4h, sem impacto relevante na atividade',
            'Indisponibilidade entre 4 e 24h, causando atraso ou redução parcial da atividade',
            'Indisponibilidade > 24h ou paralisação de atividade/missão',
        ],
    },
    {
        chave: 'F',
        nome: 'Frequência de Falha',
        notas: ['≤ 1 falha/ano', '> 1 e ≤ 2 falhas/ano', '> 2 falhas/ano'],
    },
    {
        chave: 'R',
        nome: 'Dificuldade de Reparo',
        notas: [
            'Reparo realizado em ≤ 4h, sem necessidade de desmontagem complexa',
            'Reparo entre > 4 e ≤ 24h, com planejamento ou desmontagem parcial',
            'Reparo > 24h, exigindo intervenção especializada, desmontagem complexa ou assistência externa',
        ],
    },
    {
        chave: 'C',
        nome: 'Custo de Manutenção',
        notas: [
            '≤ R$ 10.000 por intervenção',
            '> R$ 10.000 e ≤ R$ 50.000 por intervenção',
            '> R$ 50.000 por intervenção',
        ],
    },
];

function classificar(pontos) {
    if (pontos >= 17) return 'A';
    if (pontos >= 12) return 'B';
    return 'C';
}

export default function CriticalityCalculator({ onApply }) {
    const [aberto, setAberto] = useState(false);
    const [notas, setNotas] = useState({}); // { S: 1|2|3, Q: ..., ... }

    const completo = CRITERIOS.every(c => notas[c.chave]);
    const pontos = useMemo(() => Object.values(notas).reduce((soma, n) => soma + n, 0), [notas]);
    const classe = completo ? classificar(pontos) : null;

    const escolher = (chave, nota) => setNotas(n => ({ ...n, [chave]: nota }));

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-950/40">
            <button
                type="button"
                onClick={() => setAberto(v => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
                <span>{aberto ? '▾' : '▸'} Calcular criticidade (matriz A/B/C)</span>
                {completo && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">{pontos} pts -&gt; Classe {classe}</span>
                )}
            </button>

            {aberto && (
                <div className="space-y-3 border-t border-slate-800 p-3">
                    <p className="text-[11px] text-slate-500">
                        Metodologia ainda em estudo pela equipe -- use como apoio. Responda os 7 critérios pra ver a classificação sugerida.
                    </p>

                    {CRITERIOS.map(c => (
                        <div key={c.chave}>
                            <p className="mb-1 text-xs font-medium text-slate-300">{c.nome}</p>
                            <div className="space-y-1">
                                {c.notas.map((texto, i) => {
                                    const nota = i + 1;
                                    const selecionado = notas[c.chave] === nota;
                                    return (
                                        <label
                                            key={nota}
                                            className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-[11px] transition-colors ${
                                                selecionado ? 'border-blue-500/50 bg-blue-500/5 text-slate-200' : 'border-slate-800 text-slate-400 hover:border-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`criterio-${c.chave}`}
                                                checked={selecionado}
                                                onChange={() => escolher(c.chave, nota)}
                                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500 focus:ring-blue-500"
                                            />
                                            <span>{texto}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                        <p className="text-xs text-slate-400">
                            {completo
                                ? <>Total: <span className="font-mono font-bold text-slate-200">{pontos}</span> pontos -&gt; <span className="font-bold text-slate-200">Classe {classe}</span></>
                                : `Faltam ${CRITERIOS.length - Object.keys(notas).length} de ${CRITERIOS.length} critérios.`}
                        </p>
                        <button
                            type="button"
                            disabled={!completo}
                            onClick={() => onApply(classe)}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                        >
                            Usar Classe {classe || '?'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
