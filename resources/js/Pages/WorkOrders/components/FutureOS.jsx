import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import DispatchOSModal from './DispatchOSModal';

const renderPeriodicityBadge = (period) => {
    switch (period) {
        case 'docking': return <span className="text-slate-300 font-semibold uppercase">Docagem</span>; 
        case 'monthly': return <span className="text-lime-600 font-semibold uppercase">Mensal</span>; 
        case 'bimonthly': return <span className="text-blue-500 font-semibold uppercase">Bimestral</span>; 
        case 'quarterly': return <span className="text-green-400 font-semibold uppercase">Trimestral</span>; 
        case 'semiannual': return <span className="text-orange-500 font-semibold uppercase">Semestral</span>; 
        case 'annual': return <span className="text-red-600 font-semibold uppercase">Anual</span>; 
        default: return <span className="text-slate-500 font-medium uppercase">Avulsa</span>;
    }
};

const renderStatusBadge = (status) => {
    switch (status) {
        case 'completed': return <span className="text-green-400 font-semibold uppercase">Fechado</span>;
        case 'open': return <span className="text-blue-400 font-semibold uppercase">Aberto</span>;
        case 'in_progress': return <span className="text-yellow-400 font-semibold uppercase">Andamento</span>;
        case 'scheduled': return <span className="text-purple-400 font-semibold uppercase">Agendada</span>;
        case 'cancelled': return <span className="text-red-400 font-semibold uppercase">Cancelado</span>;
        default: return <span className="text-slate-400 font-semibold uppercase">{status}</span>;
    }
};

const renderPriorityBadge = (priority) => {
    switch (priority) {
        case 'critical': return <span className="text-red-500 font-bold uppercase">Crítica</span>;
        case 'high': return <span className="text-orange-400 font-bold uppercase">Alta</span>;
        case 'medium': return <span className="text-yellow-400 font-semibold uppercase">Média</span>;
        case 'low': return <span className="text-slate-400 uppercase">Baixa</span>;
        default: return <span className="uppercase">{priority}</span>;
    }
};

