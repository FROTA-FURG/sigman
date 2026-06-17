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

    const renderMTypeBadge = (status) => {
        switch (status) {
            case 'corrective': return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">Corretiva</span>;
            case 'preventive': return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">Preventiva</span>;
            case 'predictive': return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">Preditiva</span>;
            default: return <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/20">Não definido</span>;
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">Aprovada</span>;
            case 'pending': return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">Pendente</span>;
            case 'rejected': return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">Rejeitada</span>;
            case 'in_wo': return <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">Em OS</span>;
            default: return <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/20">Novo</span>;
        }
    };

    const renderPriorityBadge = (priority) => {
        switch (priority) {
            case 'urgent': return <span className="flex items-center text-xs font-bold text-red-500"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></span>Urgente</span>;
            case 'high': return <span className="flex items-center text-xs font-bold text-orange-500"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_#f97316]"></span>Alta</span>;
            case 'normal': return <span className="flex items-center text-xs font-medium text-green-500"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>Normal</span>;
            case 'low': return <span className="flex items-center text-xs font-medium text-slate-400"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"></span>Baixa</span>;
            default: return '-';
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
                
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white">Solicitações de Serviço</h2>
                        <p className="text-xs text-slate-400">Caixa de entrada para solicitações e relatos de falhas da tripulação.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
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
                            className="flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                        >
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Nova Solicitação
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-10 bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 backdrop-blur-md border-b border-slate-700/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium"> N° da SS</th>
                                    <th className="px-4 py-3 font-medium">Emb.</th>
                                    <th className="px-4 py-3 font-medium">Tag</th>
                                    <th className="px-4 py-3 font-medium">Equipamento</th>
                                    <th className="px-4 py-3 font-medium min-w-[300px]">Descrição do Problema</th>
                                    <th className="px-4 py-3 font-medium">Tipo Manut.</th>
                                    <th className="px-4 py-3 font-medium">Prioridade</th>
                                    <th className="px-4 py-3 font-medium text-center">Status</th>
                                    <th className="px-4 py-3 font-medium">Solicitante</th>
                                    <th className="px-4 py-3 font-medium">Exportar</th>
                                    <th className="px-4 py-3 font-medium">Criado Em</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredRequests.length > 0 ? filteredRequests.map((sr) => (
                                    <tr 
                                        key={sr.id} 
                                        className="transition hover:bg-slate-800/50 cursor-pointer"
                                        onClick={() => handleRowClick(sr)}  
                                    >
                                        <td className="px-4 py-3 font-bold text-white">{sr.ss_number || ''}</td>
                                        <td className="px-4 py-3 font-bold text-white">{sr.vessel?.tag || sr.vessel?.name}</td>
                                        <td className="px-4 py-3 text-slate-300 font-medium whitespace-normal max-w-[200px]">{sr.tag_number || '-'}</td>
                                        <td className="px-4 py-3 text-slate-300 font-medium whitespace-normal max-w-[200px]">{sr.equipment?.name || '-'}</td>
                                        <td className="px-4 py-3 text-slate-300 whitespace-normal max-w-[300px]">
                                            <p className="truncate hover:text-clip hover:whitespace-normal" title={sr.description}>{sr.description}</p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{renderMTypeBadge(sr.maintenance_type)}</td>
                                        <td className="px-4 py-3">{renderPriorityBadge(sr.priority)}</td>
                                        <td className="px-4 py-3 text-center">{renderStatusBadge(sr.status)}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{sr.requester_name || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    handleExportPDF(sr);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                                                title="Exportar OS para PDF"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 text-xs">{new Date(sr.created_at).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="9" className="text-center py-10 text-slate-500">Nenhuma solicitação encontrada.</td>
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