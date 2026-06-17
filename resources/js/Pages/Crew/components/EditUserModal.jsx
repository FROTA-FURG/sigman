import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const roleMap = {
    'Coordinator': 'Coordenador',
    'Intern': 'Estagiário',
    'Technician': 'Técnico',
    'Engineer': 'Engenheiro',
    'Seaman': 'Marinheiro',
    'System Admin': 'Admin do Sistema'
};

export default function EditUserModal({ isOpen, onClose, user, roles, vessels }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        username: '',
        nickname: '',
        email: '',
        cpf: '',
        phone: '',
        vessel_id: '',
        role_id: '',
        status: 'Active',
    });

    useEffect(() => {
        if (user && isOpen) {
            setData({
                username: user.username || '',
                nickname: user.nickname || '',
                email: user.email || '',
                cpf: user.cpf || '',
                phone: user.phone || '',
                vessel_id: user.vessel_id || '',
                role_id: user.role_id || '',
                status: user.status || 'Active',
            });
        }
    }, [user, isOpen]);

    const formatCPF = (value) => {
        let v = value.replace(/\D/g, "");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        return v;
    };

    const formatPhone = (value) => {
        let v = value.replace(/\D/g, "");
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d)(\d{4})$/, "$1-$2");
        return v;
    };

    const handleCpfChange = (e) => {
        setData('cpf', formatCPF(e.target.value));
    };

    const handlePhoneChange = (e) => {
        setData('phone', formatPhone(e.target.value));
    };

    const submit = (e) => {
        e.preventDefault();
        put(route('crew.update', user.id), {
            onSuccess: () => {
                onClose();
            },
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Data não disponível';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!isOpen || !user) return null;

    const translateRole = (roleName) => {
        const translations = {
            'dev': 'Desenvolvedor(a) / TI',
            'intern': 'Estagiário',
            'engineer': 'Engenheiro(a)',
            'technician': 'Técnico',
            'coordinator': 'Coordenador(a)',
            'seaman': 'Marinheiro'
        };
        return translations[roleName] || roleName; 
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity p-4">
            <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col transform overflow-hidden rounded-2xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 transition-all">
                
                <div className="shrink-0 border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Editar: {user.nickname || user.username}</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={submit} className="flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nome de Usuário</label>
                                <input 
                                    type="text" 
                                    value={data.username}
                                    onChange={e => setData('username', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.username ? 'border-red-500' : ''}`} 
                                />
                                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Apelido (Exibição)</label>
                                <input 
                                    type="text" 
                                    value={data.nickname}
                                    onChange={e => setData('nickname', e.target.value)}
                                    className="w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">E-mail</label>
                                <input 
                                    type="email" 
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`} 
                                />
                                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">CPF</label>
                                <input 
                                    type="text" 
                                    value={data.cpf}
                                    onChange={handleCpfChange}
                                    maxLength="14"
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.cpf ? 'border-red-500' : ''}`} 
                                />
                                {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Telefone</label>
                                <input 
                                    type="text" 
                                    value={data.phone}
                                    onChange={handlePhoneChange}
                                    maxLength="15"
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : ''}`} 
                                />
                                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Cargo / Permissão <span className="text-red-500">*</span></label>
                                <select 
                                    value={data.role_id} 
                                    onChange={e => setData('role_id', e.target.value)} 
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                >
                                    <option value="">Selecione o Cargo...</option>
                                    
                                    {roles && roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {translateRole(role.name)}
                                        </option>
                                    ))}
                                    
                                </select>
                                {errors.role_id && <span className="text-xs text-red-500">{errors.role_id}</span>}
                            </div>
    
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Embarcação Base</label>
                                <select 
                                    value={data.vessel_id || ''} 
                                    onChange={e => setData('vessel_id', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.vessel_id ? 'border-red-500' : ''}`}
                                >
                                    <option value="">Sem embarcação (Não Alocado)</option>
                                    {vessels && vessels.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.vessel_id && <p className="mt-1 text-xs text-red-500">{errors.vessel_id}</p>}
                            </div>

    
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Status de Alocação</label>
                                <select 
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                    className="w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="Active">Ativo (Base)</option>
                                    <option value="Embarked">Embarcado</option>
                                    <option value="Off Duty">Em Folga</option>
                                    <option value="On Leave">Férias</option>
                                    <option value="Terminated">Desligado</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 rounded-lg bg-slate-900/50 p-4 border border-slate-800">
                            <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">Histórico do Registro</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="block text-slate-500">Criado em:</span>
                                    <span className="text-slate-300 font-medium">{formatDate(user.created_at)}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Última atualização:</span>
                                    <span className="text-slate-300 font-medium">{formatDate(user.updated_at)}</span>
                                </div>
                                <div className="col-span-2 mt-1">
                                    <span className="block text-slate-500">Modificado por:</span>
                                    <span className="text-slate-300 font-medium">{user.last_updated_by || 'Sistema'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-slate-800 bg-slate-900/50 px-6 py-4 flex justify-between items-center">
                        <button type="button" className="text-xs font-medium text-red-400 hover:text-red-300 transition">
                            Resetar Senha
                        </button>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition">
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 transition disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Salvando...
                                    </>
                                ) : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}