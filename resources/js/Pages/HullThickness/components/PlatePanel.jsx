import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { STATUS, PRAZO, fmt, fmtPct, fmtData } from '../lib/espessura';

/*
 * Detalhe de uma chapa: curva espessura × tempo com os limites (projeto,
 * 20% alerta, 25% crítico), a reta de tendência projetada até cruzar o
 * limite crítico, os indicadores (TC norma e tendência, vida residual) e a
 * tabela de pontos medidos por campanha.
 */

const COR_SERIE = '#60a5fa';
const COR_PONTOS = '#94a3b8';
const COR_TENDENCIA = '#c084fc';

function Indicador({ rotulo, valor, detalhe, destaque }) {
    return (
        <div className="rounded-lg bg-slate-900/50 p-3 ring-1 ring-slate-800">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500">{rotulo}</span>
            <span className={`mt-0.5 block text-lg font-black tabular-nums ${destaque || 'text-white'}`}>{valor}</span>
            {detalhe && <span className="block text-[10px] text-slate-500">{detalhe}</span>}
        </div>
    );
}

function Dica({ active, payload }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    if (p.tipo === 'ponto') return <div className="rounded border border-slate-700 bg-slate-900/95 px-2 py-1 text-xs text-slate-200">Ponto {p.indice}: {fmt(p.y)} mm</div>;
    if (p.tipo === 'tendencia') return <div className="rounded border border-slate-700 bg-slate-900/95 px-2 py-1 text-xs text-purple-200">Tendência {Math.floor(p.x)}: {fmt(p.y)} mm</div>;
    return (
        <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold text-white">Inspeção {p.campanha.id}</p>
            <p className="text-slate-300">Leitura: <span className="font-bold text-white">{fmt(p.y)} mm</span></p>
        </div>
    );
}