export default function FutureOS({ 
    workOrders = [], 
    equipments = [],
    vesselFilter,
    statusFilter,
    periodFilter,
    currentUser
}) {
    const [activeInput, setActiveInput] = useState(null);
    const [tempReason, setTempReason] = useState('');
    const [dispatchModalOS, setDispatchModalOS] = useState(null);

    const { nextMonday, fourWeeksLater } = useMemo(() => {
        const today = new Date();
        const currentMonday = new Date(today);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday.setDate(diff);
        currentMonday.setHours(0, 0, 0, 0);

        const startNext = new Date(currentMonday);
        startNext.setDate(currentMonday.getDate() + 7);

        const endFuture = new Date(startNext);
        endFuture.setDate(startNext.getDate() + 28);
        endFuture.setHours(23, 59, 59, 999);

        return { nextMonday: startNext, fourWeeksLater: endFuture };
    }, []);

    const roleName = String(currentUser?.role?.name || currentUser?.role || '').toLowerCase();
    const isEngenheiro = roleName.includes('engineer') || roleName.includes('engenheir');
    const isTI = roleName.includes('developer') || roleName.includes('desenvolvedor') || roleName.includes('ti') || roleName.includes('admin');
    const isEstagiario = roleName.includes('intern') || roleName.includes('estagiari');
    
    const isGlobalViewer = isEngenheiro || isTI;

    const futureWorkOrders = useMemo(() => {
        return workOrders.filter(os => {
            
            // Se a OS já foi disparada (agendada, em andamento, concluída),
            // ela some desta tela! Aqui só ficam as OSs 'open' aguardando planejamento.
            if (os.status !== 'open') return false;

            const eq = equipments.find(e => e.id === os.equipment_id) || os.equipment;
            const vesselTag = eq?.vessel?.tag || eq?.vessel?.prefix;
            const eqVesselId = eq?.vessel_id || eq?.vessel?.id;
            
            if (!isGlobalViewer) {
                const userVesselId = currentUser?.vessel_id;
                
                if (userVesselId) {
                    const matchById = String(eqVesselId) === String(userVesselId);
                    if (!matchById) return false;
                }
            }

            if (vesselFilter && vesselTag !== vesselFilter) return false;
            if (statusFilter && os.status !== statusFilter) return false;
            if (periodFilter && os.periodicity !== periodFilter) return false;

            if (!os.created_at) return false;
            const [datePart] = os.created_at.split('T');
            const [year, month, day] = datePart.split('-');
            const osDate = new Date(year, month - 1, day, 12, 0, 0);
            
            const isFuture = osDate >= nextMonday && osDate <= fourWeeksLater;
            
            const isPastPending = osDate < nextMonday; 
            
            if (!isFuture && !isPastPending) return false;

            return true;
        }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }, [workOrders, equipments, nextMonday, fourWeeksLater, vesselFilter, statusFilter, periodFilter, currentUser, isGlobalViewer]);

    const formatBr = (dateString) => {
        if (!dateString) return '-';
        const [datePart] = dateString.split('T');
        const [y, m, d] = datePart.split('-');
        return `${d}/${m}/${y}`;
    };

    const updateInternStatus = (osId, status, reason = null) => {
        router.put(route('work-orders.intern-status', osId), {
            intern_status: status,
            intern_reason: reason,
            intern_name: currentUser?.nickname || currentUser?.username || currentUser?.name
        }, {
            preserveScroll: true, 
            onSuccess: () => {
                setActiveInput(null);
                setTempReason('');
            }
        });
    };

    const handleConfirmDispatch = (osId, newStatus) => {
        router.put(route('work-orders.update-status', osId), {
            status: newStatus
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDispatchModalOS(null);
            }
        });
    };

    return (
        <div className="flex h-full w-full flex-col">
            <div className="mb-4 flex shrink-0 items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div>
                    <h3 className="text-sm font-bold text-blue-400">Planejamento das Próximas 4 Semanas</h3>
                    <p className="text-xs text-slate-300 mt-1">
                        Mostrando OS agendadas entre <span className="font-semibold text-white">{formatBr(nextMonday.toISOString())}</span> e <span className="font-semibold text-white">{formatBr(fourWeeksLater.toISOString())}</span> (e atrasadas)
                    </p>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span> Pendente de Checagem</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span> Aguardando Validação</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Pronta p/ Disparo</div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-700 bg-slate-900 custom-scrollbar">
                <table className="min-w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur border-b border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-4 py-3">Prazo</th>
                            <th className="px-4 py-3">OS</th>
                            <th className="px-4 py-3">SS</th>
                            <th className="px-4 py-3">Data Prevista</th>
                            <th className="px-4 py-3">Emb.</th>
                            <th className="px-4 py-3">Equipamento</th>
                            <th className="px-4 py-3">Descrição do Serviço</th>
                            <th className="px-4 py-3 text-center">Tipo</th>
                            <th className="px-4 py-3 text-center">Prioridade</th>
                            <th className="px-4 py-3 text-center">Periodicidade</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 w-80 text-center">Ação / Status de Aprovação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {futureWorkOrders.length === 0 ? (
                            <tr>
                                <td colSpan="11" className="px-4 py-8 text-center text-sm italic text-slate-500">
                                    Nenhuma OS programada para sua visualização nas próximas 4 semanas.
                                </td>
                            </tr>
                        ) : (
                            futureWorkOrders.map(os => {
                                const eq = equipments.find(e => e.id === os.equipment_id) || os.equipment;
                                const vesselTag = eq?.vessel?.tag || eq?.vessel?.prefix || '-';
                                const eqName = eq?.name || '-';
                                
                                const currentStatus = os.intern_status || 'pending';

                                const [dPart] = os.created_at.split('T');
                                const [y, m, d] = dPart.split('-');
                                const osDate = new Date(y, m - 1, d, 12, 0, 0);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isDelayed = osDate < today;

                                return (
                                    <tr key={os.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3">
                                            {isDelayed ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500 ring-1 ring-inset ring-red-500/20">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    Atrasada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 ring-1 ring-inset ring-slate-600">
                                                    <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    No Prazo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-blue-400 font-bold">{os.os_number || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-slate-400 font-bold">{os.ss_number || '-'}</td>
                                        <td className="px-4 py-3 text-slate-300 font-medium">{formatBr(os.created_at)}</td>
                                        <td className="px-4 py-3 font-bold text-white">{vesselTag}</td>
                                        <td className="px-4 py-3 text-slate-300 truncate max-w-[150px]">{eqName}</td>
                                        <td className="px-4 py-3 text-slate-400 max-w-[250px] truncate" title={os.description}>{os.description}</td>
                                        <td className="px-4 py-3 text-center text-slate-300">{os.maintenance_type === 'corrective' ? 'CORR' : os.maintenance_type === 'preventive' ? 'PREV' : 'PRED'}</td>
                                        <td className="px-4 py-3 text-center">{renderPriorityBadge(os.priority)}</td>
                                        <td className="px-4 py-3 text-center">{renderPeriodicityBadge(os.periodicity)}</td>
                                        <td className="px-4 py-3 text-center">{renderStatusBadge(os.status)}</td>
                                        
                                        <td className="px-4 py-3 text-center">
                                            {(!isGlobalViewer || isEstagiario) && (
                                                <>
                                                    {currentStatus === 'pending' && activeInput !== os.id && (
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button 
                                                                onClick={() => { setActiveInput(os.id); setTempReason(''); }} 
                                                                className="flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-1.5 text-[10px] font-bold uppercase text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-700 transition-colors"
                                                            >
                                                                <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                Aguardar
                                                            </button>

                                                            <button 
                                                                onClick={() => updateInternStatus(os.id, 'approved')} 
                                                                className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-5 py-1.5 text-[10px] font-bold uppercase text-emerald-500 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all duration-200"
                                                            >
                                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                Aprovar
                                                            </button>
                                                        </div>
                                                    )}

                                                    {activeInput === os.id && (
                                                        <div className="flex items-start justify-center gap-2 animate-fade-in whitespace-normal">
                                                            <textarea 
                                                                autoFocus
                                                                value={tempReason}
                                                                onChange={(e) => setTempReason(e.target.value)}
                                                                placeholder="Descreva o motivo do atraso ou falta de material..." 
                                                                rows="2"
                                                                className="w-56 resize-none rounded-md border border-orange-500/50 bg-slate-950 px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 custom-scrollbar leading-relaxed"
                                                            />
                                                            <div className="flex flex-col gap-1.5">
                                                                <button onClick={() => updateInternStatus(os.id, 'waiting', tempReason)} disabled={!tempReason.trim()} className="rounded bg-orange-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-orange-500 disabled:opacity-50 transition-colors">
                                                                    Salvar
                                                                </button>
                                                                <button onClick={() => setActiveInput(null)} className="rounded bg-slate-700 px-3 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-600 transition-colors">
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {currentStatus === 'approved' && (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                            Checado (Aprovada)
                                                        </span>
                                                    )}

                                                    {currentStatus === 'waiting' && (
                                                        <div className="flex flex-col items-center justify-center">
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400 ring-1 ring-inset ring-orange-500/20">
                                                                <svg className="h-3.5 w-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                Aguardando Insumos
                                                            </span>
                                                            <span className="mt-1.5 text-[10px] text-slate-400 truncate max-w-[200px]" title={os.intern_reason}>
                                                                Motivo: {os.intern_reason}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {isGlobalViewer && !isEstagiario && (
                                                <div className="flex items-center justify-center gap-4">
                                                    
                                                    <div className="flex flex-col items-end justify-center min-w-[120px]">
                                                        {currentStatus === 'pending' && <span className="text-[10px] text-slate-500 italic">Ainda não validado</span>}
                                                        
                                                        {currentStatus === 'waiting' && <span className="text-[10px] text-orange-400 font-medium truncate max-w-[150px]" title={os.intern_reason}>Falta: {os.intern_reason}</span>}
                                                        
                                                        {currentStatus === 'approved' && (
                                                            <span className="text-[10px] text-emerald-400 font-medium">
                                                                Validado por: {os.intern_name || 'Estagiário'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => setDispatchModalOS(os)}
                                                        disabled={os.status === 'scheduled' || os.status === 'in_progress'}
                                                        className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-[10px] font-bold uppercase text-white shadow-sm hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        title="Disparar a OS para execução"
                                                    >
                                                        Disparar OS
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                    </button>
                                                </div>
                                            )}

                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <DispatchOSModal 
                isOpen={!!dispatchModalOS} 
                onClose={() => setDispatchModalOS(null)} 
                os={dispatchModalOS} 
                onConfirm={handleConfirmDispatch} 
            />

        </div>
    );
}