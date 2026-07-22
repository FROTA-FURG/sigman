import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

// Modal de cadastro/edição de empresa terceirizada.
// Ao criar, o backend gera junto o login de acesso (role=terceiro).
export default function ThirdPartyFormModal({ isOpen, onClose, thirdParty = null }) {
    const isEditing = Boolean(thirdParty);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        razao_social: '',
        cnpj: '',
        contact_name: '',
        email: '',
        phone: '',
        password: '',
        status: 'Active',
    });

    useEffect(() => {
        if (!isOpen) return;
        clearErrors();
        if (thirdParty) {
            setData({
                razao_social: thirdParty.razao_social || '',
                cnpj: thirdParty.cnpj || '',
                contact_name: thirdParty.contact_name || '',
                email: thirdParty.email || '',
                phone: thirdParty.phone || '',
                password: '',
                status: thirdParty.status || 'Active',
            });
        } else {
            reset();
        }
    }, [isOpen, thirdParty?.id]);

    if (!isOpen) return null;

    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => onClose() };
        if (isEditing) {
            put(route('third-parties.update', thirdParty.id), opts);
        } else {
            post(route('third-parties.store'), opts);
        }
    };

    const field = 'w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-6 py-4">
                    <h3 className="text-lg font-bold text-white">
                        {isEditing ? 'Editar Terceiro' : 'Cadastrar Terceiro'}
                    </h3>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">Razão Social <span className="text-red-500">*</span></label>
                        <input type="text" value={data.razao_social} onChange={(e) => setData('razao_social', e.target.value)} className={field} />
                        {errors.razao_social && <span className="text-xs text-red-500">{errors.razao_social}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">CNPJ <span className="text-red-500">*</span></label>
                            <input type="text" value={data.cnpj} onChange={(e) => setData('cnpj', e.target.value)} className={field} placeholder="00.000.000/0001-00" />
                            {errors.cnpj && <span className="text-xs text-red-500">{errors.cnpj}</span>}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Contato</label>
                            <input type="text" value={data.contact_name} onChange={(e) => setData('contact_name', e.target.value)} className={field} />
                            {errors.contact_name && <span className="text-xs text-red-500">{errors.contact_name}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">E-mail (login) <span className="text-red-500">*</span></label>
                            <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={field} />
                            {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Telefone</label>
                            <input type="text" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className={field} />
                            {errors.phone && <span className="text-xs text-red-500">{errors.phone}</span>}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">
                            Senha de acesso {isEditing ? <span className="text-slate-600">(deixe em branco para manter)</span> : <span className="text-red-500">*</span>}
                        </label>
                        <input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} className={field} autoComplete="new-password" />
                        {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white">
                            Cancelar
                        </button>
                        <button type="submit" disabled={processing} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
                            {processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
