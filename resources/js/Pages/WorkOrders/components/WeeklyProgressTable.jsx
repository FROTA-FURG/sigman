import React, { useState, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import OSPdfTemplate from './OSPdfTemplate';
import ReportPdfTemplate from './ReportPdfTemplate';
import EditWorkOrderModal from './EditWorkOrderModal';
import WorkOrderDetailsModal from './WorkOrderDetailsModal';

export default function WeeklyProgressTable({ 
    workOrders = [], 
    equipments = [], 
    users = [],
    vesselFilter,
    statusFilter,
    periodFilter,
    weekStart,
    weekEnd 
}) {
    // ESTADOS DOS MODAIS DE EDIÇÃO E DETALHES
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedOsId, setSelectedOsId] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [osToEdit, setOsToEdit] = useState(null);

    // ESTADOS DE ORDENAÇÃO E CHECKBOXES
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [selectedIds, setSelectedIds] = useState([]);

    const selectedOs = workOrders.find(os => os.id === selectedOsId);
    const workOrderActivities = selectedOs?.activities || [];

    const handleOpenDetailsModal = (id) => { setSelectedOsId(id); setIsDetailsModalOpen(true); };
    const handleRowClick = (os) => { setOsToEdit(os); setIsEditModalOpen(true); };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // ==========================================
    // LÓGICA DE FILTRAGEM COM AS PROPS DO INDEX
    // ==========================================
    const sortedAndFilteredWorkOrders = useMemo(() => {
        let result = workOrders;

        if (vesselFilter) result = result.filter(os => os.equipment?.vessel?.tag === vesselFilter);
        if (statusFilter) result = result.filter(os => os.status === statusFilter);
        if (periodFilter) result = result.filter(os => os.periodicity === periodFilter);

        if (weekStart && weekEnd) {
            result = result.filter(os => {
                if (!os.created_at) return false;
                const [datePart] = os.created_at.split('T');
                const [year, month, day] = datePart.split('-');
                const osDate = new Date(year, month - 1, day, 12, 0, 0);
                return osDate >= weekStart && osDate <= weekEnd;
            });
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
        return result;
    }, [workOrders, vesselFilter, statusFilter, periodFilter, sortConfig, weekStart, weekEnd]);

    // ==========================================
    // LÓGICA DAS CHECKBOXES
    // ==========================================
    const isAllFilteredSelected = sortedAndFilteredWorkOrders.length > 0 && sortedAndFilteredWorkOrders.every(os => selectedIds.includes(os.id));

    const toggleSelectAll = () => {
        if (isAllFilteredSelected) {
            const filteredIds = sortedAndFilteredWorkOrders.map(os => os.id);
            setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            const filteredIds = sortedAndFilteredWorkOrders.map(os => os.id);
            const newSelected = new Set([...selectedIds, ...filteredIds]);
            setSelectedIds(Array.from(newSelected));
        }
    };

    const toggleSelectRow = (e, id) => {
        e.stopPropagation(); 
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    // ==========================================
    // EXPORTAÇÕES DE PDF
    // ==========================================
    const handleExportPDF = async (os) => {
        const blob = await pdf(<OSPdfTemplate os={os} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `SIGMAN_OS_${os.os_number || 'Sem_Numero'}.pdf`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportReport = async () => {
        const selectedOSObjects = workOrders.filter(os => selectedIds.includes(os.id));
        const blob = await pdf(<ReportPdfTemplate workOrders={selectedOSObjects} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `SIGMAN_Relatorio_Progresso.pdf`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderPeriodicityBadge = (period) => {
        switch (period) {
            case 'docking': 
                // Cinza
                return <span className="text-slate-300 font-semibold">Docagem</span>; 
            case 'monthly': 
                // Verde Musgo / Olíva
                return <span className="text-lime-600 font-semibold">Mensal</span>; 
            case 'bimonthly': 
                // Azul
                return <span className="text-blue-500 font-semibold">Bimestral</span>; 
            case 'quarterly': 
                // Verde Vivo / Claro
                return <span className="text-green-400 font-semibold">Trimestral</span>; 
            case 'semiannual': 
                // Laranja
                return <span className="text-orange-500 font-semibold">Semestral</span>; 
            case 'annual': 
                // Vermelho Escuro
                return <span className="text-red-600 font-semibold">Anual</span>; 
            default: 
                return <span className="text-slate-500 font-medium">Avulsa</span>;
        }
    };
    
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'completed': return <span className="text-green-400 font-semibold">Fechado</span>;
            case 'open': return <span className="text-blue-400 font-semibold">Aberto</span>;
            case 'in_progress': return <span className="text-yellow-400 font-semibold">Andamento</span>;
            case 'cancelled': return <span className="text-red-400 font-semibold">Cancelado</span>;
            default: return <span className="text-slate-400 font-semibold">{status}</span>;
        }
    };

    const renderPriorityBadge = (priority) => {
        switch (priority) {
            case 'critical': return <span className="text-red-500 font-bold">Crítica</span>;
            case 'high': return <span className="text-orange-400 font-bold">Alta</span>;
            case 'medium': return <span className="text-yellow-400 font-semibold">Média</span>;
            case 'low': return <span className="text-slate-400">Baixa</span>;
            default: return priority;
        }
    };  

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return (<svg className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>);
        return sortConfig.direction === 'asc' ? (<svg className="w-3 h-3 ml-1 text-blue-400 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>) : (<svg className="w-3 h-3 ml-1 text-blue-400 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>);
    };

    return (
        <div className="flex flex-col h-full w-full relative rounded-lg">
            <EditWorkOrderModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} osData={osToEdit} equipments={equipments} />
            <WorkOrderDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} workOrderId={selectedOsId} osNumber={selectedOs?.os_number} activities={workOrderActivities} users={users} />

            {/* BOTÃO DE RELATÓRIO POSICIONADO ACIMA DA TABELA À DIREITA */}
            {selectedIds.length > 0 && (
                <div className="absolute right-4 top-3 z-20">
                    <button 
                        onClick={handleExportReport}
                        className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition-colors animate-fade-in"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Exportar Relatório ({selectedIds.length})
                    </button>
                </div>
            )}

            {/* ÁREA DA TABELA (ESTILO EXCEL) */}
            <div className="flex-1 overflow-auto bg-slate-900 border border-slate-600 custom-scrollbar mt-0">
                <table className="min-w-full border-collapse text-left text-[11px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-800 border-b-2 border-slate-600 text-slate-300 uppercase shadow-sm">
                        <tr>
                            <th className="border border-slate-600 px-2 py-1.5 text-center w-8 bg-slate-700/50">
                                <input type="checkbox" checked={isAllFilteredSelected} onChange={toggleSelectAll} className="rounded border-slate-500 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer h-3 w-3" />
                            </th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold cursor-pointer hover:bg-slate-700 select-none text-center" onClick={() => handleSort('os_number')}>OS <SortIcon columnKey="os_number" /></th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold cursor-pointer hover:bg-slate-700 select-none text-center" onClick={() => handleSort('ss_number')}>SS <SortIcon columnKey="ss_number" /></th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold cursor-pointer hover:bg-slate-700 select-none text-center" onClick={() => handleSort('created_at')}>Data<SortIcon columnKey="created_at" /></th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Emb.</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold">TAG</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold">Equipamento</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold">Descrição</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Tipo</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Prioridade</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Status</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Periodicidade</th>
                            <th className="border border-slate-600 px-2 py-1.5 font-bold text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredWorkOrders.length === 0 ? (
                            <tr>
                                <td colSpan="12" className="border border-slate-700 px-2 py-4 text-center text-slate-500 bg-slate-900">
                                    {weekStart ? "Nenhuma OS encontrada para a semana e filtros selecionados." : "Nenhum registro encontrado."}
                                </td>
                            </tr>
                        ) : (
                            sortedAndFilteredWorkOrders.map((os) => {
                                const equip = os.equipment || {};
                                const vessel = equip.vessel || {};
                                const isSelected = selectedIds.includes(os.id);
                                
                                return (
                                    <tr 
                                        key={os.id} 
                                        onClick={() => handleRowClick(os)} 
                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/30' : 'bg-slate-900 even:bg-slate-800/50 hover:bg-slate-700/50'}`}
                                    >
                                        <td className="border border-slate-700 px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={isSelected} onChange={(e) => toggleSelectRow(e, os.id)} className="rounded border-slate-500 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer h-3 w-3" />
                                        </td>
                                        <td className="border border-slate-700 px-2 py-1 font-mono text-blue-300">{os.os_number || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 font-mono text-emerald-300">{os.ss_number || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-slate-300 text-center">{os.created_at ? os.created_at.substring(0, 10).split('-').reverse().join('/') : '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 font-bold text-white text-center">{vessel.tag || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 font-mono text-slate-400">{equip.tag_number || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-slate-300 max-w-[150px] truncate" title={equip.name}>{equip.name || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-slate-400 max-w-[250px] truncate" title={os.description}>{os.description}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center text-slate-300">{os.maintenance_type === 'corrective' ? 'CORR' : os.maintenance_type === 'preventive' ? 'PREV' : 'PRED'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center bg-slate-950/20">{renderPriorityBadge(os.priority)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center bg-slate-950/20">{renderStatusBadge(os.status)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center bg-slate-950/20">{renderPeriodicityBadge(os.periodicity)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleExportPDF(os); }} className="text-slate-400 hover:text-emerald-400 transition-colors" title="Download OS Individual">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenDetailsModal(os.id); }} className="text-slate-400 hover:text-blue-400 transition-colors" title="Ver Atividades">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                                </button>
                                            </div>
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