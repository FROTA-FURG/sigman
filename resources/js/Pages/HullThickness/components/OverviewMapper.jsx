import { VISAO_GERAL, caixaDe, caminhoSvg } from '../lib/contornos';
import RegionBackground from './RegionBackground';

/*
 * Mapeamento > Visão geral: a folha inteira com as molduras das regiões e
 * todas as chapas já desenhadas. Não se desenha aqui -- clicar numa região
 * (ou numa chapa) abre a região para mapear/editar. Como as regiões são
 * recortes da mesma folha, o que é mapeado em cada uma aparece aqui sem
 * mapeamento próprio.
 */
export default function OverviewMapper({ desenho, onAbrirRegiao, onAbrirChapa }) {
    const [x1, y1, x2, y2] = caixaDe(desenho, VISAO_GERAL);
    const fonte = (x2 - x1) / 70;
    const regioes = Object.entries(desenho.regioes);
    const contagem = (sigla) => new Set(desenho.contornos.filter((c) => c.regiao === sigla).map((c) => c.numero)).size;
    const totalChapas = regioes.reduce((s, [, r]) => s + r.chapas, 0);
    const totalMapeadas = regioes.reduce((s, [sigla]) => s + contagem(sigla), 0);

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-2">
                <div className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-700">
                    <svg viewBox={`${x1} ${y1} ${x2 - x1} ${y2 - y1}`} className="block h-auto w-full select-none" style={{ maxHeight: '66vh' }}>
                        <RegionBackground desenho={desenho} regiao={VISAO_GERAL} imagens={desenho.imagensRegiao} />

                        {/* Molduras das regiões: clique abre a região */}
                        {regioes.map(([sigla, r]) => {
                            const [a, b, c, d] = r.caixa;
                            const completa = contagem(sigla) === r.chapas;
                            return (
                                <g key={sigla} className="cursor-pointer" onClick={() => onAbrirRegiao(sigla)}>
                                    <rect x={a} y={b} width={c - a} height={d - b} fill="#3b82f6" fillOpacity={0} stroke={completa ? '#16a34a' : '#2563eb'}
                                          strokeWidth={1.2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" className="transition hover:fill-opacity-10" />
                                    <text x={c - 4} y={d - 4} fontSize={fonte} textAnchor="end" fontWeight="700" fill={completa ? '#15803d' : '#1d4ed8'}
                                          stroke="#fff" strokeWidth={fonte / 4} paintOrder="stroke" className="pointer-events-none">
                                        {contagem(sigla)}/{r.chapas}
                                    </text>
                                </g>
                            );
                        })}

                        {desenho.contornos.filter((c) => desenho.regioes[c.regiao]).map((c) => (
                            <path key={`${c.regiao}-${c.numero}`} d={caminhoSvg(c.pontos)} fill="#38bdf8" fillOpacity={0.35} stroke="#0369a1" strokeWidth={0.8}
                                  vectorEffect="non-scaling-stroke" className="cursor-pointer hover:fill-opacity-60"
                                  onClick={(e) => { e.stopPropagation(); onAbrirChapa(c.regiao, c.numero); }}>
                                <title>{`${desenho.regioes[c.regiao].nome} · chapa ${c.numero} — clique para editar`}</title>
                            </path>
                        ))}
                    </svg>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                    A visão geral junta todas as partes do desenho. Para mapear, clique numa região (moldura tracejada) ou numa chapa já desenhada — ela abre na aba da região, pronta para editar.
                    Tudo o que for mapeado nas regiões aparece aqui automaticamente.
                </p>
            </div>

            <aside className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
                <div className="mb-2 flex items-baseline justify-between">
                    <h4 className="text-sm font-semibold text-white">Progresso do mapeamento</h4>
                    <span className="text-xs text-slate-400"><span className="font-bold text-white">{totalMapeadas}</span> de {totalChapas}</span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: `${(totalMapeadas / Math.max(1, totalChapas)) * 100}%` }} />
                </div>
                <ul className="space-y-1">
                    {regioes.map(([sigla, r]) => {
                        const n = contagem(sigla);
                        return (
                            <li key={sigla}>
                                <button type="button" onClick={() => onAbrirRegiao(sigla)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-300 transition hover:bg-slate-800">
                                    <span className="flex-1">{r.nome}</span>
                                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                                        <span className={`block h-full rounded-full ${n === r.chapas ? 'bg-emerald-400' : 'bg-sky-400'}`} style={{ width: `${(n / r.chapas) * 100}%` }} />
                                    </span>
                                    <span className={`w-10 text-right tabular-nums ${n === r.chapas ? 'text-emerald-300' : 'text-slate-500'}`}>{n}/{r.chapas}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </aside>
        </div>
    );
}
