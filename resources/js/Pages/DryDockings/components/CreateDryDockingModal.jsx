import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';

export default function CreateDryDockingModal({ isOpen, onClose, vessels = [] }) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        vessel_id: '',
        shipyard: '',
        planned_start_date: '',
        planned_end_date: '',
        budget: '',
        status: 'planning', // Status padrão ao criar
        notes: '',
    });

    
    useEffect(() => {
        if (isOpen) {
            reset();
            clearErrors();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('dry-dockings.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 flex flex-col max-h-[90vh]">
                
                {/* Cabeçalho */}
                <div className="flex items-center justify-between border-b border-slate-700/50 p-5 shrink-0 bg-slate-900/30">
                    <div>
                        <h3 className="text-lg font-bold text-white">Registrar Nova Docagem</h3>
                        <p className="text-sm text-slate-400">Inicie o planejamento de estaleiro para uma embarcação.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-800">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Formulário */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-[#0b203c]">
                    <form id="create-docking-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Seleção de Embarcação */}
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-400">Embarcação <span className="text-red-500">*</span></label>
                                <select 
                                    value={data.vessel_id}
                                    onChange={e => setData('vessel_id', e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                >
                                    <option value="">Selecione o navio...</option>
                                    {vessels.map(vessel => (
                                        <option key={vessel.id} value={vessel.id}>
                                            {vessel.name} ({vessel.tag})
                                        </option>
                                    ))}
                                </select>
                                {errors.vessel_id && <span className="text-xs text-red-500 mt-1 block">{errors.vessel_id}</span>}
                            </div>

                            {/* Datas Planejadas */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Data de Início Prevista <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    value={data.planned_start_date}
                                    onChange={e => setData('planned_start_date', e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 [color-scheme:dark]" 
                                />
                                {errors.planned_start_date && <span className="text-xs text-red-500 mt-1 block">{errors.planned_start_date}</span>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Data de Fim Prevista <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    value={data.planned_end_date}
                                    onChange={e => setData('planned_end_date', e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 [color-scheme:dark]" 
                                />
                                {errors.planned_end_date && <span className="text-xs text-red-500 mt-1 block">{errors.planned_end_date}</span>}
                            </div>

                            {/* Estaleiro */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Estaleiro (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Estaleiro Atlântico Sul"
                                    value={data.shipyard}
                                    onChange={e => setData('shipyard', e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" 
                                />
                                {errors.shipyard && <span className="text-xs text-red-500 mt-1 block">{errors.shipyard}</span>}
                            </div>

                            {/* Orçamento */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Orçamento Estimado (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="Ex: 1500000.00"
                                    value={data.budget}
                                    onChange={e => setData('budget', e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" 
                                />
                                {errors.budget && <span className="text-xs text-red-500 mt-1 block">{errors.budget}</span>}
                            </div>

                            {/* Status Inicial */}
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-400">Fase Atual</label>
                                <select 
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                >
                                    <option value="planning">Em Planejamento (Definindo escopo e datas)</option>
                                    <option value="quoting">Em Cotação (Buscando estaleiros)</option>
                                </select>
                            </div>

                            {/* Escopo / Notas */}
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-400">Escopo Geral / Observações</label>
                                <textarea 
                                    rows="3" 
                                    placeholder="Ex: Renovação de classe de 5 anos. Foco em tratamento de casco e revisão dos propulsores..."
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                />
                                {errors.notes && <span className="text-xs text-red-500 mt-1 block">{errors.notes}</span>}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Rodapé com Botões */}
                <div className="border-t border-slate-700/50 p-4 shrink-0 bg-slate-900/50 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        form="create-docking-form"
                        type="submit" 
                        disabled={processing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition shadow-sm disabled:opacity-50 flex items-center"
                    >
                        {processing ? 'Salvando...' : 'Salvar Planejamento'}
                    </button>
                </div>
            </div>
        </div>
    );
}