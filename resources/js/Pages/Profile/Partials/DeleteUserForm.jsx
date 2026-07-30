import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-semibold text-white">
                    Excluir Conta
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                    Uma vez excluída, todos os dados vinculados à sua conta serão removidos
                    permanentemente. Antes de excluir, faça o download de qualquer informação
                    que deseje manter.
                </p>
            </header>

            <button
                type="button"
                onClick={confirmUserDeletion}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
                Excluir Conta
            </button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="bg-[#0b203c] p-6">
                    <h2 className="text-lg font-semibold text-white">
                        Tem certeza de que deseja excluir sua conta?
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Uma vez excluída, todos os dados vinculados à sua conta serão removidos
                        permanentemente. Digite sua senha para confirmar que deseja excluir a
                        conta definitivamente.
                    </p>

                    <div className="mt-6">
                        <InputLabel
                            htmlFor="password"
                            value="Senha"
                            className="sr-only"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="mt-1 block w-3/4 rounded-md border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 shadow-sm focus:border-red-500 focus:ring-red-500"
                            isFocused
                            placeholder="Senha"
                        />

                        <InputError
                            message={errors.password}
                            className="mt-2 text-red-400"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 shadow-md transition hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
                        >
                            Excluir Conta
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