export default function PlatePanel({ chave, regiaoNome, chapa, analise: a, modo, onFechar }) {
    const numero = chave.split('-')[1];
    const st = STATUS[a.status];

    const serie = a.serie.map((p) => ({ ...p, tipo: 'serie' }));
    const pontos = a.serie.flatMap((p) => p.pontos.map((y, i) => ({ x: p.x, y, indice: i + 1, tipo: 'ponto' })));
    // Reta de tendência: do início do trecho até cruzar o limite crítico (no máx. 25 anos à frente).
    let tendencia = [];
    if (a.reta && a.tcTendencia > 0) {
        const xi = a.trecho[0].x;
        const xf = Math.min(a.anoLimite ?? a.atual.x + 25, a.atual.x + 25);
        tendencia = [xi, xf].map((x) => ({ x, y: a.reta.a + a.reta.b * x, tipo: 'tendencia' }));
    }
    const xs = [...serie.map((p) => p.x), ...tendencia.map((p) => p.x)];
    const ys = [...pontos.map((p) => p.y), a.ep, a.emaCritica];
    const dominioX = xs.length ? [Math.floor(Math.min(...xs)) - 1, Math.ceil(Math.max(...xs)) + 1] : [0, 1];
    const dominioY = [Math.floor((Math.min(...ys) - 0.3) * 2) / 2, Math.ceil((Math.max(...ys) + 0.2) * 2) / 2];
    const maxPontos = Math.max(0, ...a.serie.map((p) => p.pontos.length));

    return (
        <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">{regiaoNome}{chapa?.tipo ? ` · ${chapa.tipo}` : ''}</p>
                    <h3 className="text-xl font-bold text-white">Chapa nº {numero}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${st.badge}`}>{st.rot}</span>
                        {a.substituida && <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/30">Substituída em {a.trecho[0].campanha.id}</span>}
                        {a.atual && <span className="text-[11px]" style={{ color: PRAZO[a.prazo].cor }}>{PRAZO[a.prazo].rot}</span>}
                    </div>
                </div>
                <button onClick={onFechar} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {!a.atual ? (
                <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">Sem medição desta chapa até a inspeção escolhida.</p>
            ) : (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <Indicador rotulo={`Espessura (${modo === 'media' ? 'média' : 'mínima'})`} valor={`${fmt(a.atual.y)} mm`} detalhe={`Projeto ${fmt(a.ep)} mm · inspeção ${a.atual.campanha.id}`} />
                        <Indicador rotulo="Perda" valor={fmtPct(a.perda)} destaque={a.status === 'critico' ? 'text-red-300' : a.status === 'alerta' ? 'text-amber-300' : undefined} detalhe={`EMA ${fmt(a.emaAlerta)} (20%) · ${fmt(a.emaCritica)} (25%)`} />
                        <Indicador rotulo="Vida residual" valor={a.vidaResidual != null ? `${fmt(a.vidaResidual, 1)} anos` : '—'} detalhe={a.dataLimite ? `Limite em ${fmtData(a.dataLimite)} · TC ${a.fonteTc === 'tendencia' ? 'tendência' : 'norma'}` : 'Sem taxa para projetar'} />
                        <Indicador rotulo="TC norma (API 570)" valor={a.tcNorma != null ? `${fmt(a.tcNorma, 3)} mm/ano` : '—'} detalhe={a.tcNormaBaseCurta ? 'Base < 3 anos: não usada na projeção' : a.substituida ? 'Desde a substituição' : 'Desde a construção'} />
                        <Indicador rotulo="TC tendência" valor={a.tcTendencia != null ? `${fmt(a.tcTendencia, 3)} mm/ano` : '—'} detalhe={a.tcTendencia != null ? `Reta por ${a.trecho.length} inspeções` : 'Precisa de 2+ inspeções'} />
                        <Indicador rotulo="Inspeções" valor={a.serie.length} detalhe={chapa?.origem ? `${a.serie.map((p) => p.campanha.id).join(' · ')} · ${chapa.origem}` : a.serie.map((p) => p.campanha.id).join(' · ')} />
                    </div>

                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                                <CartesianGrid stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="x" type="number" domain={dominioX} tickFormatter={(v) => Math.round(v)} allowDecimals={false} stroke="#64748b" fontSize={11} />
                                <YAxis type="number" domain={dominioY} stroke="#64748b" fontSize={11} tickFormatter={(v) => fmt(v, 1)} />
                                <Tooltip content={<Dica />} />
                                <ReferenceLine y={a.ep} stroke="#94a3b8" strokeDasharray="2 3" label={{ value: 'Projeto', fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
                                <ReferenceLine y={a.emaAlerta} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: '20% (alerta)', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                                <ReferenceLine y={a.emaCritica} stroke="#ef4444" strokeDasharray="5 4" label={{ value: '25% (crítico)', fill: '#ef4444', fontSize: 10, position: 'insideBottomRight' }} />
                                <Scatter data={pontos} dataKey="y" fill={COR_PONTOS} fillOpacity={0.45} shape="circle" isAnimationActive={false} />
                                {tendencia.length > 0 && <Line data={tendencia} dataKey="y" stroke={COR_TENDENCIA} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />}
                                <Line data={serie} dataKey="y" stroke={COR_SERIE} strokeWidth={2} dot={{ r: 4, fill: COR_SERIE, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: COR_SERIE }} />Leitura {modo === 'media' ? 'média' : 'mínima'}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COR_PONTOS }} />Pontos medidos</span>
                        {tendencia.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: COR_TENDENCIA }} />Tendência projetada</span>}
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-lg ring-1 ring-slate-800">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-900/70 text-[10px] uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-2 py-1.5 text-left">Inspeção</th>
                                    {Array.from({ length: maxPontos }, (_, i) => <th key={i} className="px-2 py-1.5 text-right">P{i + 1}</th>)}
                                    <th className="px-2 py-1.5 text-right">Mín.</th>
                                    <th className="px-2 py-1.5 text-right">Média</th>
                                    <th className="px-2 py-1.5 text-right">Perda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 tabular-nums text-slate-300">
                                {a.serie.map((p) => {
                                    const min = Math.min(...p.pontos);
                                    const med = p.pontos.reduce((s, v) => s + v, 0) / p.pontos.length;
                                    return (
                                        <tr key={p.campanha.id}>
                                            <td className="px-2 py-1.5 font-semibold text-white">{p.campanha.id}</td>
                                            {Array.from({ length: maxPontos }, (_, i) => (
                                                <td key={i} className={`px-2 py-1.5 text-right ${p.pontos[i] === min ? 'font-bold text-amber-200' : ''}`}>{fmt(p.pontos[i])}</td>
                                            ))}
                                            <td className="px-2 py-1.5 text-right">{fmt(min)}</td>
                                            <td className="px-2 py-1.5 text-right">{fmt(med)}</td>
                                            <td className="px-2 py-1.5 text-right">{fmtPct((a.ep - p.y) / a.ep)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
