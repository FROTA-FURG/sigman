import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import DispatchOSModal from './DispatchOSModal';
import EditWorkOrderModal from './EditWorkOrderModal';
import InactivateOSModal from './InactivateOSModal';
import WeekPickerModal from './WeekPickerModal';
import { getMonday, formatWeekRange, formatBr as formatBrDate } from '@/utils/weeks';

const renderPeriodicityBadge = (period) => {
    switch (period) {
        case 'docking': return <span className="text-slate-300 font-semibold uppercase">Docagem</span>;
        case 'daily': return <span className="text-pink-400 font-semibold uppercase">Diário</span>;
        case 'weekly': return <span className="text-cyan-400 font-semibold uppercase">Semanal</span>;
        case 'biweekly': return <span className="text-teal-400 font-semibold uppercase">Quinzenal</span>;
        case 'monthly': return <span className="text-lime-600 font-semibold uppercase">Mensal</span>;
        case 'bimonthly': return <span className="text-blue-500 font-semibold uppercase">Bimestral</span>; 
        case 'quarterly': return <span className="text-green-400 font-semibold uppercase">Trimestral</span>; 
        case 'semiannual': return <span className="text-orange-500 font-semibold uppercase">Semestral</span>; 
        case 'annual': return <span className="text-red-600 font-semibold uppercase">Anual</span>;
        case 'biennial': return <span className="text-purple-400 font-semibold uppercase">Bianual</span>;
        case 'triennial': return <span className="text-indigo-400 font-semibold uppercase">Trianual</span>;
        case 'quadrennial': return <span className="text-violet-400 font-semibold uppercase">Quadrienal</span>;
        case 'sexennial': return <span className="text-fuchsia-400 font-semibold uppercase">Sexênio</span>;
        default: return <span className="text-slate-500 font-medium uppercase">Avulsa</span>;
    }
};

