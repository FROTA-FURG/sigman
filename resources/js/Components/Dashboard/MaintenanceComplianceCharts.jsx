import React from 'react';

/*
 * Cumprimento dos planos de manutenção — versão compacta.
 * Anel radial com o índice geral + duas barras por tipo de plano.
 */
const PLANOS = [
    { label: 'Plano Preventivo', pct: 92, color: '#38bdf8', text: 'text-sky-400' },
    { label: 'Plano Preditivo', pct: 92, color: '#34d399', text: 'text-emerald-400' },
];

export default function MaintenanceComplianceCharts() {
    const overall = Math.round(PLANOS.reduce((s, p) => s + p.pct, 0) / PLANOS.length);
    const R = 34;
    const C = 2 * Math.PI * R;
    const dash = (overall / 100) * C;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-emerald-500/50">
            <div className="shrink-0 border-b border-slate-800 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-white">Cumprimento dos Planos</h3>
            </div>

            <div className="flex flex-1 items-center gap-4 p-4">
                {/* Anel radial do índice geral */}
                <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
                    <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
                        <circle cx="42" cy="42" r={R} fill="none" stroke="#1e293b" strokeWidth="8" />
                        <circle cx="42" cy="42" r={R} fill="none" stroke="#34d399" strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${dash} ${C}`} style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-white">{overall}%</span>
                        <span className="text-[8px] uppercase tracking-wide text-slate-500">Geral</span>
                    </div>
                </div>

                {/* Barras por plano */}
                <div className="flex-1 space-y-3">
                    {PLANOS.map((p) => (
                        <div key={p.label}>
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs text-slate-300">{p.label}</span>
                                <span className={`text-sm font-bold ${p.text}`}>{p.pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800">
                                <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}66` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
