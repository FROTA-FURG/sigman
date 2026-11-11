import React, { useState, useMemo } from 'react';
import useEstadoSessao from '@/utils/useEstadoSessao';
import { pdf } from '@react-pdf/renderer';
import { aprovadaPelaGestao, baixarBlob, baixarVariasOsPdf, passaFiltroDeOrigem, quemFez, selosDeOrigem, ultimoEvento } from '../lib/os';
import useSelecaoOs from '../lib/useSelecaoOs';
import PlanningReportPdfTemplate from './PlanningReportPdfTemplate';
import { router } from '@inertiajs/react';
import DispatchOSModal from './DispatchOSModal';
import EditWorkOrderModal from './EditWorkOrderModal';
import InactivateOSModal from './InactivateOSModal';
import WeekPickerModal from './WeekPickerModal';
import { getMonday, formatWeekRange, formatBr as formatBrDate } from '@/utils/weeks';
import { ehCoordenador, ehDevOuTI, ehEngenheiro, ehEstagiario } from '@/utils/roles';

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
    users = [],
    cruisePlans = {},
    vesselFilter,
    statusFilter,
    periodFilter,
    typeFilter,
    planFilter,
    currentUser
}) {
    // Busca e checagem do estagiário: controles próprios desta aba (a barra
    // de Filtros não vale aqui). Ficam na sessão.
    const [busca, setBusca] = useEstadoSessao('sigman.os.planejamento.busca', '');
    const [internStatusFilter, setInternStatusFilter] = useEstadoSessao('sigman.os.planejamento.checagem', ''); // '' | pending | waiting | approved
    // Progresso do "Baixar OS" em lote ({ atual, total }) e do relatório.
    const [baixandoLote, setBaixandoLote] = useState(null);
    const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
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
    const [weeksAhead, setWeeksAhead] = useEstadoSessao('sigman.os.planejamento.semanas', 4);
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

    const isEngenheiro = ehEngenheiro(currentUser);
    const isTI = ehDevOuTI(currentUser);
    const isEstagiario = ehEstagiario(currentUser);
    // Avaliar a OS (aprovar/aguardar/observação): estagiário e gestão --
    // mesma regra de WorkOrderController::canEvaluate. Os demais só veem.
    const podeAvaliar = isEstagiario || isTI || isEngenheiro || ehCoordenador(currentUser);
    
    // Quem responde pela frota inteira agora vem do cadastro do usuário
    // (has_fleet_access), não mais do cargo: um engenheiro pode ser
    // responsável por uma embarcação só. O dev continua vendo tudo.
    const isGlobalViewer = Boolean(currentUser?.has_fleet_access) || isTI;

    // Tudo do período (antes do filtro de checagem): base dos contadores.
    const osDoPeriodo = useMemo(() => {
        return workOrders.filter(os => {

            // 'open' (ainda não disparada) e 'scheduled' (já disparada, mas
            // ainda dá para reabrir/inativar) ficam. Em andamento, concluída e
            // cancelada saem -- vale para todos os perfis, inclusive o
            // estagiário (a execução e as concluídas ele acompanha no Andamento).
            if (os.status === 'in_progress' || os.status === 'completed' || os.status === 'cancelled') return false;

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
            if (!passaFiltroDeOrigem(os, planFilter)) return false;

            const termo = busca.trim().toLowerCase();
            if (termo) {
                const eqBusca = equipments.find(e => e.id === os.equipment_id) || os.equipment || {};
                const casa = [os.os_number, os.ss_number, os.description, eqBusca.tag_number, eqBusca.tag_antigo, eqBusca.name]
                    .some(v => v && String(v).toLowerCase().includes(termo));
                if (!casa) return false;
            }

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
    }, [workOrders, equipments, horizonMode, rollingStart, rollingEnd, rangeStart, rangeEnd, vesselFilter, statusFilter, periodFilter, typeFilter, planFilter, currentUser, isGlobalViewer, busca]);

    // Atrasada = a data prevista já passou (mesma regra da coluna Prazo).
    const estaAtrasada = (os) => {
        const [y, m, d] = (os.created_at || '').substring(0, 10).split('-');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return new Date(y, m - 1, d, 12, 0, 0) < hoje;
    };
    const pendente = (os) => (os.intern_status || 'pending') === 'pending';
    const qtdPendentes = osDoPeriodo.filter(pendente).length;
    const qtdAtrasadasPendentes = osDoPeriodo.filter(os => pendente(os) && estaAtrasada(os)).length;

    const futureWorkOrders = useMemo(() => osDoPeriodo.filter(os => {
        if (!internStatusFilter) return true;
        if (internStatusFilter === 'atrasada_pendente') return pendente(os) && estaAtrasada(os);
        return (os.intern_status || 'pending') === internStatusFilter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [osDoPeriodo, internStatusFilter]);

    const alternarFiltroChecagem = (valor) => setInternStatusFilter(f => (f === valor ? '' : valor));

    // Disparar e reprogramar: gestão e estagiário (o servidor confere a embarcação
    // e o histórico registra quem fez).
    const podeDisparar = isEstagiario || isTI || isEngenheiro || ehCoordenador(currentUser);

    // O modal recebe a versão mais recente da OS (lançar uma atividade recarrega a lista).
    const osEmEdicao = osToEdit ? (workOrders.find(o => o.id === osToEdit.id) ?? osToEdit) : null;

    const selecao = useSelecaoOs(futureWorkOrders);
    const qtdSelecionadas = selecao.selecionados.length;

    // Uma OS por arquivo, na ordem da tabela.
    const baixarSelecionadas = async () => {
        if (baixandoLote) return;
        try {
            await baixarVariasOsPdf(selecao.selecionadasEm(workOrders), (atual, total) => setBaixandoLote({ atual, total }));
        } finally {
            setBaixandoLote(null);
        }
    };

    // Um PDF só, com atrasadas em destaque e o período planejado.
    const exportarRelatorio = async () => {
        if (gerandoRelatorio) return;
        setGerandoRelatorio(true);
        try {
            const inicio = horizonMode === 'range' ? rangeStart : rollingStart;
            const fim = horizonMode === 'range' ? rangeEnd : rollingEnd;
            const blob = await pdf(
                <PlanningReportPdfTemplate
                    workOrders={selecao.selecionadasEm(workOrders)}
                    inicio={inicio}
                    fim={fim}
                    incluiAtrasadas={horizonMode === 'rolling'}
                />
            ).toBlob();
            baixarBlob(blob, 'SIGMAN_Relatorio_Planejamento.pdf');
        } finally {
            setGerandoRelatorio(false);
        }
    };

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

    const [erroDisparo, setErroDisparo] = useState(null);
    const handleConfirmDispatch = (osId, newStatus, justificativa = '') => {
        router.put(route('work-orders.update-status', osId), {
            status: newStatus,
            justificativa,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDispatchModalOS(null);
                setErroDisparo(null);
            },
            onError: (e) => setErroDisparo(e.justificativa || e.status || 'Não foi possível disparar.'),
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
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span> Pendente de checagem</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span> Aguardando (falta algo)</div>
                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Checada · pronta p/ disparo</div>
                </div>
            </div>

            <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
                <div className="relative w-full max-w-sm">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por número da OS, TAG, equipamento ou descrição..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={internStatusFilter}
                    onChange={(e) => setInternStatusFilter(e.target.value)}
                    className={`rounded-lg border bg-slate-950 py-1.5 pl-2.5 pr-8 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${internStatusFilter ? 'border-blue-500/60 text-blue-200' : 'border-slate-700 text-slate-300'}`}
                >
                    <option value="">Toda checagem do estagiário</option>
                    <option value="pending">Pendente de Checagem</option>
                    <option value="waiting">Aguardando</option>
                    <option value="approved">Checadas (prontas p/ disparo)</option>
                    <option value="atrasada_pendente">Atrasadas e ainda pendentes</option>
                </select>
                {(busca || internStatusFilter) && (
                    <button type="button" onClick={() => { setBusca(''); setInternStatusFilter(''); }} className="text-[11px] font-semibold text-slate-400 hover:text-white">Limpar</button>
                )}
                {/* Contadores da checagem: clicar filtra (de novo, tira o filtro). */}
                <button
                    type="button"
                    onClick={() => alternarFiltroChecagem('pending')}
                    className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors ${internStatusFilter === 'pending' ? 'bg-slate-600 text-white ring-slate-400' : 'bg-slate-800 text-slate-300 ring-slate-600 hover:bg-slate-700'}`}
                    title="Mostrar só as pendentes de checagem"
                >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span className="tabular-nums text-white">{qtdPendentes}</span> {qtdPendentes === 1 ? 'pendente' : 'pendentes'} de checagem
                </button>
                {qtdAtrasadasPendentes > 0 && (
                    <button
                        type="button"
                        onClick={() => alternarFiltroChecagem('atrasada_pendente')}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors ${internStatusFilter === 'atrasada_pendente' ? 'bg-red-600 text-white ring-red-400' : 'bg-red-500/10 text-red-300 ring-red-500/40 hover:bg-red-500/20'}`}
                        title="Mostrar só as atrasadas que ainda não foram checadas"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span className="tabular-nums">{qtdAtrasadasPendentes}</span> {qtdAtrasadasPendentes === 1 ? 'atrasada e pendente' : 'atrasadas e pendentes'}
                    </button>
                )}
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-inset ring-slate-700">
                    <span className="tabular-nums text-white">{futureWorkOrders.length}</span> {futureWorkOrders.length === 1 ? 'ordem de serviço' : 'ordens de serviço'}
                    {qtdSelecionadas > 0 && <span className="text-blue-300"> · {qtdSelecionadas} selecionada{qtdSelecionadas === 1 ? '' : 's'}</span>}
                </span>
                {qtdSelecionadas > 0 && (
                    <>
                        <button
                            onClick={baixarSelecionadas}
                            disabled={Boolean(baixandoLote)}
                            title="Baixa um PDF para cada OS selecionada"
                            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500 transition-colors disabled:cursor-wait disabled:opacity-70"
                        >
                            <svg className={`w-4 h-4 ${baixandoLote ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {baixandoLote ? `Baixando ${baixandoLote.atual} de ${baixandoLote.total}...` : `Baixar OS (${qtdSelecionadas})`}
                        </button>
                        <button
                            onClick={exportarRelatorio}
                            disabled={gerandoRelatorio}
                            title="Um PDF com as OS selecionadas: atrasadas em destaque, semana prevista de cada uma e checagem pendente"
                            className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition-colors disabled:cursor-wait disabled:opacity-70"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {gerandoRelatorio ? 'Gerando relatório...' : `Exportar Relatório (${qtdSelecionadas})`}
                        </button>
                    </>
                )}
            </div>

            {qtdAtrasadasPendentes > 0 && internStatusFilter !== 'atrasada_pendente' && (
                <div className="mb-2 flex shrink-0 items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                    <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>
                        <strong className="font-bold">{qtdAtrasadasPendentes} {qtdAtrasadasPendentes === 1 ? 'OS já passou' : 'OS já passaram'} da data prevista</strong> e ainda {qtdAtrasadasPendentes === 1 ? 'está pendente' : 'estão pendentes'} de checagem.
                    </span>
                    <button type="button" onClick={() => setInternStatusFilter('atrasada_pendente')} className="ml-auto rounded-md bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-500">Ver só elas</button>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-700 bg-slate-900 custom-scrollbar">
                <table className="min-w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur border-b border-slate-700 text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="w-8 px-2 py-2 text-center" title="Selecionar todas (Shift+clique nas linhas seleciona um trecho)">
                                <input type="checkbox" checked={selecao.todosMarcados} onChange={selecao.alternarTodos} className="h-3 w-3 cursor-pointer rounded border-slate-500 bg-slate-900 text-blue-500 focus:ring-blue-500" />
                            </th>
                            <th className="w-10 px-1 py-2 text-center">Prazo</th>
                            <th className="px-2 py-2">OS</th>
                            <th className="px-2 py-2">SS</th>
                            <th className="px-2 py-2">Data</th>
                            <th className="px-2 py-2">Emb.</th>
                            <th className="px-2 py-2">Equipamento</th>
                            <th className="px-2 py-2">Descrição</th>
                            <th className="px-2 py-2 text-center">Tipo</th>
                            <th className="px-2 py-2 text-center">Prioridade</th>
                            <th className="px-2 py-2 text-center">Periodicidade</th>
                            <th className="px-2 py-2 text-center">Status</th>
                            <th className="px-2 py-2 text-center">Checagem / Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {futureWorkOrders.length === 0 ? (
                            <tr>
                                <td colSpan="13" className="px-4 py-8 text-center text-sm italic text-slate-500">
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
                                    <tr
                                        key={os.id}
                                        onClick={() => setOsToEdit(os)}
                                        className={`cursor-pointer transition-colors ${selecao.selecionados.includes(os.id) ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
                                        title="Clique para abrir a OS"
                                    >
                                        <td
                                            className="cursor-pointer select-none px-2 py-2 text-center"
                                            title="Shift+clique seleciona o trecho desde a última marcada"
                                            onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                                            onClick={(e) => selecao.alternar(e, os.id)}
                                        >
                                            <input type="checkbox" checked={selecao.selecionados.includes(os.id)} readOnly className="pointer-events-none h-3 w-3 rounded border-slate-500 bg-slate-900 text-blue-500 focus:ring-blue-500" />
                                        </td>
                                        <td className="px-1 py-2 text-center">
                                            {/* Só o símbolo (o texto fica na dica): ocupa pouco espaço. */}
                                            {isDelayed ? (
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-1 ring-inset ring-red-500/30" title={`Atrasada: prevista para ${formatBr(os.created_at)}`}>
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </span>
                                            ) : (
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-blue-400 ring-1 ring-inset ring-slate-600" title="No prazo">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 font-mono text-blue-400 font-bold">
                                            {os.os_number || '-'}
                                            {selosDeOrigem(os).map(selo => (
                                                <span key={selo.rot} title={selo.titulo} className={`ml-1 rounded px-1 py-px align-middle font-sans text-[8px] font-bold ring-1 ring-inset ${selo.cls}`}>{selo.rot}</span>
                                            ))}
                                        </td>
                                        <td className="px-2 py-2 font-mono text-slate-400 font-bold">{os.ss_number || '-'}</td>
                                        <td className="px-2 py-2 text-slate-300 font-medium">{formatBr(os.created_at)}</td>
                                        <td className="px-2 py-2 font-bold text-white">{vesselTag}</td>
                                        <td className="px-2 py-2 text-slate-300 truncate max-w-[130px]" title={eqName}>{eqName}</td>
                                        <td className="px-2 py-2 text-slate-400 max-w-[200px] truncate" title={os.description}>{os.description}</td>
                                        <td className="px-2 py-2 text-center text-slate-300">{os.maintenance_type === 'corrective' ? 'CORR' : os.maintenance_type === 'preventive' ? 'PREV' : 'PRED'}</td>
                                        <td className="px-2 py-2 text-center">{renderPriorityBadge(os.priority)}</td>
                                        <td className="px-2 py-2 text-center">{renderPeriodicityBadge(os.periodicity)}</td>
                                        <td className="px-2 py-2 text-center">{renderStatusBadge(os.status)}</td>
                                        
                                        {/* Botões e campos de checagem: clicar aqui não abre a OS. */}
                                        <td className="cursor-default px-2 py-2 text-center" onClick={(e) => e.stopPropagation()} title="">
                                            {(() => {
                                                const disparo = ultimoEvento(os, 'disparo');
                                                // Checagem com botões: gestão sempre; estagiário até a gestão
                                                // aprovar -- depois disso só a gestão desfaz (o servidor confere).
                                                const ehGestao = isTI || isEngenheiro || ehCoordenador(currentUser);
                                                const travadaPelaGestao = aprovadaPelaGestao(os);
                                                const interativo = podeAvaliar && (ehGestao || !travadaPelaGestao);
                                                // Botões só com ícone; o texto aparece na caixa ao passar o cursor (StyledTooltips da página).
                                                const btn = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors';
                                                const voltarPendente = (
                                                    <button
                                                        key="pendente"
                                                        onClick={() => updateInternStatus(os.id, 'pending', os.intern_reason)}
                                                        className={`${btn} bg-slate-800 text-slate-400 ring-slate-600 hover:bg-slate-700 hover:text-white`}
                                                        title="Voltar a checagem para pendente (fica no histórico)"
                                                        aria-label="Voltar para pendente"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l5-5m-5 5l5 5" /></svg>
                                                    </button>
                                                );
                                                const aprovar = (
                                                    <button
                                                        key="aprovar"
                                                        onClick={() => updateInternStatus(os.id, 'approved', os.intern_reason)}
                                                        className={`${btn} bg-emerald-500/10 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500 hover:text-white`}
                                                        title="Aprovar: OS checada e pronta para disparo"
                                                        aria-label="Aprovar"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                );
                                                const aguardar = (
                                                    <button
                                                        key="aguardar"
                                                        onClick={() => { setActiveInput(os.id); setTempReason(os.intern_reason || ''); setReasonTargetStatus('waiting'); }}
                                                        className={`${btn} bg-orange-500/10 text-orange-400 ring-orange-500/30 hover:bg-orange-500 hover:text-white`}
                                                        title="Aguardar: falta algo para executar (pede o motivo)"
                                                        aria-label="Aguardar"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </button>
                                                );

                                                return (
                                                    <div className="flex flex-col items-center gap-1">
                                                        {/* Quem aprovou (engenheiro) e quem disparou -- vem do histórico. */}
                                                        {(os.approved_at || disparo) && (
                                                            <div className="flex flex-wrap justify-center gap-x-3 text-[9px] font-semibold uppercase tracking-wide">
                                                                {os.approved_at && (
                                                                    <span className="text-emerald-400" title={`Aprovada em ${formatBr(os.approved_at)}`}>
                                                                        ✓ Aprovada por {os.approver?.nickname || os.approver?.username || 'Engenheiro'}
                                                                    </span>
                                                                )}
                                                                {disparo && (
                                                                    <span className="text-blue-300" title={new Date(disparo.created_at).toLocaleString('pt-BR')}>
                                                                        Disparada por {quemFez(disparo)}
                                                                    </span>
                                                                )}
                                                            </div>
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
                                                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                                {/* Situação da checagem (cores da legenda) */}
                                                                {currentStatus === 'pending' && (
                                                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                        <span className="h-2 w-2 rounded-full bg-slate-500" />
                                                                        Pendente de checagem
                                                                    </span>
                                                                )}
                                                                {currentStatus === 'waiting' && (
                                                                    <span className="flex flex-col items-center">
                                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-400 ring-1 ring-inset ring-orange-500/20">
                                                                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                                                                            Aguardando
                                                                        </span>
                                                                        {os.intern_reason && <span className="mt-0.5 max-w-[180px] truncate text-[10px] text-slate-400" title={os.intern_reason}>Falta: {os.intern_reason}</span>}
                                                                    </span>
                                                                )}
                                                                {currentStatus === 'approved' && (
                                                                    <span className="flex flex-col items-center">
                                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                                                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                                            Checada · pronta p/ disparo
                                                                        </span>
                                                                        <span className="mt-0.5 text-[9px] text-slate-500">por {os.intern_name || 'Estagiário'}</span>
                                                                    </span>
                                                                )}

                                                            </div>
                                                        )}

                                                        {/* Uma linha só de botões: checagem (uma OS por vez, sem aprovação
                                                            em lote) + disparar/reprogramar (gestão e estagiário; fica no histórico). */}
                                                        {(podeDisparar || interativo) && activeInput !== os.id && (
                                                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                                {!interativo && podeAvaliar && travadaPelaGestao && (
                                                                    <span
                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400 ring-1 ring-inset ring-slate-600"
                                                                        title="Aprovada pela engenharia: só o engenheiro ou a coordenação podem mudar a checagem"
                                                                    >
                                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                    </span>
                                                                )}
                                                                {interativo && currentStatus === 'pending' && [aguardar, aprovar]}
                                                                {interativo && currentStatus === 'waiting' && [aprovar, voltarPendente]}
                                                                {interativo && currentStatus === 'approved' && voltarPendente}
                                                                {podeDisparar && <>
                                                                <button
                                                                    onClick={() => setDispatchModalOS(os)}
                                                                    disabled={os.status === 'in_progress'}
                                                                    className="flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-bold uppercase text-white shadow-sm hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                    title={os.status === 'scheduled'
                                                                        ? 'Já agendada: dá para antecipar para Em Andamento'
                                                                        : currentStatus === 'waiting'
                                                                            ? 'Checagem em Aguardando: dá para disparar mesmo assim, escrevendo o motivo'
                                                                            : 'Disparar a OS para execução'}
                                                                >
                                                                    Disparar
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                                </button>
                                                                {/* Só OS do plano (com periodicidade) tem "próxima ocorrência" pra reprogramar. */}
                                                                {os.periodicity && (
                                                                    <button
                                                                        onClick={() => setOsToInactivate(os)}
                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-500/60 bg-orange-500/10 text-orange-300 transition-colors hover:border-orange-500 hover:bg-orange-500 hover:text-white"
                                                                        title="Reprogramar: inativar ou reprogramar esta ocorrência"
                                                                        aria-label="Reprogramar"
                                                                    >
                                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                                    </button>
                                                                )}
                                                                </>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

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
                onClose={() => { setDispatchModalOS(null); setErroDisparo(null); }}
                os={dispatchModalOS} 
                onConfirm={handleConfirmDispatch}
                erro={erroDisparo}
            />

            <EditWorkOrderModal
                isOpen={!!osToEdit}
                onClose={() => setOsToEdit(null)}
                osData={osEmEdicao}
                equipments={equipments}
                users={users}
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
                cruisePeriods={vesselFilter ? (cruisePlans[vesselFilter] || []) : []}
            />

        </div>
    );
}