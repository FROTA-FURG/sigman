import React, { useState, useMemo } from 'react';
import useSelecaoOs from '../lib/useSelecaoOs';
import { pdf } from '@react-pdf/renderer';
import ReportPdfTemplate from './ReportPdfTemplate';
import ExportReportOptionsModal from './ExportReportOptionsModal';
import useEstadoSessao from '@/utils/useEstadoSessao';
import { FILTROS_VAZIOS, baixarBlob, baixarOsPdf, baixarVariasOsPdf, osDoAndamento, selosDeOrigem } from '../lib/os';
import EditWorkOrderModal from './EditWorkOrderModal';
import WorkOrderDetailsModal from './WorkOrderDetailsModal';
import { getISOWeek } from '@/utils/weeks';

export default function WeeklyProgressTable({ 
    workOrders = [], 
    equipments = [], 
    users = [],
    filtros = FILTROS_VAZIOS,
    weekStart,
    weekEnd,
    currentUser
}) {
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedOsId, setSelectedOsId] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [osToEdit, setOsToEdit] = useState(null);

    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    // Progresso do "Baixar OS" em lote: { atual, total } ou null.
    const [baixandoLote, setBaixandoLote] = useState(null);
    const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
    const [opcoesAbertas, setOpcoesAbertas] = useState(false);
    // Última escolha de conteúdo do relatório fica na sessão.
    const [opcoesRelatorio, setOpcoesRelatorio] = useEstadoSessao(
        'sigman.os.relatorio.opcoes',
        { porStatus: true, comConcluidas: true, comHh: true, comAtividades: false },
        (o) => ({ porStatus: true, comConcluidas: true, comHh: true, comAtividades: false, ...o }),
    );
    // Busca e filtros desta aba ficam na sessão (voltar à aba ou de uma OS mantém).
    const [busca, setBusca] = useEstadoSessao('sigman.os.andamento.busca', '');

    const selectedOs = workOrders.find(os => os.id === selectedOsId);
    const workOrderActivities = selectedOs?.activities || [];

    const handleOpenDetailsModal = (id) => { setSelectedOsId(id); setIsDetailsModalOpen(true); };
    const handleRowClick = (os) => { setOsToEdit(os); setIsEditModalOpen(true); };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // Concluídas recolhidas ou não (lembrado na sessão).
    const [concluidasAbertas, setConcluidasAbertas] = useEstadoSessao('sigman.os.andamento.concluidas', true);

    const sortedAndFilteredWorkOrders = useMemo(() => {
        let result = osDoAndamento(workOrders, filtros, weekStart, weekEnd);

        const termo = busca.trim().toLowerCase();
        if (termo) {
            result = result.filter(os =>
                os.os_number?.toLowerCase().includes(termo) ||
                os.description?.toLowerCase().includes(termo) ||
                os.equipment?.tag_number?.toLowerCase().includes(termo) ||
                os.equipment?.tag_antigo?.toLowerCase().includes(termo) ||
                os.equipment?.name?.toLowerCase().includes(termo)
            );
        }

        if (sortConfig.key) {
            result = [...result].sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        // Concluídas sempre no fim, depois de uma divisória.
        return [...result.filter(os => os.status !== 'completed'), ...result.filter(os => os.status === 'completed')];
    }, [workOrders, filtros, sortConfig, weekStart, weekEnd, busca]);

    const qtdConcluidas = sortedAndFilteredWorkOrders.filter(os => os.status === 'completed').length;
    // O que está à vista (seleção "todas" e Shift+clique agem só sobre isso).
    const linhasVisiveis = concluidasAbertas ? sortedAndFilteredWorkOrders : sortedAndFilteredWorkOrders.filter(os => os.status !== 'completed');

    // O modal recebe a versão mais recente da OS (lançar uma atividade recarrega a lista).
    const osEmEdicao = osToEdit ? (workOrders.find(o => o.id === osToEdit.id) ?? osToEdit) : null;

    // Seleção (clique, Shift+clique em trecho, todas) -- mesma do Planejamento.
    const selecao = useSelecaoOs(linhasVisiveis);
    const selectedIds = selecao.selecionados;
    const isAllFilteredSelected = selecao.todosMarcados;
    const toggleSelectAll = selecao.alternarTodos;
    const toggleSelectRow = selecao.alternar;

    const handleExportPDF = (os) => baixarOsPdf(os);

    // Uma OS por arquivo, na mesma ordem em que aparecem na tabela.
    const handleBaixarSelecionadas = async () => {
        if (baixandoLote) return;
        try {
            await baixarVariasOsPdf(selecao.selecionadasEm(workOrders), (atual, total) => setBaixandoLote({ atual, total }));
        } finally {
            setBaixandoLote(null);
        }
    };

    const handleExportReport = async () => {
        if (gerandoRelatorio) return;
        setGerandoRelatorio(true);
        try {
            const blob = await pdf(
                <ReportPdfTemplate
                    workOrders={selecao.selecionadasEm(workOrders)}
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    comHh={opcoesRelatorio.comHh}
                    comAtividades={opcoesRelatorio.comAtividades}
                    porStatus={opcoesRelatorio.porStatus}
                    comConcluidas={opcoesRelatorio.comConcluidas}
                />
            ).toBlob();
            baixarBlob(blob, opcoesRelatorio.comAtividades ? 'SIGMAN_Relatorio_Andamento_Completo.pdf' : 'SIGMAN_Relatorio_Andamento.pdf');
            setOpcoesAbertas(false);
        } finally {
            setGerandoRelatorio(false);
        }
    };

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
        // status='cancelled' por baixo é o que tira a OS inativada das
        // métricas, mas na tela isso é bem diferente de "cancelada de vez".
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

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return (<svg className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>);
        return sortConfig.direction === 'asc' ? (<svg className="w-3 h-3 ml-1 text-blue-400 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>) : (<svg className="w-3 h-3 ml-1 text-blue-400 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>);
    };

    return (
        <div className="flex flex-col h-full w-full relative rounded-lg">
            <EditWorkOrderModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
 osData={osEmEdicao} equipments={equipments} users={users}
                currentUser={currentUser} 
            />
            <ExportReportOptionsModal
                isOpen={opcoesAbertas}
                onClose={() => setOpcoesAbertas(false)}
                quantidade={selectedIds.length}
                opcoes={opcoesRelatorio}
                setOpcoes={setOpcoesRelatorio}
                onGerar={handleExportReport}
                gerando={gerandoRelatorio}
            />

            <WorkOrderDetailsModal 
                isOpen={isDetailsModalOpen} 
                onClose={() => setIsDetailsModalOpen(false)} 
                workOrderId={selectedOsId} 
                osNumber={selectedOs?.os_number} 
                activities={workOrderActivities} 
                users={users}
            />


            <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
                <div className="relative w-full max-w-sm">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por número da OS, descrição ou TAG..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <span className="ml-auto rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-inset ring-slate-700">
                    <span className="tabular-nums text-white">{sortedAndFilteredWorkOrders.length}</span> {sortedAndFilteredWorkOrders.length === 1 ? 'ordem de serviço' : 'ordens de serviço'}
                    {selectedIds.length > 0 && <span className="text-blue-300"> · {selectedIds.length} selecionada{selectedIds.length === 1 ? '' : 's'}</span>}
                </span>
                {selectedIds.length > 0 && (
                    <>
                        <button
                            onClick={handleBaixarSelecionadas}
                            disabled={Boolean(baixandoLote)}
                            title="Baixa um PDF para cada OS selecionada"
                            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500 transition-colors disabled:cursor-wait disabled:opacity-70"
                        >
                            {baixandoLote ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            {baixandoLote ? `Baixando ${baixandoLote.atual} de ${baixandoLote.total}...` : `Baixar OS (${selectedIds.length})`}
                        </button>
                        <button
                            onClick={() => setOpcoesAbertas(true)}
                            disabled={gerandoRelatorio}
                            title="Um PDF com as OS selecionadas: métricas, quadro por embarcação, atrasadas em destaque e atividades de cada OS"
                            className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition-colors disabled:cursor-wait disabled:opacity-70"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {gerandoRelatorio ? 'Gerando relatório...' : `Exportar Relatório (${selectedIds.length})`}
                        </button>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-auto bg-slate-900 border border-slate-600 custom-scrollbar mt-0">
                <table className="min-w-full border-collapse text-left text-[11px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-800 border-b-2 border-slate-600 text-slate-300 uppercase shadow-sm">
                        <tr>
                            <th className="border border-slate-600 px-2 py-1.5 text-center w-8 bg-slate-700/50">
                                <input type="checkbox" checked={isAllFilteredSelected} onChange={toggleSelectAll} className="rounded border-slate-500 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer h-3 w-3" />
                            </th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Prazo</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold cursor-pointer hover:bg-slate-700 select-none text-center" onClick={() => handleSort('os_number')}>OS <SortIcon columnKey="os_number" /></th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold cursor-pointer hover:bg-slate-700 select-none text-center" onClick={() => handleSort('ss_number')}>SS <SortIcon columnKey="ss_number" /></th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold cursor-pointer hover:bg-slate-700 select-none text-center" onClick={() => handleSort('created_at')}>Data<SortIcon columnKey="created_at" /></th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Emb.</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold">TAG</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold">Equipamento</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold">Descrição</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Tipo</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Prioridade</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Periodicidade</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Status</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredWorkOrders.length === 0 ? (
                            <tr>
                                <td colSpan="14" className="border border-slate-700 px-2 py-4 text-center text-slate-500 bg-slate-900">
                                    {busca.trim()
                                        ? `Nenhuma OS encontrada para "${busca}".`
                                        : weekStart ? "Nenhuma OS encontrada para a semana e filtros selecionados." : "Nenhum registro encontrado."}
                                </td>
                            </tr>
                        ) : (
                            linhasVisiveis.flatMap((os, idx) => {
                                // Divisória antes da 1ª concluída (com a seção recolhida, ela fica sozinha no fim).
                                const divisoria = os.status === 'completed' && (idx === 0 || linhasVisiveis[idx - 1].status !== 'completed');
                                return [divisoria && divisoriaConcluidas(), linhaDaOs(os)];
                            }).concat(!concluidasAbertas && qtdConcluidas > 0 ? [divisoriaConcluidas()] : [])
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    function linhaDaOs(os) {
                                const equip = os.equipment || {};
                                const vessel = equip.vessel || {};
                                const isSelected = selectedIds.includes(os.id);

                                // Lógica de verificação do Atraso
                                const [dPart] = (os.created_at || '').split('T');
                                const [y, m, d] = (dPart || '').split('-');
                                const osDate = new Date(y, m - 1, d, 12, 0, 0);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                // Só consideramos atrasada se a data passou E a OS não foi concluída/cancelada
                                const isDelayed = osDate < today && os.status !== 'completed' && os.status !== 'cancelled';
                                
                                return (
                                    <tr 
                                        key={os.id} 
                                        onClick={() => handleRowClick(os)} 
                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/30' : 'bg-slate-900 even:bg-slate-800/50 hover:bg-slate-700/50'}`}
                                    >
                                        <td
                                            className="cursor-pointer select-none border border-slate-700 px-2 py-1 text-center"
                                            title="Shift+clique seleciona o trecho desde a última marcada"
                                            onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                                            onClick={(e) => toggleSelectRow(e, os.id)}
                                        >
                                            <input type="checkbox" checked={isSelected} readOnly className="pointer-events-none rounded border-slate-500 bg-slate-900 text-blue-500 focus:ring-blue-500 h-3 w-3" />
                                        </td>
                                        <td className="border border-slate-700 px-2 py-1 text-center">
                                            {isDelayed ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-red-500 ring-1 ring-inset ring-red-500/20">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300 ring-1 ring-inset ring-slate-600">
                                                    <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </span>
                                            )}
                                        </td>
                                        <td className="border border-slate-700 px-2 py-1 font-mono text-blue-300 text-center">
                                            {os.os_number || '-'}
                                            {selosDeOrigem(os).map(selo => (
                                                <span key={selo.rot} title={selo.titulo} className={`ml-1 rounded px-1 py-px align-middle font-sans text-[8px] font-bold ring-1 ring-inset ${selo.cls}`}>{selo.rot}</span>
                                            ))}
                                        </td>
                                        <td className="border border-slate-700 px-2 py-1 font-mono text-emerald-300 text-center">{os.ss_number || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-slate-300 text-center">
                                            {os.created_at ? (
                                                <div className="flex flex-col leading-tight">
                                                    <span>{os.created_at.substring(0, 10).split('-').reverse().join('/')}</span>
                                                    {/* O plano é mapeado por semana do ano — SEM 32, SEM 33... */}
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Sem {getISOWeek(osDate)}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="border border-slate-700 px-2 py-1 font-bold text-white text-center">{vessel.tag || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 font-mono text-slate-400" title={equip.tag_antigo ? `TAG antiga: ${equip.tag_antigo}` : undefined}>{equip.tag_number || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-slate-300 max-w-[150px] truncate" title={equip.name}>{equip.name || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-slate-400 max-w-[250px] truncate" title={os.description}>{os.description}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center text-slate-300">{os.maintenance_type === 'corrective' ? 'CORR' : os.maintenance_type === 'preventive' ? 'PREV' : 'PRED'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center bg-slate-950/20">{renderPriorityBadge(os.priority)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center bg-slate-950/20">{renderPeriodicityBadge(os.periodicity)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center bg-slate-950/20">{renderStatusBadge(os.status, os.is_inactive)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleExportPDF(os); }} className="text-slate-400 hover:text-emerald-400 transition-colors" title="Baixar o PDF desta OS">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenDetailsModal(os.id); }} className="text-slate-400 hover:text-blue-400 transition-colors" title="Ver Atividades">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
    }

    function divisoriaConcluidas() {
        return (
            <tr key="div-concluidas">
                <td colSpan="14" className="border-y-2 border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5">
                    <button
                        type="button"
                        onClick={() => setConcluidasAbertas(v => !v)}
                        className="flex w-full items-center gap-2 text-left text-[11px] font-bold uppercase tracking-wider text-emerald-300 hover:text-emerald-200"
                        title={concluidasAbertas ? 'Recolher as concluídas' : 'Mostrar as concluídas'}
                    >
                        <svg className={`h-3.5 w-3.5 transition-transform ${concluidasAbertas ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Concluídas {weekStart ? 'neste período' : ''}
                        <span className="rounded-full bg-emerald-500/20 px-2 py-px tabular-nums text-emerald-200">{qtdConcluidas}</span>
                        {!concluidasAbertas && <span className="font-normal normal-case tracking-normal text-emerald-400/70">clique para mostrar</span>}
                    </button>
                </td>
            </tr>
        );
    }
}
