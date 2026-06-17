import React, { useState } from 'react';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import CreateDryDockingModal from './components/CreateDryDockingModal';
import { Head, Link } from '@inertiajs/react';

// ==========================================
// DADOS FALSOS (MOCK) PARA TESTE VISUAL
// ==========================================
const mockVessels = [
    { id: 'v1', name: 'Lacha Larus', tag: 'LL' },
];

const mockDryDockings = [
    {
        id: '1',
        vessel: { name: 'Lacha Larus', tag: 'LL' },
        shipyard: 'Cais Rio Grande',
        planned_start_date: '2026-05-18',
        planned_end_date: '2026-12-18',
        budget: 1500000.00,
        actual_cost: 850000.00,
        status: 'in_progress',
    }
];

export default function Index({ dryDockings = [], vessels = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Usa os dados do banco se existirem, senão usa os Mocks
    const displayDockings = dryDockings.length > 0 ? dryDockings : mockDryDockings;
    const displayVessels = vessels.length > 0 ? vessels : mockVessels;
    
    const renderStatusBadge = (status) => {
        const statusMap = {
            'planning': { label: 'Planejamento', classes: 'bg-slate-500/10 text-slate-400 ring-slate-500/20' },
            'quoting': { label: 'Em Cotação', classes: 'bg-purple-500/10 text-purple-400 ring-purple-500/20' },
            'in_progress': { label: 'Em Andamento', classes: 'bg-orange-500/10 text-orange-400 ring-orange-500/20' },
            'completed': { label: 'Concluído', classes: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
            'cancelled': { label: 'Cancelado', classes: 'bg-red-500/10 text-red-400 ring-red-500/20' }
        };

        const config = statusMap[status] || statusMap['planning'];

        return (
            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.classes}`}>
                {status === 'in_progress' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>}
                {config.label}
            </span>
        );
    };

    const formatDateBr = (dateString) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
    };

    const formatCurrency = (value) => {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    // Filtra usando a variável que tem os mocks
    const filteredDockings = displayDockings.filter((docking) => {
        const term = searchTerm.toLowerCase();
        return (
            docking.vessel?.name?.toLowerCase().includes(term) ||
            docking.shipyard?.toLowerCase().includes(term)
        );
    });

    // Cálculos do Dashboard usando a variável que tem os mocks
    const inProgressCount = displayDockings.filter(d => d.status === 'in_progress').length;
    const planningCount = displayDockings.filter(d => ['planning', 'quoting'].includes(d.status)).length;
    const completedCount = displayDockings.filter(d => d.status === 'completed').length;

    return (
        <SIGMANLayout>
            <CreateDryDockingModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                vessels={displayVessels} // Passando os mocks para o modal
            />

            <Head title="Controle de Docagens | SIGMAN" />

            <div className="flex h-full flex-col space-y-6">
                
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white">Planejamento de Docagens</h2>
                        <p className="text-xs text-slate-400">Controle de estaleiros, orçamentos e prazos regulamentares da frota.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <input 
                                type="text" 
                                placeholder="Buscar embarcação ou estaleiro..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-72 rounded-md border-slate-700 bg-slate-900 py-1.5 pl-3 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Registrar Docagem
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 shrink-0">
                    <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4 shadow-sm backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-400">Em Estaleiro</p>
                                <p className="text-2xl font-bold text-white">{inProgressCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4 shadow-sm backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-400">Em Planejamento</p>
                                <p className="text-2xl font-bold text-white">{planningCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4 shadow-sm backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-400">Concluídas este ano</p>
                                <p className="text-2xl font-bold text-white">{completedCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {filteredDockings.length === 0 && (
                    <div className="flex flex-col justify-center items-center h-48 text-slate-400 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                        <svg className="h-10 w-10 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Nenhuma docagem encontrada no sistema.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6">
                    {filteredDockings.map((docking) => (
                        <div key={docking.id} className="flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition-all hover:ring-blue-500/50 hover:shadow-blue-900/20">
                            
                            <div className="border-b border-slate-700/50 p-5 bg-slate-900/40">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            {docking.vessel?.name || 'Embarcação Desconhecida'}
                                        </h3>
                                        <p className="text-xs font-medium text-slate-400 uppercase flex items-center gap-1 mt-1">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            {docking.shipyard || 'Estaleiro a definir'}
                                        </p>
                                    </div>
                                    {renderStatusBadge(docking.status)}
                                </div>
                            </div>

                            <div className="flex flex-1 flex-col p-5 gap-4">
                                
                                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-900/50 p-3 ring-1 ring-slate-800">
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Início Previsto</span>
                                        <span className="text-sm font-semibold text-slate-200">
                                            {formatDateBr(docking.planned_start_date)}
                                        </span>
                                    </div>
                                    <div className="border-l border-slate-700 pl-4">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Fim Previsto</span>
                                        <span className="text-sm font-semibold text-slate-200">
                                            {formatDateBr(docking.planned_end_date)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center px-1">
                                    <div>
                                        <span className="text-xs text-slate-500 block">Orçamento Total</span>
                                        <span className="text-sm font-bold text-white">{formatCurrency(docking.budget)}</span>
                                    </div>
                                    {docking.actual_cost && (
                                        <div className="text-right">
                                            <span className="text-xs text-slate-500 block">Custo Atual</span>
                                            <span className={`text-sm font-bold ${Number(docking.actual_cost) > Number(docking.budget) ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {formatCurrency(docking.actual_cost)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-800/50">
                                    <Link 
                                        href={route('dry-dockings.show', { id: docking.id })}
                                        className="flex w-full items-center justify-center rounded-md bg-slate-800 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-blue-600 hover:text-white"
                                    >
                                        Ver Painel da Docagem
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