import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Authenticated({ header, children }) {
    const user = usePage().props.auth.user;
    const [showingMobileMenu, setShowingMobileMenu] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            
            {/* ==========================================
                SIDEBAR (Barra Lateral Escura)
            ========================================== */}
            <aside className="hidden w-64 flex-col bg-[#0B1120] text-slate-300 md:flex transition-all duration-300">
                {/* Logo da Empresa */}
                <div className="flex h-16 shrink-0 items-center border-b border-slate-800 px-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>
                    </svg>
                    <span className="text-xl font-bold tracking-wider text-white">
                        SIG<span className="text-blue-500">MAN</span>
                    </span>
                </div>

                {/* Menu de Navegação */}
                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Overview</div>
                    
                    {/* Link Ativo (Dashboard) */}
                    <Link href={route('dashboard')} className="flex items-center rounded-lg bg-blue-500/10 px-3 py-2.5 text-blue-400">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        <span className="font-medium">Dashboard</span>
                    </Link>

                    {/* Outros Links */}
                    <Link href="#" className="flex items-center rounded-lg px-3 py-2.5 transition hover:bg-slate-800 hover:text-white">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="font-medium">Embarcações</span>
                    </Link>
                    <Link href="#" className="flex items-center rounded-lg px-3 py-2.5 transition hover:bg-slate-800 hover:text-white">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="font-medium">Árvore de Equipamentos</span>
                    </Link>
                    <Link href="#" className="flex items-center rounded-lg px-3 py-2.5 transition hover:bg-slate-800 hover:text-white">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <span className="font-medium">Ordens de Serviço (SO)</span>
                        <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">12</span>
                    </Link>
                    <Link href="#" className="flex items-center rounded-lg px-3 py-2.5 transition hover:bg-slate-800 hover:text-white">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <span className="font-medium">Solicitações de Serviço (SS)</span>
                        <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">12</span>
                    </Link>
                    <Link href="#" className="flex items-center rounded-lg px-3 py-2.5 transition hover:bg-slate-800 hover:text-white">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <span className="font-medium">Colaboradores</span>
                        <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">12</span>
                    </Link>
                </nav>

                {/* Perfil do Usuário */}
                <div className="border-t border-slate-800 p-4">
                    <div className="flex items-center">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-inner">
                            {user.name.charAt(0)}
                        </div>
                        <div className="ml-3 overflow-hidden">
                            <p className="truncate text-sm font-medium text-white">{user.name}</p>
                            <p className="truncate text-xs text-slate-500">{user.email}</p>
                        </div>
                        <Link href={route('logout')} method="post" as="button" className="ml-auto text-slate-500 transition hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </Link>
                    </div>
                </div>
            </aside>

            {/* ==========================================
                ÁREA PRINCIPAL
            ========================================== */}
            <div className="flex flex-1 flex-col overflow-hidden">
                
                {/* TOP BAR */}
                <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
                    <button onClick={() => setShowingMobileMenu(!showingMobileMenu)} className="text-gray-500 hover:text-gray-700 md:hidden">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>

                    <div className="flex flex-1">
                        <div className="relative w-full max-w-md text-gray-400 focus-within:text-gray-600">
                            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input 
                                type="text" 
                                placeholder="Buscar equipamento ou OS..." 
                                className="w-full rounded-md border-transparent bg-gray-100 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="ml-4 flex items-center gap-4">
                        <button className="hidden items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 sm:flex">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Nova Ordem
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>

            </div>
        </div>
    );
}