import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

// Este componente é o layout base que envolve as páginas do sistema
export default function SIGMANLayout({ children }) {
    // Pega os dados do usuário logado direto do Inertia
    const user = usePage().props.auth.user;

    // Estado para controlar se a sidebar está expandida ou recolhida
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-300 selection:bg-blue-500/20">
            
            {/* ==========================================
                SIDEBAR (Barra Lateral Naval Escura)
            ========================================== */}
            <aside className={`flex flex-col bg-[#010a18] text-slate-300 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-64' : 'w-20'}`}>
                {/* Logo e Nome do Sistema */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-6">
                    {isSidebarExpanded && (
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>
                            </svg>
                            <span className="text-xl font-bold tracking-wider text-white">
                                SIG<span className="text-blue-500">MAN</span>
                            </span>
                        </div>
                    )}
                    {/* Botão para recolher/expandir sidebar */}
                    <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className={`text-slate-500 hover:text-white ${!isSidebarExpanded && 'mx-auto'}`}>
                        {isSidebarExpanded ? (
                             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        ) : (
                             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        )}
                    </button>
                </div>

                {/* Menu de Navegação */}
                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    {isSidebarExpanded && <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Overview</div>}
                    
                   {/* Link Ativo - Dashboard */}
                    <Link href={route('dashboard')} className={`flex items-center rounded-lg bg-blue-500/10 px-3 py-2 text-blue-400 ${!isSidebarExpanded && 'justify-center'}`}>
                        <svg className={`h-5 w-5 ${isSidebarExpanded ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        {isSidebarExpanded && <span className="font-medium">Dashboard</span>}
                    </Link>

                    {/* Embarcações (Ícone de Âncora) */}
                    <Link href={route('vessels.index')} className={`flex items-center rounded-lg px-3 py-2 transition hover:bg-slate-800 hover:text-white ${!isSidebarExpanded && 'justify-center'}`}>
                        <svg className={`h-5 w-5 ${isSidebarExpanded ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            {/* Traçado de uma Âncora naval */}
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20m-7-7c0 3.866 3.134 7 7 7s7-3.134 7-7m-7 7v-4m14 4v-4M12 2a3 3 0 110 6 3 3 0 010-6z" />
                        </svg>
                        {isSidebarExpanded && <span className="font-medium">Embarcações</span>}
                    </Link>

                    {/* Árvore de Equipamentos (Ícone de Nós / Árvore de Computação) */}
                    <Link href={route('eq.index')} className={`flex items-center rounded-lg px-3 py-2 transition hover:bg-slate-800 hover:text-white ${!isSidebarExpanded && 'justify-center'}`}>
                        <svg className={`h-5 w-5 ${isSidebarExpanded ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            {/* Traçado de diagrama de nós conectados */}
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        {isSidebarExpanded && <span className="font-medium">Árvore de Equipamentos</span>}
                    </Link>

                    {/* Ordens de Serviço (Ícone de Prancheta mantido) */}
                    <Link href={route('work-orders.index')} className={`flex items-center rounded-lg px-3 py-2 transition hover:bg-slate-800 hover:text-white ${!isSidebarExpanded && 'justify-center'}`}>
                        <svg className={`h-5 w-5 ${isSidebarExpanded ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {isSidebarExpanded && <span className="font-medium">Ordens de Serviço</span>}
                        {isSidebarExpanded && <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">12</span>}
                    </Link>

                    {/* Solicitações de Serviço (Ícone de Caixa de Entrada / Inbox) */}
                    <Link href={route('service-requests.index')} className={`flex items-center rounded-lg px-3 py-2 transition hover:bg-slate-800 hover:text-white ${!isSidebarExpanded && 'justify-center'}`}>
                        <svg className={`h-5 w-5 ${isSidebarExpanded ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        {isSidebarExpanded && <span className="font-medium">Solicitações de Serviço</span>}
                        {isSidebarExpanded && <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">4</span>}
                    </Link>

                    {/* Docagens (Ícone de Caixa de Entrada / Inbox) */}
                    <Link 
                        href={route('dry-dockings.index')} 
                        className={`flex items-center rounded-lg px-3 py-2 transition hover:bg-slate-800 hover:text-white ${!isSidebarExpanded && 'justify-center'}`}
                    >
                        <svg className={`h-5 w-5 ${isSidebarExpanded ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {isSidebarExpanded && <span className="font-medium">Docagens</span>}
                        
                        {/* Este badge pode puxar a quantidade de docagens com status 'planning' ou 'in_progress' */}
                        {isSidebarExpanded && (
                            <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
                                2
                            </span>
                        )}
                    </Link>


                    {/* Tripulação e Equipe (Ícone de Usuários) */}
                    <Link href={route('crew.index')} className={`flex items-center rounded-lg px-3 py-2 transition hover:bg-slate-800 hover:text-white ${!isSidebarExpanded && 'justify-center'}`}>
                        <svg className={`h-5 w-5 ${isSidebarExpanded ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {isSidebarExpanded && <span className="font-medium">Tripulação</span>}
                    </Link>
                </nav>

                {/* Perfil do Usuário no rodapé da Sidebar */}
                <div className="border-t border-slate-800 p-4">
                    <div className="flex items-center">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white shadow-inner">
                            {(user.nickname || user.username).charAt(0)}
                        </div>
                        {isSidebarExpanded && (
                            <div className="ml-3 overflow-hidden">
                                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                                <p className="truncate text-xs text-slate-500">{user.email}</p>
                            </div>
                        )}
                        <Link href={route('logout')} method="post" as="button" className={`text-slate-500 hover:text-white transition ${isSidebarExpanded ? 'ml-auto' : 'mx-auto mt-3'}`}>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </Link>
                    </div>
                </div>
            </aside>

            {/* ==========================================
                ÁREA PRINCIPAL (Sem Top Bar)
            ========================================== */}
            <main className="flex-1 overflow-y-auto bg-[#020d1c] p-4 sm:p-6 lg:p-8">
                {/* Aqui entra o conteúdo do Dashboard.jsx */}
                {children}
            </main>

        </div>
    );
}