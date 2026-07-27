import React from 'react';

/*
 * Custos por mês — barras agrupadas (Faturamento x Custo) em CSS puro,
 * com eixos Y (R$ mil) e X (meses) rotulados. Compacto para caber no painel.
 */
const DATA = [
    { mes: 'Jan', faturamento: 100000, custo: 100000 },
    { mes: 'Fev', faturamento: 40000, custo: 45000 },
    { mes: 'Mar', faturamento: 42000, custo: 54000 },
    { mes: 'Abr', faturamento: 12000, custo: 12000 },
];

const fmtK = (v) => `${Math.round(v / 1000)}`;

export default function MonthlyChart() {
    const rawMax = Math.max(...DATA.flatMap((d) => [d.faturamento, d.custo]));
    // Arredonda o topo para um múltiplo "redondo" de 25 mil
    const max = Math.ceil(rawMax / 25000) * 25000;
    const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0]; // topo -> base

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-sky-500/50">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-white">Custos por Mês <span className="text-[10px] font-normal text-slate-500">(R$ mil)</span></h3>
                <div className="flex items-center gap-3 text-[10px] font-medium">
                    <span className="flex items-center gap-1 text-sky-400"><span className="h-2 w-2 rounded-full bg-sky-400" />Faturamento</span>
                    <span className="flex items-center gap-1 text-orange-400"><span className="h-2 w-2 rounded-full bg-orange-400" />Custo</span>
                </div>
            </div>

            <div className="flex flex-1 gap-1.5 px-3 pb-2 pt-3">
                {/* Eixo Y (valores em R$ mil) */}
                <div className="flex flex-col">
                    <div className="flex flex-1 flex-col justify-between pr-1 text-right text-[9px] tabular-nums text-slate-500">
                        {ticks.map((t) => <span key={t} className="leading-none">{fmtK(t)}</span>)}
                    </div>
                    <div className="h-[14px]" /> {/* alinha com os rótulos do eixo X */}
                </div>

                {/* Área do gráfico */}
                <div className="flex flex-1 flex-col">
                    <div className="relative flex-1">
                        {/* Linhas de grade horizontais */}
                        {ticks.map((t, i) => (
                            <div key={i} className="absolute left-0 right-0 border-t border-slate-800/70" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
                        ))}
                        {/* Barras */}
                        <div className="absolute inset-0 flex items-end justify-around">
                            {DATA.map((d) => (
                                <div key={d.mes} className="flex h-full w-full items-end justify-center gap-1">
                                    <div className="group relative flex w-1/3 max-w-[20px] items-end justify-center rounded-t bg-sky-500/90 shadow-[0_0_8px_rgba(56,189,248,0.35)] transition-all hover:bg-sky-400"
                                         style={{ height: `${(d.faturamento / max) * 100}%` }}>
                                        <span className="absolute -top-4 whitespace-nowrap text-[9px] font-bold text-sky-300 opacity-0 transition group-hover:opacity-100">R$ {fmtK(d.faturamento)} mil</span>
                                    </div>
                                    <div className="group relative flex w-1/3 max-w-[20px] items-end justify-center rounded-t bg-orange-500/90 shadow-[0_0_8px_rgba(249,115,22,0.35)] transition-all hover:bg-orange-400"
                                         style={{ height: `${(d.custo / max) * 100}%` }}>
                                        <span className="absolute -top-4 whitespace-nowrap text-[9px] font-bold text-orange-300 opacity-0 transition group-hover:opacity-100">R$ {fmtK(d.custo)} mil</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Eixo X (meses) */}
                    <div className="flex justify-around pt-1 text-[10px] font-medium text-slate-400">
                        {DATA.map((d) => <span key={d.mes} className="w-full text-center">{d.mes}</span>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
