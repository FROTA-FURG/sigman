import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Log in | Gestão Naval" />

            {/* Container Principal Full Screen */}
            <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900 selection:bg-blue-500 selection:text-white sm:px-6 lg:px-8">
                
                {/* Imagem de Fundo (A mesma da tela Welcome) */}
                <img
                    className="absolute inset-0 z-0 h-full w-full object-cover opacity-30"
                    src="/images/fundo.jpg"
                    alt="Fundo Navio"
                />

                {/* Card do Formulário (Glassmorphism) */}
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-slate-800/80 px-8 py-10 shadow-2xl backdrop-blur-md ring-1 ring-white/10 sm:px-10">
                    
                    {/* Cabeçalho do Card (Logo e Título) */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>
                            </svg>
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-white">Bem-vindo de volta</h2>
                        <p className="mt-2 text-sm text-slate-400">Insira suas credenciais para acessar o sistema.</p>
                    </div>

                    {status && (
                        <div className="mb-4 text-sm font-medium text-green-400">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-6">
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
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
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
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                            />

                            <InputError message={errors.password} className="mt-2 text-red-400" />
                        </div>

                        {/* Lembre-me e Esqueci a Senha */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
                                />
                                <span className="ms-2 text-sm text-slate-300">
                                    Lembrar de mim
                                </span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm text-blue-400 underline transition hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                                >
                                    Esqueceu a senha?
                                </Link>
                            )}
                        </div>

                        {/* Botão de Login (Substituído o PrimaryButton padrão para combinar com o tema) */}
                        <div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                            >
                                Entrar no Sistema
                            </button>
                        </div>
                    </form>
                    
                    {/* Link Rápido para Registro */}
                    <div className="mt-6 text-center text-sm text-slate-400">
                        Ainda não faz parte da tripulação?{' '}
                        <Link href={route('register')} className="font-semibold text-blue-400 hover:text-blue-300">
                            Cadastre-se
                        </Link>
                    </div>

                </div>
            </div>
        </>
    );
}