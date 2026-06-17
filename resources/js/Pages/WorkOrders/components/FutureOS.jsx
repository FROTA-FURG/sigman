import React, { useState, useMemo } from 'react';

export default function FutureOS({ 
    workOrders = [], 
    equipments = [],
    vesselFilter,
    statusFilter,
    periodFilter
}) {
    const [approvals, setApprovals] = useState({});
    const [tempReason, setTempReason] = useState('');

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
        endFuture.setDate(startNext.getDate() + 28); // +4 semanas
        endFuture.setHours(23, 59, 59, 999);

        return { nextMonday: startNext, fourWeeksLater: endFuture };
    }, []);

    const futureWorkOrders = useMemo(() => {
        return workOrders.filter(os => {
            // 1. Aplicação dos Filtros Globais da Sidebar
            const eq = equipments.find(e => e.id === os.equipment_id) || os.equipment;
            const vesselTag = eq?.vessel?.tag || eq?.vessel?.prefix;
            
            if (vesselFilter && vesselTag !== vesselFilter) return false;
            if (statusFilter && os.status !== statusFilter) return false;
            if (periodFilter && os.periodicity !== periodFilter) return false;

            // 2. Aplicação do Filtro de Data (Fixo para as próximas 4 semanas)
            if (!os.created_at) return false;
            const [datePart] = os.created_at.split('T');
            const [year, month, day] = datePart.split('-');
            const osDate = new Date(year, month - 1, day, 12, 0, 0);
            
            return osDate >= nextMonday && osDate <= fourWeeksLater;
        }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }, [workOrders, equipments, nextMonday, fourWeeksLater, vesselFilter, statusFilter, periodFilter]);

    const formatBr = (dateString) => {
        if (!dateString) return '-';
        const [datePart] = dateString.split('T');
        const [y, m, d] = datePart.split('-');
        return `${d}/${m}/${y}`;
    };

    const handleApprove = (id) => {
        setApprovals(prev => ({ ...prev, [id]: { state: 'approved', reason: '' } }));
    };

    const handleWaitClick = (id) => {
        setTempReason('');
        setApprovals(prev => ({ ...prev, [id]: { state: 'input_reason', reason: '' } }));
    };

    const handleSaveReason = (id) => {
        setApprovals(prev => ({ ...prev, [id]: { state: 'waiting', reason: tempReason } }));
        setTempReason('');
    };

    const handleCancelReason = (id) => {
        setApprovals(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
        setTempReason('');
    };

    return (
        <div className="flex h-full w-full flex-col">
            <div className="mb-4 flex shrink-0 items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div>
                    <h3 className="text-sm font-bold text-blue-400">Planejamento das Próximas 4 Semanas</h3>
                    <p className="text-xs text-slate-300 mt-1">
                        Mostrando OS agendadas entre <span className="font-semibold text-white">{formatBr(nextMonday.toISOString())}</span> e <span className="font-semibold text-white">{formatBr(fourWeeksLater.toISOString())}</span>
                    </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Aprovada</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span> Pendente</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span> Aguardando</div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-700 bg-slate-900 custom-scrollbar">
                <table className="min-w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur border-b border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-4 py-3">OS</th>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Emb.</th>
                            <th className="px-4 py-3">TAG</th>
                            <th className="px-4 py-3">Equipamento</th>
                            <th className="px-4 py-3">Descrição do Serviço</th>
                            <th className="px-4 py-3 w-64 text-center">Aprovação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {futureWorkOrders.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-sm italic text-slate-500">
                                    Nenhuma OS programada para as próximas 4 semanas que corresponda aos filtros selecionados.
                                </td>
                            </tr>
                        ) : (
                            futureWorkOrders.map(os => {
                                const eq = equipments.find(e => e.id === os.equipment_id) || os.equipment;
                                const vesselTag = eq?.vessel?.tag || eq?.vessel?.prefix || '-';
                                const eqTag = eq?.tag_number || '-';
                                const eqName = eq?.name || '-';
                                
                                const approval = approvals[os.id] || { state: 'pending', reason: '' };

                                return (
                                    <tr key={os.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-2 font-mono text-blue-400 font-bold">{os.os_number || '-'}</td>
                                        <td className="px-4 py-2 text-slate-300 font-medium">{formatBr(os.created_at)}</td>
                                        <td className="px-4 py-2 font-bold text-white">{vesselTag}</td>
                                        <td className="px-4 py-2 font-mono text-slate-400">{eqTag}</td>
                                        <td className="px-4 py-2 text-slate-300 truncate max-w-[150px]">{eqName}</td>
                                        <td className="px-4 py-2 text-slate-400 truncate max-w-[250px]" title={os.description}>{os.description}</td>
                                        
                                        <td className="px-4 py-2">
                                            {approval.state === 'pending' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleApprove(os.id)} className="rounded bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase text-emerald-500 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
                                                        Aprovar
                                                    </button>
                                                    <button onClick={() => handleWaitClick(os.id)} className="rounded bg-slate-700 px-3 py-1 text-[10px] font-bold uppercase text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-600 transition-colors">
                                                        Aguardar
                                                    </button>
                                                </div>
                                            )}

                                            {approval.state === 'input_reason' && (
                                                <div className="flex items-center justify-center gap-1.5 animate-fade-in">
                                                    <input 
                                                        type="text" 
                                                        autoFocus
                                                        value={tempReason}
                                                        onChange={(e) => setTempReason(e.target.value)}
                                                        placeholder="Motivo do atraso..." 
                                                        className="w-32 rounded border border-orange-500/50 bg-slate-950 px-2 py-1 text-[10px] text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                    />
                                                    <button onClick={() => handleSaveReason(os.id)} disabled={!tempReason.trim()} className="rounded bg-orange-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-orange-500 disabled:opacity-50">
                                                        Salvar
                                                    </button>
                                                    <button onClick={() => handleCancelReason(os.id)} className="rounded bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-600">
                                                        X
                                                    </button>
                                                </div>
                                            )}

                                            {approval.state === 'approved' && (
                                                <div className="flex items-center justify-center">
                                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                        Aprovada
                                                    </span>
                                                </div>
                                            )}

                                            {approval.state === 'waiting' && (
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-400 ring-1 ring-inset ring-orange-500/20">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Aguardando
                                                    </span>
                                                    <span className="mt-1 text-[9px] text-slate-400 truncate max-w-[140px]" title={approval.reason}>
                                                        Motivo: {approval.reason}
                                                    </span>
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
        </div>
    );
}