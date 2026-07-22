import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import ThirdPartyFormModal from './components/ThirdPartyFormModal';

export default function Index({ thirdParties = [] }) {
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return thirdParties;
        return thirdParties.filter(
            (t) =>
                t.razao_social?.toLowerCase().includes(q) ||
                t.cnpj?.toLowerCase().includes(q) ||
                t.contact_name?.toLowerCase().includes(q)
        );
    }, [thirdParties, search]);

    const openCreate = () => {
        setEditing(null);
        setIsFormOpen(true);
    };

    const openEdit = (thirdParty) => {
        setEditing(thirdParty);
        setIsFormOpen(true);
    };

    const deactivate = (thirdParty) => {
        if (window.confirm(`Desativar o terceiro "${thirdParty.razao_social}"? O login de acesso dele também será bloqueado.`)) {
            router.delete(route('third-parties.destroy', thirdParty.id), { preserveScroll: true });
        }
    };

    return (
        <SIGMANLayout>
            <Head title="Terceiros | SIGMAN" />

            <ThirdPartyFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} thirdParty={editing} />

            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div>
                        <h1 className="text-xl font-bold text-white">Terceiros</h1>
                        <p className="text-xs text-slate-400">Empresas terceirizadas com acesso às suas Ordens de Serviço.</p>
                    </div>
                    <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Novo Terceiro
                    </button>
                </div>

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por razão social, CNPJ ou contato..."
                    className="mb-4 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 focus:border-blue-500"
                />

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c] shadow-lg">
                    {filtered.length === 0 ? (
                        <p className="px-6 py-10 text-center text-sm text-slate-500">Nenhum terceiro cadastrado.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/40 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Razão Social</th>
                                        <th className="px-6 py-3 font-medium">CNPJ</th>
                                        <th className="px-6 py-3 font-medium">Contato</th>
                                        <th className="px-6 py-3 font-medium">E-mail</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filtered.map((t) => (
                                        <tr key={t.id} className="transition hover:bg-slate-800/40">
                                            <td className="px-6 py-3 font-semibold text-white">{t.razao_social}</td>
                                            <td className="px-6 py-3 font-mono text-slate-400">{t.cnpj}</td>
                                            <td className="px-6 py-3 text-slate-300">{t.contact_name || '—'}</td>
                                            <td className="px-6 py-3 text-slate-300">{t.email || '—'}</td>
                                            <td className="px-6 py-3">
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                                                    t.status === 'Active'
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                                        : 'border-slate-600 bg-slate-500/10 text-slate-400'
                                                }`}>
                                                    {t.status === 'Active' ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(t)} title="Editar" className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-blue-400">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                    <button onClick={() => deactivate(t)} title="Desativar" className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-red-400">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </SIGMANLayout>
    );
}
