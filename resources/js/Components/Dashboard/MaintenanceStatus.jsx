import React from 'react';

/*
 * Status das manutenções — versão compacta (sem donut). Distribuição por tipo
 * em barra empilhada + dois KPIs (tempo e custo médio) com mini-barras.
 */
/*
 * Distribuição por tipo e os dois indicadores de tempo/custo dependem de
 * apontamento de horas e de custo por OS, que o sistema ainda não coleta.
 * Ficam zerados até existir essa entrada.
 */
const TIPOS = [
    { label: 'Preventiva', value: 0, color: 'bg-blue-500', text: 'text-blue-400' },
    { label: 'Corretiva', value: 0, color: 'bg-emerald-500', text: 'text-emerald-400' },
    { label: 'Inspeção', value: 0, color: 'bg-orange-500', text: 'text-orange-400' },
];

const TEMPO_MEDIO_REPARO = 0;   // horas
const CUSTO_MEDIO_SERVICO = 0;  // R$

export default function MaintenanceStatus() {
    const semDados = TIPOS.every((t) => t.value === 0);

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-blue-500/50">
            <div className="shrink-0 border-b border-slate-800 px-4 py-2.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    Status das Manutenções
                    {semDados && (
                        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400" title="Depende de apontamento de horas e custo por OS, ainda não coletados">
                            Aguardando dados
                        </span>
                    )}
                </h3>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-3">
                {/* Distribuição por tipo (barra empilhada) */}
                <div className="shrink-0">
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                        {TIPOS.map((t) => (
                            <div key={t.label} className={`h-full ${t.color}`} style={{ width: `${t.value}%` }} title={`${t.label}: ${t.value}%`} />
                        ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium">
                        {TIPOS.map((t) => (
                            <span key={t.label} className={`flex items-center gap-1 ${t.text}`}>
                                <span className={`h-2 w-2 rounded-full ${t.color}`} />
                                {t.label} <span className="text-slate-500">{t.value}%</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* KPIs — centralizados na vertical no espaço restante */}
                <div className="flex flex-1 flex-col justify-center gap-3 border-t border-slate-800 pt-2">
                    <div>
                        <div className="mb-0.5 flex items-end justify-between">
                            <span className="text-[11px] text-slate-300">Tempo Médio de Reparo</span>
                            <span className="text-sm font-bold text-white">{TEMPO_MEDIO_REPARO.toFixed(1)} <span className="text-[10px] text-slate-400">hrs</span></span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.4)]" style={{ width: '0%' }} />
                        </div>
                    </div>
                    <div>
                        <div className="mb-0.5 flex items-end justify-between">
                            <span className="text-[11px] text-slate-300">Custo Médio por Serviço</span>
                            <span className="text-sm font-bold text-white">R$ {CUSTO_MEDIO_SERVICO.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]" style={{ width: '0%' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
