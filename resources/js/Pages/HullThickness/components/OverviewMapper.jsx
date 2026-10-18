import { caminhoSvg, layoutVisaoGeral } from '../lib/contornos';
import RegionBackground from './RegionBackground';

/*
 * Mapeamento > Visão geral: todas as regiões arrumadas juntas, com o
 * progresso de cada uma. Não se desenha aqui -- clicar numa região (ou numa
 * chapa) abre a região para mapear/editar.
 */
export default function OverviewMapper({ desenho, onAbrirRegiao, onAbrirChapa }) {
    const layout = layoutVisaoGeral(desenho);
    const regioes = Object.entries(desenho.regioes);
    const contagem = (code) => new Set(desenho.contornos.filter((c) => c.regiao === code).map((c) => c.numero)).size;
    const totalChapas = regioes.reduce((s, [, r]) => s + r.chapas, 0);
    const totalMapeadas = regioes.reduce((s, [code]) => s + contagem(code), 0);

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-2">
                <div className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-700">
                    <svg viewBox={`0 0 ${layout.largura} ${layout.altura}`} className="block h-auto w-full select-none" style={{ maxHeight: '70vh' }}>
                        {Object.entries(layout.posicoes).map(([code, p]) => {
                            const r = desenho.regioes[code];
                            const n = contagem(code);
                            const completa = n === r.chapas;
                            return (
                                <g key={code}>
                                    <g transform={`translate(${p.x} ${p.y}) scale(${p.escala})`}>
                                        {r.quadro ? (
                                            <>
                                                <RegionBackground regiao={r} imagem={r.imagem} idRecorte={`mapa-geral-${r.id}`} />
                                                {desenho.contornos.filter((c) => c.regiao === code).map((c) => (
                                                    <path key={c.numero} d={caminhoSvg(c.pontos)} fill="#38bdf8" fillOpacity={0.35} stroke="#0369a1" strokeWidth={0.8}
                                                          vectorEffect="non-scaling-stroke" className="cursor-pointer hover:fill-opacity-60"
                                                          onClick={(e) => { e.stopPropagation(); onAbrirChapa(code, c.numero); }}>
                                                        <title>{`${r.nome} · chapa ${c.numero} — clique para editar`}</title>
                                                    </path>
                                                ))}
                                            </>
                                        ) : (
                                            <rect x="0" y="0" width={p.w} height={p.h} fill="#f1f5f9" />
                                        )}
                                    </g>
                                    {/* Moldura clicável da região */}
                                    <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#3b82f6" fillOpacity={0} stroke={completa ? '#16a34a' : '#2563eb'}
                                          strokeWidth={1.2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke"
                                          className={`cursor-pointer transition hover:fill-opacity-10 ${r.quadro ? 'pointer-events-none' : ''}`}
                                          onClick={() => onAbrirRegiao(code)} />
                                    <g className="cursor-pointer" onClick={() => onAbrirRegiao(code)}>
                                        <text x={p.x + 6} y={p.y + 18} fontSize={14} fontWeight="700" fill="#0f172a" stroke="#fff" strokeWidth={3} paintOrder="stroke">
                                            {r.nome}{r.quadro ? '' : ' · sem desenho (clique para subir)'}
                                        </text>
                                        <text x={p.x + p.w - 6} y={p.y + p.h - 6} fontSize={14} textAnchor="end" fontWeight="700"
                                              fill={completa ? '#15803d' : '#1d4ed8'} stroke="#fff" strokeWidth={3} paintOrder="stroke">
                                            {n}/{r.chapas}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                    A visão geral junta todas as partes. Para mapear, clique no nome de uma região ou numa chapa já desenhada — ela abre na aba da região.
                    Cada região precisa da sua imagem (aba da região › modo Imagem) antes de receber as chapas.
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
                    {regioes.map(([code, r]) => {
                        const n = contagem(code);
                        return (
                            <li key={code}>
                                <button type="button" onClick={() => onAbrirRegiao(code)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-300 transition hover:bg-slate-800">
                                    <span className="flex-1">{r.nome}{!r.quadro && <span className="ml-1 text-amber-400/80">· sem desenho</span>}</span>
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
