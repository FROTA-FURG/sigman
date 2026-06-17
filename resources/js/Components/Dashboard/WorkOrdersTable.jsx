import React from 'react';

const workOrders = [
    { id: 'OS-2041', tipo: 'Revisão Motor Principal', embarcacao: 'Atlântico Sul', prioridade: 'Critica', status: 'Em Andamento' },
    { id: 'OS-2042', tipo: 'Troca de Filtros', embarcacao: 'Lancha Larus', prioridade: 'Baixa', status: 'Concluída' },
    { id: 'OS-2043', tipo: 'Reparo de Antena VHF', embarcacao: 'Ciências do Mar 1', prioridade: 'Alta', status: 'Pendente' },
    { id: 'OS-2044', tipo: 'Inspeção de Eixo Propulsor', embarcacao: 'Atlântico Sul', prioridade: 'Média', status: 'Atrasada' },
    { id: 'OS-2045', tipo: 'Manutenção do Gerador', embarcacao: 'Ciências do Mar 1', prioridade: 'Média', status: 'Em Andamento' },
    { id: 'OS-2046', tipo: 'Limpeza de Porão', embarcacao: 'Lancha Larus', prioridade: 'Baixa', status: 'Pendente' },
];

export default function WorkOrdersTable() {
    
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
            case 'Atrasada': return 'text-red-500 font-bold';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
            
            <div className="shrink-0 border-b border-slate-700/50 p-4 sm:p-5">
                <h3 className="font-semibold text-white">Ordens de Serviço Ativas</h3>
            </div>
            
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 backdrop-blur-sm z-10">
                        <tr>
                            <th className="p-4 font-medium">OS #</th>
                            <th className="p-4 font-medium">Serviço / Manutenção</th>
                            <th className="p-4 font-medium">Embarcação</th>
                            <th className="p-4 font-medium">Prioridade</th>
                            <th className="p-4 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {/* 3. Mapeando o Array para gerar as linhas da tabela */}
                        {workOrders.map((order, index) => (
                            <tr key={index} className="transition-colors hover:bg-slate-800/50">
                                <td className="p-4 font-mono font-medium text-blue-400">{order.id}</td>
                                <td className="p-4 text-slate-200">{order.tipo}</td>
                                <td className="p-4 text-slate-400">{order.embarcacao}</td>
                                <td className={`p-4 font-medium ${getPriorityColor(order.prioridade)}`}>
                                    {order.prioridade}
                                </td>
                                <td className={`p-4 font-medium ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}