const renderStatusBadge = (status, isInactive = false) => {
    // Uma OS inativada tecnicamente está com status='cancelled' por baixo
    // (é assim que ela sai das métricas), mas pra quem olha a tela isso é
    // bem diferente de um cancelamento comum -- foi reprogramada, não
    // esquecida.
    if (isInactive) return <span className="text-orange-400 font-semibold uppercase">Inativada</span>;

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
    typeFilter,
    planFilter,
    internStatusFilter,
    currentUser
}) {
    const [activeInput, setActiveInput] = useState(null);
    const [tempReason, setTempReason] = useState('');
    // Status a aplicar quando salvar o texto: 'waiting' quando veio do botão
    // "Aguardar" (muda o status), ou o status atual quando veio do lápis de
    // observação sempre disponível (só atualiza o texto, sem mudar status).
    const [reasonTargetStatus, setReasonTargetStatus] = useState(null);
    const [dispatchModalOS, setDispatchModalOS] = useState(null);
    const [osToEdit, setOsToEdit] = useState(null);
    const [osToInactivate, setOsToInactivate] = useState(null);

    // 'rolling'  -> "próximas N semanas" a partir de hoje (padrão, N ajustável)
    // 'range'    -> intervalo explícito escolhido no calendário (ex.: semana 32 à 35)
    const [horizonMode, setHorizonMode] = useState('rolling');
    const [weeksAhead, setWeeksAhead] = useState(4);
    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);

    const { rollingStart, rollingEnd } = useMemo(() => {
        const startNext = getMonday(new Date());
        startNext.setDate(startNext.getDate() + 7); // sempre a partir da segunda da semana que vem

        const semanas = Math.max(1, Number(weeksAhead) || 1);
        const endFuture = new Date(startNext);
        endFuture.setDate(startNext.getDate() + semanas * 7 - 1);
        endFuture.setHours(23, 59, 59, 999);

        return { rollingStart: startNext, rollingEnd: endFuture };
    }, [weeksAhead]);

    const abrirSeletorDeSemanas = () => setIsWeekPickerOpen(true);

    const aplicarIntervalo = (start, end) => {
        setRangeStart(start);
        setRangeEnd(end);
        setHorizonMode('range');
        setIsWeekPickerOpen(false);
    };

    const voltarParaProximasSemanas = () => {
        setHorizonMode('rolling');
        setRangeStart(null);
        setRangeEnd(null);
    };

    const roleName = String(currentUser?.role?.name || currentUser?.role || '').toLowerCase();
    const isEngenheiro = roleName.includes('engineer') || roleName.includes('engenheir');
    const isTI = roleName.includes('developer') || roleName.includes('desenvolvedor') || roleName.includes('ti') || roleName.includes('admin');
    const isEstagiario = roleName.includes('intern') || roleName.includes('estagiari');
    
    // Quem responde pela frota inteira agora vem do cadastro do usuário
    // (has_fleet_access), não mais do cargo: um engenheiro pode ser
    // responsável por uma embarcação só. O dev continua vendo tudo.
    const isGlobalViewer = Boolean(currentUser?.has_fleet_access) || isTI;

    const futureWorkOrders = useMemo(() => {
        return workOrders.filter(os => {

            if (isEstagiario) {
                // Pro estagiário, a OS só sai do planejamento dele quando
                // alguém começou a executar (in_progress) ou ela foi
                // cancelada -- continua vendo mesmo já 'completed', porque
                // o que importa pra ele é acompanhar até esse ponto.
                if (os.status === 'in_progress' || os.status === 'cancelled') return false;
            } else {
                // 'open' (ainda não disparada) e 'scheduled' (já disparada,
                // mas o engenheiro pode precisar reabrir/inativar de novo)
                // ficam. 'in_progress' sai -- completed/cancelled também,
                // senão a tabela enche de OS antigas do plano.
                if (os.status === 'in_progress' || os.status === 'completed' || os.status === 'cancelled') return false;
            }

            const eq = equipments.find(e => e.id === os.equipment_id) || os.equipment;
            const vesselTag = eq?.vessel?.tag || eq?.vessel?.prefix;
            const eqVesselId = eq?.vessel_id || eq?.vessel?.id;
            
            if (!isGlobalViewer) {
                const userVesselId = currentUser?.vessel_id;

                // Sem embarcação e sem acesso à frota = não responde por
                // nenhuma OS. Antes o filtro era pulado quando vessel_id era
                // nulo, e "sem embarcação" acabava enxergando tudo.
                if (!userVesselId) return false;

                if (String(eqVesselId) !== String(userVesselId)) return false;
            }

            if (vesselFilter && vesselTag !== vesselFilter) return false;
            if (statusFilter && os.status !== statusFilter) return false;
            if (periodFilter && os.periodicity !== periodFilter) return false;
            if (typeFilter && os.maintenance_type !== typeFilter) return false;
            if (planFilter && Boolean(os.in_52_week_plan) !== (planFilter === 'yes')) return false;
            if (internStatusFilter && (os.intern_status || 'pending') !== internStatusFilter) return false;

            if (!os.created_at) return false;
            const [datePart] = os.created_at.split('T');
            const [year, month, day] = datePart.split('-');
            const osDate = new Date(year, month - 1, day, 12, 0, 0);

            if (horizonMode === 'range') {
                // Intervalo explícito escolhido no calendário: só o que está
                // dentro dele -- ao contrário do modo "próximas semanas",
                // aqui não entra automaticamente tudo que está atrasado.
                if (!rangeStart || !rangeEnd) return false;
                if (osDate < rangeStart || osDate > rangeEnd) return false;
            } else {
                const isFuture = osDate >= rollingStart && osDate <= rollingEnd;
                const isPastPending = osDate < rollingStart;
                if (!isFuture && !isPastPending) return false;
            }

            return true;
        }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }, [workOrders, equipments, horizonMode, rollingStart, rollingEnd, rangeStart, rangeEnd, vesselFilter, statusFilter, periodFilter, typeFilter, planFilter, internStatusFilter, currentUser, isGlobalViewer, isEstagiario]);

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
            <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div>
                    {horizonMode === 'rolling' ? (
                        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-blue-400">
                            Planejamento das Próximas
                            <input
                                type="number"
                                min="1"
                                max="52"
                                value={weeksAhead}
                                onChange={(e) => setWeeksAhead(e.target.value === '' ? '' : Math.max(1, Math.min(52, Number(e.target.value))))}
                                onBlur={() => setWeeksAhead((v) => (v === '' ? 4 : v))}
                                className="w-14 rounded-md border border-blue-500/40 bg-slate-950 px-2 py-1 text-center text-sm font-bold text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            Semanas
                        </h3>
                    ) : (
                        <h3 className="text-sm font-bold text-blue-400">
                            Planejamento: {formatWeekRange(rangeStart, rangeEnd)}
                        </h3>
                    )}
                    <p className="text-xs text-slate-300 mt-1">
                        {horizonMode === 'rolling' ? (
                            <>Mostrando OS agendadas entre <span className="font-semibold text-white">{formatBrDate(rollingStart)}</span> e <span className="font-semibold text-white">{formatBrDate(rollingEnd)}</span> (e atrasadas)</>
                        ) : (
                            <>Mostrando só o que está dentro do intervalo selecionado -- não inclui atrasadas automaticamente.</>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {horizonMode === 'range' && (
                        <button
                            onClick={voltarParaProximasSemanas}
                            className="rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-bold uppercase text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-700 transition-colors"
                        >
                            Voltar às próximas semanas
                        </button>
                    )}
                    <button
                        onClick={abrirSeletorDeSemanas}
                        className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-bold uppercase text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-700 transition-colors"
                        title="Selecionar um intervalo específico de semanas (ex.: semana 32 à 35)"
                    >
                        <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {horizonMode === 'range' ? 'Alterar semanas' : 'Semanas específicas'}
                    </button>
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
                                <td colSpan="12" className="px-4 py-8 text-center text-sm italic text-slate-500">
                                    {horizonMode === 'rolling'
                                        ? `Nenhuma OS programada para sua visualização nas próximas ${weeksAhead || 4} semanas.`
                                        : 'Nenhuma OS no intervalo de semanas selecionado.'}
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
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    {/* Aprovação do engenheiro: sempre visível quando existir,
                                                        independente do que o estagiário marcou na checagem dele. */}
                                                    {os.approved_at && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-400" title={`Aprovada em ${formatBr(os.approved_at)}`}>
                                                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                            Aprovada por {os.approver?.nickname || os.approver?.username || 'Engenheiro'}
                                                        </span>
                                                    )}

                                                    {activeInput === os.id ? (
                                                        <div className="flex items-start justify-center gap-2 animate-fade-in whitespace-normal">
                                                            <textarea
                                                                autoFocus
                                                                value={tempReason}
                                                                onChange={(e) => setTempReason(e.target.value)}
                                                                placeholder="Escreva uma observação sobre esta OS..."
                                                                rows="2"
                                                                className="w-56 resize-none rounded-md border border-orange-500/50 bg-slate-950 px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 custom-scrollbar leading-relaxed"
                                                            />
                                                            <div className="flex flex-col gap-1.5">
                                                                <button
                                                                    onClick={() => updateInternStatus(os.id, reasonTargetStatus, tempReason)}
                                                                    disabled={reasonTargetStatus === 'waiting' && !tempReason.trim()}
                                                                    className="rounded bg-orange-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-orange-500 disabled:opacity-50 transition-colors"
                                                                >
                                                                    Salvar
                                                                </button>
                                                                <button onClick={() => setActiveInput(null)} className="rounded bg-slate-700 px-3 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-600 transition-colors">
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            {currentStatus === 'pending' && (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => { setActiveInput(os.id); setTempReason(os.intern_reason || ''); setReasonTargetStatus('waiting'); }}
                                                                        className="flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-1.5 text-[10px] font-bold uppercase text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-700 transition-colors"
                                                                    >
                                                                        <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                        Aguardar
                                                                    </button>

                                                                    <button
                                                                        onClick={() => updateInternStatus(os.id, 'approved', os.intern_reason)}
                                                                        className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-5 py-1.5 text-[10px] font-bold uppercase text-emerald-500 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all duration-200"
                                                                    >
                                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                        Aprovar
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {currentStatus === 'waiting' && (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400 ring-1 ring-inset ring-orange-500/20">
                                                                        <svg className="h-3.5 w-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                        Aguardando
                                                                    </span>
                                                                    {os.intern_reason && (
                                                                        <span className="mt-1 max-w-[180px] truncate text-[10px] text-slate-400" title={os.intern_reason}>
                                                                            Motivo: {os.intern_reason}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {currentStatus === 'approved' && (
                                                                // Do lado do estagiário, "aprovado" quer dizer "eu já
                                                                // checei" -- agora é a vez do engenheiro validar/disparar.
                                                                // Cor e texto batem com a legenda do cabeçalho.
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400 ring-1 ring-inset ring-orange-500/20">
                                                                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                                                                    Aguardando Validação
                                                                </span>
                                                            )}

                                                            {/* Sempre disponível, qualquer que seja o status da
                                                                checagem -- só grava o texto, não muda o status. */}
                                                            <button
                                                                onClick={() => { setActiveInput(os.id); setTempReason(os.intern_reason || ''); setReasonTargetStatus(currentStatus); }}
                                                                className={`shrink-0 rounded-full p-1.5 transition-colors hover:bg-slate-700 ${os.intern_reason ? 'text-orange-400 hover:text-orange-300' : 'text-slate-400 hover:text-white'}`}
                                                                title={os.intern_reason ? 'Editar observação (já tem uma)' : 'Escrever observação'}
                                                            >
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isGlobalViewer && !isEstagiario && (
                                                <div className="flex items-center justify-center gap-4">
                                                    
                                                    <div className="flex flex-col items-end justify-center min-w-[120px]">
                                                        {/* Cor e texto batem com a legenda do cabeçalho. */}
                                                        {currentStatus === 'pending' && (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                <span className="h-2 w-2 rounded-full bg-slate-500" />
                                                                Pendente de Checagem
                                                            </span>
                                                        )}

                                                        {currentStatus === 'waiting' && <span className="text-[10px] text-orange-400 font-medium truncate max-w-[150px]" title={os.intern_reason}>Falta: {os.intern_reason}</span>}

                                                        {currentStatus === 'approved' && (
                                                            <>
                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                                    Pronta p/ Disparo
                                                                </span>
                                                                <span className="mt-0.5 text-[9px] text-slate-500">
                                                                    Validado por: {os.intern_name || 'Estagiário'}
                                                                </span>
                                                            </>
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

                                                    <button
                                                        onClick={() => setOsToEdit(os)}
                                                        className={`rounded-full p-1.5 transition-colors hover:bg-slate-700 ${os.engineer_comment ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400 hover:text-white'}`}
                                                        title={os.engineer_comment ? 'Ver OS / editar observação (já tem observação)' : 'Ver OS e deixar observação'}
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>

                                                    {/* Só faz sentido pra OS do plano (com periodicidade) -- uma
                                                        avulsa não tem "próxima ocorrência" pra reprogramar. */}
                                                    {os.periodicity && (
                                                        <button
                                                            onClick={() => setOsToInactivate(os)}
                                                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-orange-400"
                                                            title="Inativar e reprogramar esta ocorrência"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                        </button>
                                                    )}
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

            <EditWorkOrderModal
                isOpen={!!osToEdit}
                onClose={() => setOsToEdit(null)}
                osData={osToEdit}
                equipments={equipments}
                currentUser={currentUser}
            />

            <InactivateOSModal
                isOpen={!!osToInactivate}
                onClose={() => setOsToInactivate(null)}
                os={osToInactivate}
            />

            <WeekPickerModal
                isOpen={isWeekPickerOpen}
                onClose={() => setIsWeekPickerOpen(false)}
                onApply={aplicarIntervalo}
                onClear={voltarParaProximasSemanas}
            />

        </div>
    );
}