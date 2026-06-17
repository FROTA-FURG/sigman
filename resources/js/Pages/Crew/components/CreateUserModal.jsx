import { useForm } from '@inertiajs/react';
import { useState } from 'react';

const roleMap = {
    'Coordinator': 'Coordenador',
    'Intern': 'Estagiário',
    'Technician': 'Técnico',
    'Engineer': 'Engenheiro',
    'Seaman': 'Marinheiro',
    'System Admin': 'Admin do Sistema'
};

export default function CreateUserModal({ isOpen, onClose, roles, vessels }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        nickname: '',
        email: '',
        cpf: '',
        phone: '',
        password: '',
        role_id: '', 
        vessel_id: '',
        status: 'Active',
    });

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
        post(route('crew.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 transition-all">
                
                <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Novo Funcionário</h3>
                    <button onClick={onClose} type="button" className="text-slate-400 hover:text-white transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={submit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Nome de Usuário (Login)</label>
                            <input 
                                value={data.username}
                                onChange={e => setData('username', e.target.value)}
                                type="text" 
                                className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.username ? 'border-red-500' : ''}`}
                                placeholder="ex: Nome sobrenome..."
                            />
                            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Apelido (Exibição)</label>
                            <input 
                                value={data.nickname}
                                onChange={e => setData('nickname', e.target.value)}
                                type="text" 
                                className="w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="ex: Apelido..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">E-mail Corporativo</label>
                                <input 
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    type="email" 
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                                    placeholder="usuario@email.com"
                                />
                                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">CPF</label>
                                <input 
                                    value={data.cpf}
                                    onChange={handleCpfChange}
                                    type="text"
                                    maxLength="14" 
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.cpf ? 'border-red-500' : ''}`}
                                    placeholder="000.000.000-00"
                                />
                                {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Telefone</label>
                                <input 
                                    value={data.phone}
                                    onChange={handlePhoneChange}
                                    type="text"
                                    maxLength="15" 
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : ''}`}
                                    placeholder="(00) 00000-0000"
                                />
                                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Status Inicial</label>
                                <select 
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.status ? 'border-red-500' : ''}`}
                                >
                                    <option value="Active">Ativo (Base)</option>
                                    <option value="Embarked">Embarcado</option>
                                    <option value="Off Duty">Em Folga</option>
                                    <option value="On Leave">Férias</option>
                                    <option value="Terminated">Desligado</option>
                                </select>
                                {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Senha Inicial</label>
                                <div className="relative">
                                    <input 
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        type={showPassword ? 'text' : 'password'} 
                                        className={`w-full rounded-md border-slate-700 bg-slate-900 pl-3 pr-10 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.password ? 'border-red-500' : ''}`}
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        ) : (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 014.13-5.247M9.88 9.88l4.24 4.24m1.72-1.72L21 21m-2.12-2.12l-1.42-1.42m-1.24-1.24a3.993 3.993 0 00-5.656-5.656l-1.42-1.42M9 10.5a2.993 2.993 0 00.72 4.712M2.458 12a10.026 10.026 0 013.208-4.456M21.542 12A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 bg-slate-900/50 px-6 py-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="rounded-md px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={processing}
                            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Salvando...
                                </>
                            ) : 'Cadastrar Membro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}