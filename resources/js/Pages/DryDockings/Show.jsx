import React, { useState } from 'react';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link } from '@inertiajs/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DryDockingShow() {
    // Aba ativa: 'dashboard' (Curva S) ou 'kanban' (Jira)
    const [activeTab, setActiveTab] = useState('dashboard');

    // ==========================================
    // DADOS FALSOS (MOCK) PARA VISUALIZAÇÃO
    // ==========================================
    const mockVessel = { name: 'Lacha Larus', tag: 'LL', shipyard: 'Cais Rio Grande' };

    // Dados da Curva S (Eixo X = Dias, Eixo Y = % de Conclusão)
    // Note que do dia 21 em diante o 'Realizado' descola do 'Planejado', abrindo a "boca de jacaré"
    const sCurveData = [
        { data: '18/05', Planejado: 0, Realizado: 0 },
        { data: '19/05', Planejado: 15, Realizado: 15 },
        { data: '20/05', Planejado: 30, Realizado: 28 },
        { data: '21/05', Planejado: 45, Realizado: 35 },
        { data: '22/05', Planejado: 65, Realizado: 45 },
        { data: '23/05', Planejado: 85, Realizado: 55 },
        { data: '24/05', Planejado: 100, Realizado: null }, // O futuro ainda não aconteceu
    ];

    // Tarefas do Kanban divididas em Etapas
    const mockTasks = [
        { id: 1, phase: 'Semana 1 - Preparação', title: 'Posicionamento nos picadeiros', status: 'done', weight: '5%' },
        { id: 2, phase: 'Semana 1 - Preparação', title: 'Esvaziamento do dique', status: 'done', weight: '5%' },
        { id: 3, phase: 'Semana 1 - Preparação', title: 'Lavagem de alta pressão no casco', status: 'in_progress', weight: '10%' },
        { id: 4, phase: 'Semana 1 - Preparação', title: 'Medição de espessura de chapas (Ultrassom)', status: 'in_progress', weight: '15%' },
        { id: 5, phase: 'Semana 2 - Reparos', title: 'Substituição de 15m² de chapa de bombordo', status: 'blocked', weight: '20%', blocked_reason: 'Aguardando liberação de aço certificado' },
        { id: 6, phase: 'Semana 2 - Reparos', title: 'Revisão das válvulas de fundo', status: 'todo', weight: '10%' },
        { id: 7, phase: 'Semana 2 - Reparos', title: 'Troca dos anodos de sacrifício', status: 'todo', weight: '5%' },
    ];

    // ==========================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ==========================================
    
    // Customiza a "dica" que aparece ao passar o mouse no gráfico
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-3 shadow-xl backdrop-blur-sm">
                    <p className="mb-2 font-bold text-white">{`Data: ${label}`}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                            {`${entry.name}: ${entry.value}%`}
                        </p>
                    ))}
                    {payload.length === 2 && (
                        <div className="mt-2 border-t border-slate-700 pt-2 text-xs text-slate-400">
                            Desvio: <span className="text-red-400 font-bold">{payload[0].value - payload[1].value}%</span> em atraso
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    // Renderiza uma coluna do Kanban
    const KanbanColumn = ({ title, status, colorClass, borderClass }) => {
        const columnTasks = mockTasks.filter(t => t.status === status);
        
        return (
            <div className="flex flex-col rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-800">
                <div className={`mb-3 flex items-center justify-between border-b-2 pb-2 ${borderClass}`}>
                    <h4 className={`text-sm font-bold uppercase tracking-wider ${colorClass}`}>{title}</h4>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                        {columnTasks.length}
                    </span>
                </div>
                
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 min-h-[300px]">
                    {columnTasks.map(task => (
                        <div key={task.id} className="group relative cursor-grab rounded-lg border border-slate-700/50 bg-[#0b203c] p-3 shadow-md transition hover:border-slate-500 hover:shadow-lg active:cursor-grabbing">
                            <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{task.phase}</span>
                            <p className="text-sm font-semibold text-slate-200">{task.title}</p>
                            
                            {task.status === 'blocked' && (
                                <div className="mt-2 rounded bg-red-500/10 p-1.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                                    <span className="font-bold">Motivo:</span> {task.blocked_reason}
                                </div>
                            )}
                            
                            <div className="mt-3 flex items-center justify-between border-t border-slate-800/50 pt-2">
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                                    Peso: {task.weight}
                                </span>
                                {/* Botão placeholder para mover a tarefa */}
                                <button className="text-slate-500 hover:text-blue-400 transition opacity-0 group-hover:opacity-100">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <SIGMANLayout>
            <Head title={`Docagem ${mockVessel.tag} | SIGMAN`} />

            <div className="flex h-full flex-col space-y-4">
                
                {/* Cabeçalho */}
                <div className="flex shrink-0 items-center justify-between rounded-xl bg-slate-900/50 p-5 ring-1 ring-slate-800 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <Link href={route('dry-dockings.index')} className="rounded-lg bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold leading-tight text-white">Docagem {mockVessel.name}</h2>
                                <span className="rounded bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-400 ring-1 ring-inset ring-orange-500/20 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span> Em Andamento
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {mockVessel.shipyard}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-xs font-medium text-slate-400">Orçamento Aprovado</p>
                            <p className="text-lg font-bold text-white">R$ 1.500.000,00</p>
                        </div>
                        <div className="border-l border-slate-700 pl-4 text-right">
                            <p className="text-xs font-medium text-slate-400">Custo Atual</p>
                            <p className="text-lg font-bold text-emerald-400">R$ 850.000,00</p>
                        </div>
                    </div>
                </div>

                {/* Navegação de Abas */}
                <div className="flex space-x-1 rounded-lg bg-slate-900/50 p-1 shrink-0 w-fit ring-1 ring-slate-800">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                        Dashboard (Curva S)
                    </button>
                    <button 
                        onClick={() => setActiveTab('kanban')}
                        className={`flex items-center rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'kanban' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                        Quadro de Etapas (Kanban)
                    </button>
                </div>

                {/* CONTEÚDO DAS ABAS */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6">
                    
                    {/* ABA 1: CURVA S */}
                    {activeTab === 'dashboard' && (
                        <div className="flex flex-col gap-6">
                            
                            {/* Gráfico */}
                            <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-6 shadow-xl backdrop-blur-md">
                                <div className="mb-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Curva S de Progresso (EVM)</h3>
                                        <p className="text-xs text-slate-400 mt-1">Comparativo de avanço físico planejado vs realizado.</p>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-lg bg-red-500/10 px-3 py-1.5 ring-1 ring-inset ring-red-500/20">
                                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                        <span className="text-xs font-bold text-red-400">ALERTA: 10% de Atraso no cronograma</span>
                                    </div>
                                </div>
                                
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={sCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="data" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(tick) => `${tick}%`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '14px', fontWeight: 'bold' }} />
                                            
                                            {/* Linha do Planejado (Azul Tracejado) */}
                                            <Line type="monotone" dataKey="Planejado" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 8 }} />
                                            
                                            {/* Linha do Realizado (Verde Sólido) */}
                                            <Line type="monotone" dataKey="Realizado" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA 2: KANBAN (JIRA STYLE) */}
                    {activeTab === 'kanban' && (
                        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-4 min-h-[600px]">
                            <KanbanColumn title="A Fazer (To Do)" status="todo" colorClass="text-slate-400" borderClass="border-slate-500/30" />
                            <KanbanColumn title="Em Andamento (In Progress)" status="in_progress" colorClass="text-blue-400" borderClass="border-blue-500/50" />
                            <KanbanColumn title="Bloqueado (Blocked)" status="blocked" colorClass="text-red-400" borderClass="border-red-500/50" />
                            <KanbanColumn title="Concluído (Done)" status="done" colorClass="text-emerald-400" borderClass="border-emerald-500/50" />
                        </div>
                    )}

                </div>
            </div>
        </SIGMANLayout>
    );
}