import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from '@inertiajs/react';

const VESSELS = [
    { id: 'AS', name: 'Atlântico Sul', prefix: 'AS' },
    { id: 'CM1', name: 'Ciências do Mar 1', prefix: 'CM1' },
    { id: 'LL', name: 'Lancha Larus', prefix: 'LL' },
];

export default function CreateWorkOrderModal({ isOpen, onClose, equipments = [] }) {
    const [mounted, setMounted] = useState(false);
    
    // Estados visuais para ajudar na filtragem
    const [selectedVesselPrefix, setSelectedVesselPrefix] = useState('');
    const [selectedEquipmentDetails, setSelectedEquipmentDetails] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        equipment_id: '',
        description: '',
        maintenance_type: 'corrective',
        priority: 'medium',
        status: 'open',
        periodicity: '',
        estimated_hours: '',
        vendor_name: '',
        created_at: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Atualiza os dados automáticos ao selecionar um equipamento
    const handleEquipmentChange = (e) => {
        const eqId = e.target.value;
        setData('equipment_id', eqId);

        const eq = equipments.find(x => x.id === eqId);
        if (eq) {
            setSelectedEquipmentDetails(eq);
        } else {
            setSelectedEquipmentDetails(null);
        }
    };

    // Filtra os equipamentos com base na embarcação selecionada
    const filteredEquipments = selectedVesselPrefix 
        ? equipments.filter(eq => eq.vessel?.prefix === selectedVesselPrefix || eq.tag_number?.startsWith(selectedVesselPrefix))
        : equipments;

    const submit = (e) => {
        e.preventDefault();
        post(route('work-orders.store'), {
            onSuccess: () => {
                reset();
                setSelectedVesselPrefix('');
                setSelectedEquipmentDetails(null);
                onClose();
            },
        });
    };

    if (!isOpen || !mounted) return null;

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
                        <h3 className="text-base font-bold text-white">Nova Ordem de Serviço</h3>
                        <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                        <form id="createOsForm" onSubmit={submit} className="space-y-6">
                            
                            {/* BLOCO DE SELEÇÃO DE EQUIPAMENTO */}
                            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Identificação do Ativo</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Filtrar por Embarcação</label>
                                        <select 
                                            value={selectedVesselPrefix} 
                                            onChange={e => {
                                                setSelectedVesselPrefix(e.target.value);
                                                setData('equipment_id', '');
                                                setSelectedEquipmentDetails(null);
                                            }} 
                                            className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                        >
                                            <option value="">Todas as Embarcações</option>
                                            {VESSELS.map(v => <option key={v.id} value={v.prefix}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Equipamento <span className="text-red-500">*</span></label>
                                        <select 
                                            value={data.equipment_id} 
                                            onChange={handleEquipmentChange} 
                                            className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                        >
                                            <option value="">Selecione o Equipamento...</option>
                                            {filteredEquipments.map(eq => (
                                                <option key={eq.id} value={eq.id}>{eq.tag_number ? `[${eq.tag_number}] ` : ''}{eq.name}</option>
                                            ))}
                                        </select>
                                        {errors.equipment_id && <span className="text-xs text-red-500">{errors.equipment_id}</span>}
                                    </div>
                                </div>

                                {selectedEquipmentDetails && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-blue-500/20 mt-3">
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">TAG</label>
                                            <span className="text-sm font-mono text-blue-300">{selectedEquipmentDetails.tag_number || '-'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">Marca</label>
                                            <span className="text-sm text-slate-300">{selectedEquipmentDetails.manufacturer || selectedEquipmentDetails.marca || '-'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">Modelo</label>
                                            <span className="text-sm text-slate-300">{selectedEquipmentDetails.model || selectedEquipmentDetails.modelo || '-'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* BLOCO DA ORDEM DE SERVIÇO */}
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
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Status Inicial <span className="text-red-500">*</span></label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="open">Aberto (Não Iniciado)</option>
                                        <option value="in_progress">Em Andamento</option>
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

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Descrição do Problema / Serviço <span className="text-red-500">*</span></label>
                                <textarea 
                                    rows="3" 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="Descreva detalhadamente o que precisa ser feito..." 
                                    className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                />
                                {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
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

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Data da OS <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        value={data.created_at} 
                                        onChange={e => setData('created_at', e.target.value)}
                                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 [color-scheme:dark]"
                                    />
                                    {errors.created_at && <span className="text-xs text-red-500">{errors.created_at}</span>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Terceirizado <span className="text-slate-600">(Opcional)</span></label>
                                    <input 
                                        type="text" 
                                        value={data.vendor_name} 
                                        onChange={e => setData('vendor_name', e.target.value)}
                                        placeholder="Ex: Naval Alpha" 
                                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" 
                                    />
                                </div>
                            </div>

                        </form>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                        <button onClick={onClose} disabled={processing} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
                        <button type="submit" form="createOsForm" disabled={processing} className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50">
                            {processing ? 'Salvando...' : 'Salvar Ordem de Serviço'}
                        </button>
                    </div>

                </div>
            </div>
        </>,
        document.body
    );
}