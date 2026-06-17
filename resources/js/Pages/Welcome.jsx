import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth, laravelVersion, phpVersion }) {
    return (
        <>
            <Head title="Bem-vindo | Gestão Naval" />
            
            <div className="relative min-h-screen bg-slate-900 text-white selection:bg-blue-500 selection:text-white">
     
                <img
                    className="absolute inset-0 z-0 h-full w-full object-cover opacity-30"
                    src="/LogoFROTA.png" 
                    alt="Fundo Navio"
                />

                {/* Container principal que fica por cima da imagem (z-10) */}
                <div className="relative z-10 flex min-h-screen flex-col">
                    
                    {/* CABEÇALHO: LOGO E AUTENTICAÇÃO */}
                    <header className="flex items-center justify-between p-6 lg:px-12">
                        <div className="flex items-center gap-3">
                            {/* Ícone de Âncora (SVG direto no código para facilitar) */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>
                            </svg>
                            <span className="text-xl font-bold uppercase tracking-widest text-white">
                                SIGMAN<span className="text-blue-400"></span>
                            </span>
                        </div>

                        {/* Roteamento de Login / Register mantido intacto */}
                        <nav className="-mx-3 flex flex-1 justify-end">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-md px-4 py-2 font-semibold text-white/80 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    Painel de Controle
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="rounded-md px-4 py-2 font-semibold text-white/80 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-md px-4 py-2 font-semibold text-blue-400 transition hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    {/* CONTEÚDO CENTRAL (CHAMADA PARA AÇÃO) */}
                    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                        <h1 className="mb-6 max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
                            Gestão Inteligente de <br className="hidden sm:block" />
                            <span className="text-blue-400">Manutenção Naval</span>
                        </h1>
                        <p className="mb-10 max-w-2xl text-lg text-slate-300 sm:text-xl">
                            Controle total sobre sua frota. Cadastre embarcações, rastreie o histórico de equipamentos e gerencie ordens de serviço com máxima eficiência.
                        </p>
                        
                        {/* <div className="flex gap-4">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-lg bg-blue-600 px-8 py-4 font-bold text-white shadow-lg transition hover:bg-blue-500 hover:shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                                >
                                    Acessar o Sistema
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="rounded-lg bg-blue-600 px-8 py-4 font-bold text-white shadow-lg transition hover:bg-blue-500 hover:shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                                >
                                    Entrar no Sistema
                                </Link>
                            )}
                        </div> */}
                    </main>

                    {/* RODAPÉ */}
                    <footer className="py-6 text-center text-sm text-slate-400">
                        &copy; 2026 FROTA (FURG). Laravel v{laravelVersion} (PHP v{phpVersion})
                    </footer>
                </div>
            </div>
        </>
    );
}