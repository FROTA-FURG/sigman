import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { pdf } from '@react-pdf/renderer';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import CreateServiceRequestModal from './ServiceRequests/CreateSRModal';
import EditServiceRequestModal from './ServiceRequests/EditSRModal';
import SSPdfTemplate from './ServiceRequests/SSPdfTemplate';

export default function Index({ serviceRequests = [], vessels = [], equipments = [], users = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [srToEdit, setSrToEdit] = useState(null);

    // FUNÇÃO DE CLIQUE NA LINHA
    const handleRowClick = (sr) => {
        setSrToEdit(sr);
        setIsEditModalOpen(true);
    };

    // Badges no mesmo padrão visual usado na tabela de Ordens de Serviço
    // (texto colorido em caixa alta, sem pílula) — ver WeeklyProgressTable.jsx
    const renderMTypeBadge = (type) => {
        switch (type) {
            case 'corrective': return <span className="text-red-400 font-semibold uppercase">Corretiva</span>;
            case 'preventive': return <span className="text-blue-400 font-semibold uppercase">Preventiva</span>;
            case 'predictive': return <span className="text-emerald-400 font-semibold uppercase">Preditiva</span>;
            default: return <span className="text-slate-400 font-medium uppercase">Não definido</span>;
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="text-emerald-400 font-semibold uppercase">Aprovada</span>;
            case 'pending': return <span className="text-yellow-400 font-semibold uppercase">Pendente</span>;
            case 'rejected': return <span className="text-red-400 font-semibold uppercase">Rejeitada</span>;
            case 'in_wo': return <span className="text-blue-400 font-semibold uppercase">Em OS</span>;
            default: return <span className="text-slate-400 font-semibold uppercase">Novo</span>;
        }
    };

    const renderPriorityBadge = (priority) => {
        switch (priority) {
            case 'urgent': return <span className="text-red-500 font-bold uppercase">Urgente</span>;
            case 'high': return <span className="text-orange-400 font-bold uppercase">Alta</span>;
            case 'normal': return <span className="text-green-400 font-semibold uppercase">Normal</span>;
            case 'low': return <span className="text-slate-400 uppercase">Baixa</span>;
            default: return <span className="text-slate-500 uppercase">-</span>;
        }
    };

    // Filtro de busca na tela
    const filteredRequests = serviceRequests.filter(sr => {
        const term = searchTerm.toLowerCase();
        return (
            (sr.tag_number || '').toLowerCase().includes(term) ||
            (sr.equipment?.name || '').toLowerCase().includes(term) ||
            (sr.vessel?.name || '').toLowerCase().includes(term)
        );
    });

    // Função para gerar e baixar o PDF em tempo real
    const handleExportPDF = async (ss) => {
        // Gera o blob do PDF invisivelmente
        const blob = await pdf(<SSPdfTemplate ss={ss} />).toBlob();

        // Cria um link temporário e simula o clique de download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SIGMAN_OS_${ss.ss_number || 'Sem_Numero'}.pdf`;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <SIGMANLayout>
            <Head title="Solicitações de Serviço | SIGMAN" />

            <CreateServiceRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                vessels={vessels}
                equipments={equipments}
                users={users}
            />

            <EditServiceRequestModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                srData={srToEdit}
                vessels={vessels}
                equipments={equipments}
            />

            <div className="flex h-full flex-col space-y-4">
                <div>
                    <h2 className="text-xl font-bold leading-tight text-white">Solicitações de Serviço</h2>
                    <p className="text-xs text-slate-400">Caixa de entrada para solicitações e relatos de falhas da tripulação.</p>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800">
                    <p className="pb-3 text-sm text-slate-400">
                        {filteredRequests.length} {filteredRequests.length === 1 ? 'solicitação encontrada' : 'solicitações encontradas'}
                    </p>

                    <div className="flex items-center gap-3 pb-1">
                        <div className="relative hidden sm:block">
                            <input
                                type="text"
                                placeholder="Buscar TAG, Equipamento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-64 rounded-md border-slate-700 bg-slate-900 py-1.5 pl-3 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                        >
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Nova Solicitação
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 mt-0">
                    <div className="flex h-full flex-col overflow-auto rounded-lg border border-slate-600 bg-slate-900 custom-scrollbar">
                        <table className="min-w-full border-collapse text-left text-[11px] whitespace-nowrap">
                            <thead className="sticky top-0 z-10 border-b-2 border-slate-600 bg-slate-800 uppercase text-slate-300 shadow-sm">
                                <tr>
                                    <th className="border border-slate-600 px-2 py-1.5 text-center font-bold">N° da SS</th>
                                    <th className="border border-slate-600 px-2 py-1.5 text-center font-bold">Emb.</th>
                                    <th className="border border-slate-600 px-2 py-1.5 font-bold">Tag</th>
                                    <th className="border border-slate-600 px-2 py-1.5 font-bold">Equipamento</th>
                                    <th className="border border-slate-600 px-2 py-1.5 font-bold">Descrição do Problema</th>
                                    <th className="border border-slate-600 px-2 py-1.5 text-center font-bold">Tipo Manut.</th>
                                    <th className="border border-slate-600 px-2 py-1.5 text-center font-bold">Prioridade</th>
                                    <th className="border border-slate-600 px-2 py-1.5 text-center font-bold">Status</th>
                                    <th className="border border-slate-600 px-2 py-1.5 font-bold">Solicitante</th>
                                    <th className="border border-slate-600 px-2 py-1.5 text-center font-bold">Exportar</th>
                                    <th className="border border-slate-600 px-2 py-1.5 text-center font-bold">Criado Em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.length > 0 ? filteredRequests.map((sr) => (
                                    <tr
                                        key={sr.id}
                                        className="cursor-pointer bg-slate-900 transition-colors even:bg-slate-800/50 hover:bg-slate-700/50"
                                        onClick={() => handleRowClick(sr)}
                                    >
                                        <td className="border border-slate-700 px-2 py-1 text-center font-mono text-emerald-300">{sr.ss_number || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center font-bold text-white">{sr.vessel?.tag || sr.vessel?.name}</td>
                                        <td className="border border-slate-700 px-2 py-1 max-w-[150px] whitespace-normal font-mono text-slate-400">{sr.tag_number || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 max-w-[200px] whitespace-normal text-slate-300">{sr.equipment?.name || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 max-w-[280px] text-slate-400">
                                            <p className="truncate hover:text-clip hover:whitespace-normal" title={sr.description}>{sr.description}</p>
                                        </td>
                                        <td className="border border-slate-700 px-2 py-1 text-center">{renderMTypeBadge(sr.maintenance_type)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center">{renderPriorityBadge(sr.priority)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center">{renderStatusBadge(sr.status)}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-slate-400">{sr.requester_name || '-'}</td>
                                        <td className="border border-slate-700 px-2 py-1 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExportPDF(sr);
                                                }}
                                                className="text-slate-400 transition-colors hover:text-blue-400"
                                                title="Exportar SS para PDF"
                                            >
                                                <svg className="inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </button>
                                        </td>
                                        <td className="border border-slate-700 px-2 py-1 text-center text-slate-300">{new Date(sr.created_at).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="11" className="border border-slate-700 bg-slate-900 px-2 py-10 text-center text-slate-500">Nenhuma solicitação encontrada.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </SIGMANLayout>
    );
}
