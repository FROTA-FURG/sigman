import { useState } from 'react';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link } from '@inertiajs/react';
import StaticVesselViewer from './components/StaticVesselViewer';

export default function Index({ vessels = [] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const renderStatusBadge = (status) => {
        if (status === 'Operacional') return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Operacional</span>;
        if (status === 'Atenção') return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>Atenção</span>;
        if (status === 'Manutenção') return <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 ring-1 ring-inset ring-orange-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>Em Manutenção</span>;
        return null;
    };

    const getHealthColor = (score) => {
        if (score >= 90) return 'bg-emerald-500';
        if (score >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const filteredVessels = vessels.filter((vessel) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            vessel.name?.toLowerCase().includes(searchLower) ||
            vessel.type?.toLowerCase().includes(searchLower) ||
            vessel.tag?.toLowerCase().includes(searchLower)
        );
    });

    // Métrica atual (dado já trabalhado)
    const Metric = ({ icon, label, value, accent = 'text-base text-white' }) => (
        <div className="flex flex-col rounded-lg bg-slate-900/50 p-2.5 ring-1 ring-slate-800">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
            <span className="mt-1 flex items-center gap-1.5">
                {icon}
                <span className={`font-bold ${accent}`}>{value}</span>
            </span>
        </div>
    );

    // Placeholder de telemetria (dado futuro — sensores ainda não integrados)
    const TelemetrySoon = ({ label }) => (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-700/70 bg-slate-900/30 py-2 text-center">
            <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
            <span className="text-xs font-bold text-slate-600">—</span>
        </div>
    );

    return (
        <SIGMANLayout>
            <Head title="Frota e Embarcações | SIGMAN" />

            <div className="flex h-full flex-col space-y-5">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white">Gerenciamento da Frota</h2>
                        <p className="text-xs text-slate-400">Visão geral, saúde e indicadores das embarcações.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <input
                                type="text"
                                placeholder="Buscar embarcação..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-64 rounded-md border-slate-700 bg-slate-900 py-1.5 pl-3 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Nova Embarcação
                        </button>
                    </div>
                </div>

                {filteredVessels.length === 0 && (
                    <div className="flex h-32 items-center justify-center text-slate-400">Nenhuma embarcação encontrada.</div>
                )}

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto custom-scrollbar pb-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredVessels.map((vessel) => (
                        <div key={vessel.id} className="flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-blue-900/20 hover:ring-blue-500/50">

                            {/* VISUALIZAÇÃO 3D */}
                            <div className="relative h-44 w-full cursor-grab border-b border-slate-700/50 bg-[#051326] active:cursor-grabbing">
                                <StaticVesselViewer modelPath={vessel.modelPath} name={vessel.name} />
                                <div className="pointer-events-none absolute right-3 top-3 z-10">{renderStatusBadge(vessel.status)}</div>
                                <div className="pointer-events-none absolute bottom-2 left-4 z-10 text-4xl font-black tracking-tighter text-white/10">{vessel.tag}</div>
                                {/* Localização real (dado já trabalhado) */}
                                <div className="pointer-events-none absolute bottom-2.5 right-3 z-10 flex items-center gap-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-sm">
                                    <svg className="h-2.5 w-2.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {vessel.location || vessel.navigationStatus || '—'}
                                </div>
                            </div>

                            <div className="flex flex-1 flex-col p-5">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-white">{vessel.name}</h3>
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{vessel.type}</p>
                                </div>

                                {/* Saúde (dado atual) */}
                                <div className="mb-4">
                                    <div className="mb-1 flex items-end justify-between">
                                        <span className="text-xs font-medium text-slate-300">Saúde do Navio</span>
                                        <span className={`text-xs font-bold ${getHealthColor(vessel.healthScore).replace('bg-', 'text-')}`}>{vessel.healthScore}%</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                        <div className={`h-full rounded-full ${getHealthColor(vessel.healthScore)}`} style={{ width: `${vessel.healthScore}%` }} />
                                    </div>
                                </div>

                                {/* DADOS ATUAIS */}
                                <div className="mb-4 grid grid-cols-2 gap-2">
                                    <Metric
                                        label="OS Ativas"
                                        value={vessel.activeWOs}
                                        icon={<svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                                    />
                                    <Metric
                                        label="Solicitações"
                                        value={vessel.pendingSRs}
                                        icon={<svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
                                    />
                                    <Metric
                                        label="Última Docagem"
                                        value={vessel.lastInspection || 'N/A'}
                                        accent="text-sm text-white"
                                        icon={<svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                    />
                                    <Metric
                                        label="Ano / Const."
                                        value={vessel.year || '—'}
                                        accent="text-sm text-white"
                                        icon={<svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-14h6M9 11h6m-6 4h6" /></svg>}
                                    />
                                </div>

                                {/* TELEMETRIA (dado futuro) */}
                                <div className="mb-5">
                                    <div className="mb-1.5 flex items-center gap-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Telemetria</span>
                                        <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-400/80 ring-1 ring-inset ring-sky-500/20">Em breve</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <TelemetrySoon label="Veloc." />
                                        <TelemetrySoon label="Motor" />
                                        <TelemetrySoon label="Combust." />
                                    </div>
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    <Link href={route('vessels.show', { id: vessel.id })} className="flex w-full items-center justify-center rounded-md bg-slate-800 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white">
                                        Ver Detalhes
                                    </Link>
                                    <Link href={route('eq.index', { vessel: `v${vessel.id}` })} className="flex w-full items-center justify-center rounded-md bg-blue-600/20 py-2 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/30 transition hover:bg-blue-600 hover:text-white hover:ring-blue-600">
                                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        Equipamentos
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </SIGMANLayout>
    );
}
