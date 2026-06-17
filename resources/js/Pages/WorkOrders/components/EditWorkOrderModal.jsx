import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';

export default function EditWorkOrderModal({ isOpen, onClose, osData, equipments = [] }) {
    const [mounted, setMounted] = useState(false);
    
    const { data, setData, put, processing, errors, reset } = useForm({
        equipment_id: '',
        description: '',
        maintenance_type: '',
        priority: '',
        status: '',
        periodicity: '',
        vendor_name: '',
        estimated_hours: '',
        created_at: '',
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (osData && isOpen) {
            const formattedDate = osData.created_at 
                ? osData.created_at.substring(0, 10)
                : '';

            setData({
                equipment_id: osData.equipment_id || '',
                description: osData.description || '',
                maintenance_type: osData.maintenance_type || 'corrective',
                priority: osData.priority || 'medium',
                status: osData.status || 'open',
                periodicity: osData.periodicity || '',
                vendor_name: osData.vendor_name || '',
                estimated_hours: osData.estimated_hours || '',
                created_at: formattedDate,
            });
        }
    }, [osData, isOpen]);

    const submit = (e) => {
        e.preventDefault();
        put(route('work-orders.update', osData.id), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const handleDelete = () => {
        if (confirm('Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação não pode ser desfeita.')) {
            router.delete(route('work-orders.destroy', osData.id), {
                onSuccess: () => onClose(),
            });
        }
    };

    if (!isOpen || !mounted || !osData) return null;

    const currentEq = equipments.find(x => x.id === data.equipment_id);
    const vesselPrefix = currentEq?.vessel?.tag || currentEq?.vessel?.prefix || '-';

    return createPortal(
        <>
            <style>{`
                @keyframes overlayFade { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
                @keyframes modalSlide { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .animate-overlay { animation: overlayFade 0.3s ease-out forwards; }
                .animate-modal { animation: modalSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md animate-overlay p-4">
                <div className="relative flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700 animate-modal">
                    
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                Edição de Ordem de Serviço
                                <span className="bg-slate-800 text-blue-400 px-2 py-0.5 rounded text-xs font-mono border border-slate-700">
                                    {osData.os_number}
                                </span>
                            </h3>
                        </div>
                        
                        <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                        <form id="editOsForm" onSubmit={submit} className="space-y-6">
                            
                            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Identificação do Ativo</h4>
                                
                                <div className="grid grid-cols-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Equipamento <span className="text-red-500">*</span></label>
                                    <select 
                                        value={data.equipment_id} 
                                        onChange={e => setData('equipment_id', e.target.value)} 
                                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                    >
                                        <option value="">Selecione o Equipamento...</option>
                                        {equipments.map(eq => (
                                            <option key={eq.id} value={eq.id}>{eq.tag_number ? `[${eq.tag_number}] ` : ''}{eq.name}</option>
                                        ))}
                                    </select>
                                    {errors.equipment_id && <span className="text-xs text-red-500">{errors.equipment_id}</span>}
                                </div>
                                
                                {currentEq && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 pt-3 border-t border-slate-700/50 mt-3">
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">Embarcação</label>
                                            <span className="text-sm font-bold text-white">{vesselPrefix}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">TAG</label>
                                            <span className="text-sm font-mono text-blue-300">{currentEq.tag_number || '-'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">Marca</label>
                                            <span className="text-sm text-slate-300">{currentEq.manufacturer || currentEq.marca || '-'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">Modelo</label>
                                            <span className="text-sm text-slate-300">{currentEq.model || currentEq.modelo || '-'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Tipo de Manut. <span className="text-red-500">*</span></label>
                                    <select value={data.maintenance_type} onChange={e => setData('maintenance_type', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="corrective">Corretiva</option>
                                        <option value="preventive">Preventiva</option>
                                        <option value="predictive">Preditiva</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Prioridade <span className="text-red-500">*</span></label>
                                    <select value={data.priority} onChange={e => setData('priority', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Status <span className="text-red-500">*</span></label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="open">Aberto (Não Iniciado)</option>
                                        <option value="in_progress">Em Andamento</option>
                                        <option value="completed">Concluída</option>
                                        <option value="cancelled">Cancelada</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Periodicidade</label>
                                    <select value={data.periodicity} onChange={e => setData('periodicity', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="">Nenhuma (Avulsa)</option>
                                        <option value="monthly">Mensal</option>
                                        <option value="bimonthly">Bimestral</option>
                                        <option value="quarterly">Trimestral</option>
                                        <option value="semiannual">Semestral</option>
                                        <option value="annual">Anual</option>
                                        <option value="docking">Docagem</option>
                                    </select>
                                    {errors.periodicity && <span className="text-xs text-red-500">{errors.periodicity}</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <div className="sm:col-span-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                        SS Vinculada
                                    </label>
                                    <div className={`w-full rounded-md border p-2 text-sm ${osData.ss_number ? 'border-emerald-700 bg-emerald-950/30 text-emerald-400' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                                        {osData.ss_number || 'Nenhuma'}
                                    </div>
                                </div>

                                <div className="sm:col-span-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Horas Estimadas (Hh)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        min="0"
                                        value={data.estimated_hours} 
                                        onChange={e => setData('estimated_hours', e.target.value)}
                                        placeholder="Ex: 2.5" 
                                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" 
                                    />
                                    {errors.estimated_hours && <span className="text-xs text-red-500">{errors.estimated_hours}</span>}
                                </div>

                                <div className="sm:col-span-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Data da OS <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        value={data.created_at} 
                                        onChange={e => setData('created_at', e.target.value)}
                                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 [color-scheme:dark]"
                                    />
                                    {errors.created_at && <span className="text-xs text-red-500">{errors.created_at}</span>}
                                </div>

                                <div className="sm:col-span-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Terceirizado</label>
                                    <input 
                                        type="text" 
                                        value={data.vendor_name} 
                                        onChange={e => setData('vendor_name', e.target.value)}
                                        placeholder="Ex: Naval Alpha" 
                                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Descrição do Problema / Serviço <span className="text-red-500">*</span></label>
                                <textarea 
                                    rows="4" 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)}
                                    className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                />
                                {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                            </div>

                        </form>
                    </div>

                    <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                        <button 
                            type="button" 
                            onClick={handleDelete}
                            disabled={processing}
                            className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir OS
                        </button>
                        
                        <div className="flex gap-3">
                            <button onClick={onClose} disabled={processing} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
                            <button type="submit" form="editOsForm" disabled={processing} className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50">
                                {processing ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </>,
        document.body
    );
}