import React from 'react';

// 1. Dados extraídos para um Array de Objetos (JSON)
const serviceRequests = [
    { id: '#1023', tipo: 'Motor Principal', embarcacao: 'Atlântico Sul', prioridade: 'Alta', status: 'Pendente' },
    { id: '#1024', tipo: 'Sistema Hidráulico', embarcacao: 'Lancha Larus', prioridade: 'Média', status: 'Em Andamento' },
    { id: '#1025', tipo: 'Radar de Navegação', embarcacao: 'Ciências do Mar 1', prioridade: 'Alta', status: 'Pendente' },
    { id: '#1026', tipo: 'Bomba de Porão', embarcacao: 'Atlântico Sul', prioridade: 'Baixa', status: 'Concluída' },
    { id: '#1027', tipo: 'Iluminação Externa', embarcacao: 'Alpha', prioridade: 'Média', status: 'Pendente' },
    { id: '#1028', tipo: 'Guincho de Carga', embarcacao: 'Ciências do Mar 1', prioridade: 'Baixa', status: 'Em Andamento' },
    { id: '#1029', tipo: 'Válvula de Resfriamento', embarcacao: 'Lancha Larus', prioridade: 'Alta', status: 'Cancelada' },
    { id: '#1030', tipo: 'Gerador Auxiliar', embarcacao: 'Atlântico Sul', prioridade: 'Média', status: 'Pendente' },
];

export default function ServiceRequestsTable() {
    
    // 2. Funções auxiliares para pintar o texto com base no valor
    const getPriorityColor = (prioridade) => {
        switch (prioridade) {
            case 'Alta': return 'text-red-400';
            case 'Média': return 'text-orange-400';
            case 'Baixa': return 'text-blue-400';
            default: return 'text-slate-400';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendente': return 'text-yellow-400';
            case 'Em Andamento': return 'text-blue-400';
            case 'Concluída': return 'text-emerald-400';
            case 'Cancelada': return 'text-slate-500 line-through';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
            
            {/* Header Fixo */}
            <div className="shrink-0 border-b border-slate-700/50 p-4 sm:p-5">
                <h3 className="font-semibold text-white">Solicitações de Serviço Recentes</h3>
            </div>
            
            {/* Corpo com Scroll */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 backdrop-blur-sm z-10">
                        <tr>
                            <th className="p-4 font-medium">ID</th>
                            <th className="p-4 font-medium">Tipo / Equipamento</th>
                            <th className="p-4 font-medium">Embarcação</th>
                            <th className="p-4 font-medium">Prioridade</th>
                            <th className="p-4 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {serviceRequests.map((request, index) => (
                            <tr key={index} className="transition-colors hover:bg-slate-800/50">
                                <td className="p-4 font-mono font-medium text-blue-400">{request.id}</td>
                                <td className="p-4 text-slate-200">{request.tipo}</td>
                                <td className="p-4 text-slate-400">{request.embarcacao}</td>
                                <td className={`p-4 font-medium ${getPriorityColor(request.prioridade)}`}>
                                    {request.prioridade}
                                </td>
                                <td className={`p-4 font-medium ${getStatusColor(request.status)}`}>
                                    {request.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}