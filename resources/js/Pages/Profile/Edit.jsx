import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status, canDeleteAccount }) {
    return (
        <SIGMANLayout>
            <Head title="Minha Conta | SIGMAN" />

            <div className="mx-auto max-w-3xl space-y-4">
                <div>
                    <h1 className="text-xl font-bold text-white">Minha Conta</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Gerencie suas informações de perfil e a senha de acesso ao sistema.
                    </p>
                </div>

                <div className="rounded-xl bg-[#0b203c]/90 p-6 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </div>

                <div className="rounded-xl bg-[#0b203c]/90 p-6 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
                    <UpdatePasswordForm />
                </div>

                {canDeleteAccount && (
                    <div className="rounded-xl bg-[#0b203c]/90 p-6 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
                        <DeleteUserForm />
                    </div>
                )}
            </div>
        </SIGMANLayout>
    );
}
