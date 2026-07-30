import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const inputClass =
        'mt-1 block w-full rounded-md border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-blue-500';

    return (
        <>
            <Head title="Redefinir senha | SIGMAN" />

            <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900 selection:bg-blue-500 selection:text-white sm:px-6 lg:px-8">
                <img
                    className="absolute inset-0 z-0 h-full w-full object-cover opacity-30"
                    src="/images/fundo.jpg"
                    alt="Fundo Navio"
                />

                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-slate-800/80 px-8 py-10 shadow-2xl backdrop-blur-md ring-1 ring-white/10 sm:px-10">
                    <div className="mb-8 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-white">Definir Nova Senha</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Escolha uma nova senha para acessar o SIGMAN.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <InputLabel htmlFor="email" value="Email" className="text-slate-300" />

                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className={inputClass}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                            />

                            <InputError message={errors.email} className="mt-2 text-red-400" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="Nova Senha" className="text-slate-300" />

                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className={inputClass}
                                autoComplete="new-password"
                                isFocused={true}
                                onChange={(e) => setData('password', e.target.value)}
                            />

                            <InputError message={errors.password} className="mt-2 text-red-400" />
                        </div>

                        <div>
                            <InputLabel
                                htmlFor="password_confirmation"
                                value="Confirmar Nova Senha"
                                className="text-slate-300"
                            />

                            <TextInput
                                type="password"
                                id="password_confirmation"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className={inputClass}
                                autoComplete="new-password"
                                onChange={(e) =>
                                    setData('password_confirmation', e.target.value)
                                }
                            />

                            <InputError
                                message={errors.password_confirmation}
                                className="mt-2 text-red-400"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                            >
                                {processing ? 'Salvando...' : 'Redefinir Senha'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
