import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head } from '@inertiajs/react';
import { useState, useMemo } from 'react';

import WeeklyProgress from './components/WeeklyProgress';
import FullPlan from './components/FullPlan';
import FutureOS from './components/FutureOS';
import CreateWorkOrderModal from '@/Pages/WorkOrders/components/CreateOSModal';
import WeekPickerModal from './components/WeekPickerModal';

const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

const getSunday = (monday) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + 6);
    date.setHours(23, 59, 59, 999);
    return date;
};

export default function Index({ workOrders = [], equipments = [], users = [] }) {
    const [activeTab, setActiveTab] = useState('planning');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);

    const [vesselFilter, setVesselFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [periodFilter, setPeriodFilter] = useState('');
    const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
    const [weekEnd, setWeekEnd] = useState(() => getSunday(getMonday(new Date())));

    const uniqueVessels = useMemo(() => [...new Set(workOrders.map(os => os.equipment?.vessel?.tag).filter(Boolean))].sort(), [workOrders]);
    const uniqueStatus = useMemo(() => [...new Set(workOrders.map(os => os.status).filter(Boolean))].sort(), [workOrders]);
    const uniquePeriods = useMemo(() => [...new Set(workOrders.map(os => os.periodicity).filter(Boolean))].sort(), [workOrders]);
    
    const statusLabels = { open: 'Aberto', in_progress: 'Em Andamento', completed: 'Fechado', cancelled: 'Cancelado' };
    const periodLabels = { monthly: 'Mensal', bimonthly: 'Bimestral', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual', docking: 'Docagem' };

    const formatBr = (date) => {
        if (!date) return '';
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = String(date.getFullYear()).slice(-2);
        return `${d}/${m}/${y}`;
    };

    const displayWeekRange = weekStart && weekEnd ? `${formatBr(weekStart)} à ${formatBr(weekEnd)}` : 'Todas as Datas';

    return (
        <SIGMANLayout>
            <Head title="Ordens de Serviço | SIGMAN" />

            <CreateWorkOrderModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} equipments={equipments} />
            
            <WeekPickerModal 
                isOpen={isWeekPickerOpen} 
                onClose={() => setIsWeekPickerOpen(false)} 
                onApply={(start, end) => { setWeekStart(start); setWeekEnd(end); setIsWeekPickerOpen(false); }}
                onClear={() => { setWeekStart(null); setWeekEnd(null); setIsWeekPickerOpen(false); }}
            />

            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
            )}
            
            <div className={`fixed top-0 right-0 z-50 h-full w-80 bg-slate-900 border-l border-slate-700 p-6 shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        Filtros de Busca
                    </h3>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Período Semanal</label>
                            {weekStart && (
                                <button onClick={() => { setWeekStart(null); setWeekEnd(null); }} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider">
                                    Limpar
                                </button>
                            )}
                        </div>
                        <button onClick={() => setIsWeekPickerOpen(true)} className="w-full flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {displayWeekRange}
                            </div>
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Embarcação</label>
                        <select value={vesselFilter} onChange={(e) => setVesselFilter(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-3 pr-8 text-sm font-medium text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="">Todas as Embarcações</option>
                            {uniqueVessels.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Status da OS</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-3 pr-8 text-sm font-medium text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="">Todos Status</option>
                            {uniqueStatus.map(s => <option key={s} value={s}>{statusLabels[s] || s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Periodicidade</label>
                        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-3 pr-8 text-sm font-medium text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="">Todas as Periodicidades</option>
                            {uniquePeriods.map(p => <option key={p} value={p}>{periodLabels[p] || p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                    <button 
                        onClick={() => { 
                            setVesselFilter(''); 
                            setStatusFilter(''); 
                            setPeriodFilter(''); 
                            setWeekStart(getMonday(new Date())); 
                            setWeekEnd(getSunday(getMonday(new Date()))); 
                        }} 
                        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        Limpar Todos os Filtros
                    </button>
                </div>
            </div>

            <div className="flex h-full flex-col space-y-4">
                <div>
                    <h2 className="text-xl font-bold leading-tight text-white">Ordens de Serviço</h2>
                    <p className="text-xs text-slate-400">Gerencie e visualize o histórico de todas as OS da frota.</p>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center">
                        <button onClick={() => setActiveTab('planning')} className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'planning' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                            Planejamento Geral
                        </button>
                        <button onClick={() => setActiveTab('weekly')} className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'weekly' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                            Andamento Semanal
                        </button>
                        <button onClick={() => setActiveTab('future')} className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'future' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                            OS Futuras
                        </button>
                    </div>

                    <div className="flex items-center gap-3 pb-1">
                        <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-2 rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filtros
                            {(vesselFilter || statusFilter || periodFilter || weekStart) && <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>}
                        </button>

                        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Nova OS
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 mt-0">
                    {activeTab === 'planning' && <FullPlan workOrders={workOrders} equipments={equipments} users={users} vesselFilter={vesselFilter} statusFilter={statusFilter} periodFilter={periodFilter} />}
                    {activeTab === 'weekly' && <WeeklyProgress workOrders={workOrders} equipments={equipments} users={users} vesselFilter={vesselFilter} statusFilter={statusFilter} periodFilter={periodFilter} weekStart={weekStart} weekEnd={weekEnd} />}
                    {activeTab === 'future' && <FutureOS workOrders={workOrders} equipments={equipments} users={users} vesselFilter={vesselFilter} statusFilter={statusFilter} periodFilter={periodFilter} />}
                </div>
            </div>
        </SIGMANLayout>
    );
}