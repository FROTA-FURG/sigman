import { useState } from 'react';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link } from '@inertiajs/react';
import StaticVesselViewer from './components/StaticVesselViewer';

export default function Index({vessels = []}) {
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

    // 3. Filtrar as embarcações com base no termo de pesquisa
    const filteredVessels = vessels.filter((vessel) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            vessel.name?.toLowerCase().includes(searchLower) ||
            vessel.type?.toLowerCase().includes(searchLower) ||
            vessel.tag?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <SIGMANLayout>
            <Head title="Frota e Embarcações | SIGMAN" />

            <div className="flex h-full flex-col space-y-6">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white">Frota Operacional</h2>
                        <p className="text-xs text-slate-400">Visão geral, saúde e indicadores das embarcações.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <input 
                                type="text" 
                                placeholder="Buscar embarcação..." 
                                value={searchTerm} // Liga o valor ao estado
                                onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado ao digitar
                                className="w-64 rounded-md border-slate-700 bg-slate-900 py-1.5 pl-3 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Nova Embarcação
                        </button>
                    </div>
                </div>

                {/* Verifica se a pesquisa não encontrou resultados */}
                {filteredVessels.length === 0 && (
                    <div className="flex justify-center items-center h-32 text-slate-400">
                        Nenhuma embarcação encontrada.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6">
                    {/* 4. Trocamos vessels.map por filteredVessels.map */}
                    {filteredVessels.map((vessel) => (
                        <div key={vessel.id} className="flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition-all hover:ring-blue-500/50 hover:shadow-blue-900/20 hover:-translate-y-1">
                            
                            <div className="relative h-48 w-full bg-[#051326] border-b border-slate-700/50 cursor-grab active:cursor-grabbing">
                                <StaticVesselViewer 
                                    modelPath={vessel.modelPath} 
                                    name={vessel.name}
                                />
                                
                                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                                    {renderStatusBadge(vessel.status)}
                                </div>
                                
                                <div className="absolute bottom-2 left-4 z-10 text-4xl font-black text-white/10 tracking-tighter pointer-events-none">
                                    {vessel.tag}
                                </div>
                            </div>

                            <div className="flex flex-1 flex-col p-5">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-white">{vessel.name}</h3>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{vessel.type}</p>
                                </div>

                                <div className="mb-5">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs font-medium text-slate-300">Saúde do Navio</span>
                                        <span className={`text-xs font-bold ${getHealthColor(vessel.healthScore).replace('bg-', 'text-')}`}>
                                            {vessel.healthScore}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${getHealthColor(vessel.healthScore)}`} 
                                            style={{ width: `${vessel.healthScore}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-900/50 rounded-lg p-3 ring-1 ring-slate-800">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">OS Ativas</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                            <span className="text-lg font-bold text-white">{vessel.activeWOs}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col border-l border-slate-700 pl-4">
                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Solicitações</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                            <span className="text-lg font-bold text-white">{vessel.pendingSRs}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    <Link 
                                        href={route('vessels.show', { id: vessel.id })}
                                        className="flex w-full items-center justify-center rounded-md bg-slate-800 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                                    >
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