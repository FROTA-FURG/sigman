import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function EditVesselModal({ isOpen, onClose, vessel }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        name: '',
        tag: '',
        type: '',
        builder: '',
        year: '',
        crew_capacity: '',
        status: 'Operacional',
        navigation_status: 'Atracada',
    });

    useEffect(() => {
        if (vessel && isOpen) {
            setData({
                name: vessel.name || '',
                tag: vessel.tag || '',
                type: vessel.type || '',
                builder: vessel.builder === 'Não informado' ? '' : (vessel.builder || ''),
                year: vessel.year === 'Não informado' ? '' : (vessel.year || ''),
                crew_capacity: vessel.crewCapacity === 'Não informado' ? '' : (vessel.crewCapacity || ''),
                status: vessel.status || 'Operacional',
                navigation_status: vessel.navigationStatus || 'Atracada',
            });
        }
    }, [vessel, isOpen]);

    const submit = (e) => {
        e.preventDefault();
        
        put(route('vessels.update', vessel.id), {
            onSuccess: () => {
                onClose();
            },
            onError: (errosDoLaravel) => {
                console.error("O Laravel recusou a requisição. Erros:", errosDoLaravel);
            },
            onFinish: () => {
                console.log("Requisição finalizada.");
            }
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Data não disponível';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!isOpen || !vessel) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity p-4">
            <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col transform overflow-hidden rounded-2xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 transition-all">
                
                <div className="shrink-0 border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Editar Embarcação: {vessel.name}</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={submit} className="flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Embarcação</label>
                                <input 
                                    type="text" 
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.name ? 'border-red-500' : ''}`} 
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">TAG</label>
                                <input 
                                    type="text" 
                                    value={data.tag}
                                    onChange={e => setData('tag', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.tag ? 'border-red-500' : ''}`} 
                                />
                                {errors.tag && <p className="mt-1 text-xs text-red-500">{errors.tag}</p>}
                            </div>
                            
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo / Classe</label>
                                <input 
                                    type="text" 
                                    value={data.type}
                                    onChange={e => setData('type', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.type ? 'border-red-500' : ''}`} 
                                />
                                {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Construtor</label>
                                <input 
                                    type="text" 
                                    value={data.builder}
                                    onChange={e => setData('builder', e.target.value)}
                                    className="w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Ano de Construção</label>
                                <input 
                                    type="number" 
                                    value={data.year}
                                    onChange={e => setData('year', e.target.value)}
                                    className="w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Capacidade de Tripulação</label>
                                <input 
                                    type="number" 
                                    value={data.crew_capacity}
                                    onChange={e => setData('crew_capacity', e.target.value)}
                                    className="w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Status Operacional</label>
                                <select 
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.status ? 'border-red-500' : ''}`}
                                >
                                    <option value="Operacional">Operacional</option>
                                    <option value="Em Manutenção">Em Manutenção</option>
                                    <option value="Com Problema">Com Problema</option>
                                    <option value="Falha Crítica">Falha Crítica</option>
                                </select>
                            </div>
    
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Status de Navegação</label>
                                <select 
                                    value={data.navigation_status}
                                    onChange={e => setData('navigation_status', e.target.value)}
                                    className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${errors.navigation_status ? 'border-red-500' : ''}`}
                                >
                                    <option value="Atracada">Atracada</option>
                                    <option value="Navegando">Navegando</option>
                                    <option value="Ancorada">Ancorada</option>
                                </select>
                            </div>
                        </div>

                        {/* Bloco de Histórico (Só mostrar se os dados existirem na prop) */}
                        <div className="mt-6 rounded-lg bg-slate-900/50 p-4 border border-slate-800">
                            <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">Histórico do Registro</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="block text-slate-500">Criado em:</span>
                                    <span className="text-slate-300 font-medium">{formatDate(vessel.created_at)}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Última atualização:</span>
                                    <span className="text-slate-300 font-medium">{formatDate(vessel.updated_at)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-slate-800 bg-slate-900/50 px-6 py-4 flex justify-end">
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