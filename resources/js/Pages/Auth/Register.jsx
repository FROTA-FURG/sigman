import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Cadastrar | Gestão Naval" />

            {/* Container Principal Full Screen */}
            <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900 selection:bg-blue-500 selection:text-white sm:px-6 lg:px-8 py-10">
                
                {/* Imagem de Fundo */}
                <img
                    className="absolute inset-0 z-0 h-full w-full object-cover opacity-30"
                    src="/images/fundo.jpg"
                    alt="Fundo Navio"
                />

                {/* Card do Formulário (Glassmorphism) */}
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-slate-800/80 px-8 py-10 shadow-2xl backdrop-blur-md ring-1 ring-white/10 sm:px-10">
                    
                    {/* Cabeçalho do Card */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Junte-se à Tripulação</h2>
                        <p className="mt-2 text-sm text-slate-400">Crie sua conta para acessar o sistema SIGMAN.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        {/* Campo de Nome */}
                        <div>
                            <InputLabel htmlFor="name" value="Nome Completo" className="text-slate-300" />

                            <TextInput
                                id="name"
                                name="name"
                                value={data.name}
                                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="name"
                                isFocused={true}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />

                            <InputError message={errors.name} className="mt-2 text-red-400" />
                        </div>

                        {/* Campo de Email */}
                        <div>
                            <InputLabel htmlFor="email" value="Email" className="text-slate-300" />

                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />

                            <InputError message={errors.email} className="mt-2 text-red-400" />
                        </div>

                        {/* Campo de Senha */}
                        <div>
                            <InputLabel htmlFor="password" value="Senha" className="text-slate-300" />

                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                            />

                            <InputError message={errors.password} className="mt-2 text-red-400" />
                        </div>

                        {/* Campo de Confirmação de Senha */}
                        <div>
                            <InputLabel
                                htmlFor="password_confirmation"
                                value="Confirmar Senha"
                                className="text-slate-300"
                            />

                            <TextInput
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="new-password"
                                onChange={(e) =>
                                    setData('password_confirmation', e.target.value)
                                }
                                required
                            />

                            <InputError
                                message={errors.password_confirmation}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        {/* Botão de Registro */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                            >
                                Cadastrar
                            </button>
                        </div>
                    </form>

                    {/* Link para Login */}
                    <div className="mt-6 text-center text-sm text-slate-400">
                        Já possui uma conta?{' '}
                        <Link href={route('login')} className="font-semibold text-blue-400 hover:text-blue-300">
                            Entrar
                        </Link>
                    </div>

                </div>
            </div>
        </>
    );
}