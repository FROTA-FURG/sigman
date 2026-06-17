import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';

export default function EditServiceRequestModal({ isOpen, onClose, srData, vessels = [], equipments = [] }) {
    const [mounted, setMounted] = useState(false);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [cnpjError, setCnpjError] = useState('');
    const [selectedEquipmentDetails, setSelectedEquipmentDetails] = useState(null);
    
    const priorities = [
        { id: 'low', label: 'Baixa (Rotina)', textColor: 'text-slate-400', bgColor: 'bg-slate-500/10', dotColor: 'bg-slate-400', ringColor: 'ring-slate-500/20' },
        { id: 'normal', label: 'Normal', textColor: 'text-green-500', bgColor: 'bg-green-500/10', dotColor: 'bg-green-500', ringColor: 'ring-green-500/20' },
        { id: 'high', label: 'Alta (Impacta Operação)', textColor: 'text-orange-500', bgColor: 'bg-orange-500/10', dotColor: 'bg-orange-500', shadow: 'shadow-[0_0_5px_#f97316]', ringColor: 'ring-orange-500/20' },
        { id: 'urgent', label: 'Urgente (Risco/Parada)', textColor: 'text-red-500', bgColor: 'bg-red-500/10', dotColor: 'bg-red-500', shadow: 'shadow-[0_0_5px_#ef4444]', ringColor: 'ring-red-500/20' },
    ];

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        vessel_id: '',
        equipment_id: '',
        tag_number: '',
        description: '',
        requester_name: '',
        desired_date: '',
        maintenance_type: 'corrective',
        priority: 'normal',
        status: 'pending', // Agora o padrão é pendente
        budget: '', // Novo campo de orçamento
        vendor_cnpj: '',
        vendor_name: '',
    });

    const selectedPriority = priorities.find(p => p.id === data.priority) || priorities[1];

    const maskCNPJ = (value) => {
        return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
    };

    const isValidCNPJ = (cnpj) => {
        cnpj = cnpj.replace(/[^\d]+/g, '');
        if (cnpj === '' || cnpj.length !== 14) return false;
        if (/^(\d)\1+$/.test(cnpj)) return false; 
        let length = cnpj.length - 2;
        let numbers = cnpj.substring(0, length);
        let digits = cnpj.substring(length);
        let sum = 0;
        let pos = length - 7;
        for (let i = length; i >= 1; i--) { sum += numbers.charAt(length - i) * pos--; if (pos < 2) pos = 9; }
        let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(0))) return false;
        length = length + 1;
        numbers = cnpj.substring(0, length);
        sum = 0;
        pos = length - 7;
        for (let i = length; i >= 1; i--) { sum += numbers.charAt(length - i) * pos--; if (pos < 2) pos = 9; }
        result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(1))) return false;
        return true;
    };

    const handleCnpjChange = (e) => {
        const maskedValue = maskCNPJ(e.target.value);
        setData('vendor_cnpj', maskedValue);
        if (maskedValue.length === 18) {
            setCnpjError(!isValidCNPJ(maskedValue) ? 'CNPJ inválido. Verifique os números digitados.' : '');
        } else {
            setCnpjError('');
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (srData && isOpen) {
            clearErrors();
            setCnpjError('');

            const formattedDate = srData.desired_date ? srData.desired_date.split('T')[0] : '';

            setData({
                vessel_id: srData.vessel_id || '',
                equipment_id: srData.equipment_id || '',
                tag_number: srData.tag_number || '',
                description: srData.description || '',
                requester_name: srData.requester_name || '',
                desired_date: formattedDate,
                maintenance_type: srData.maintenance_type || 'corrective',
                priority: srData.priority || 'normal',
                status: srData.status || 'pending',
                budget: srData.budget || '', // Preenche se já existir
                vendor_cnpj: srData.vendor_cnpj || '',
                vendor_name: srData.vendor_name || '',
            });

            if (srData.equipment_id) {
                const eq = equipments.find(x => x.id === srData.equipment_id);
                setSelectedEquipmentDetails(eq || null);
            } else {
                setSelectedEquipmentDetails(null);
            }
        }
    }, [srData, isOpen]);

    if (!isOpen || !mounted || !srData) return null;

    const handleVesselChange = (e) => {
        setData('vessel_id', e.target.value);
        setData('equipment_id', '');
        setData('tag_number', '');
        setSelectedEquipmentDetails(null);
    };

    const handleEquipmentChange = (e) => {
        const eqId = e.target.value;
        const eq = equipments.find(x => x.id === eqId);
        if (eq) {
            setSelectedEquipmentDetails(eq);
            setData(prev => ({ ...prev, equipment_id: eqId, tag_number: eq.tag_number || '' }));
        } else {
            setSelectedEquipmentDetails(null);
            setData(prev => ({ ...prev, equipment_id: '', tag_number: '' }));
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (data.vendor_cnpj && !isValidCNPJ(data.vendor_cnpj)) {
            setCnpjError('Por favor, corrija o CNPJ antes de enviar.');
            return; 
        }

        put(route('service-requests.update', srData.id), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    // A Mágica de Gerar OS
    const handleGenerateOS = () => {
        if (data.vendor_cnpj && !isValidCNPJ(data.vendor_cnpj)) {
            setCnpjError('Por favor, corrija o CNPJ antes de enviar.');
            return; 
        }

        put(route('service-requests.update', srData.id), {
            onSuccess: () => {
                let mappedPriority = data.priority;
                if (data.priority === 'normal') mappedPriority = 'medium';
                if (data.priority === 'urgent') mappedPriority = 'critical';
                // ------------------------------------------

                router.post(route('work-orders.store'), {
                    equipment_id: data.equipment_id,
                    ss_number: srData.ss_number,
                    description: data.description,
                    maintenance_type: data.maintenance_type,
                    priority: mappedPriority, 
                    status: 'open',
                    vendor_name: data.vendor_name,
                    created_at: new Date().toISOString().split('T')[0],
                }, {
                    onSuccess: () => {
                        reset();
                        onClose();
                    },
                    onError: (errosInvisiveis) => {
                        alert("O Laravel barrou a criação da OS pelo seguinte motivo:\n\n" + JSON.stringify(errosInvisiveis, null, 2));
                    }
                });
            },
        });
    };

    const handleDelete = () => {
        if (confirm('Tem certeza que deseja excluir esta Solicitação de Serviço? Esta ação não pode ser desfeita.')) {
            router.delete(route('service-requests.destroy', srData.id), {
                onSuccess: () => onClose(),
            });
        }
    };

    const filteredEquipments = data.vessel_id ? equipments.filter(eq => eq.vessel_id === data.vessel_id) : equipments;

    const renderPriorityBadge = (p) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${p.bgColor} ${p.textColor} ring-1 ring-inset ${p.ringColor}`}>
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${p.dotColor} ${p.shadow || ''}`}></span>
            {p.label}
        </span>
    );

    // Variável que checa se pode gerar a OS (Aprovada + Com Valor + Com Equipamento)
    const canGenerateOS = data.status === 'approved' && data.budget && String(data.budget).trim() !== '' && data.equipment_id;

    return createPortal(
        <>
            <style>{`
                @keyframes overlayFade { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
                @keyframes modalSlide { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .animate-overlay { animation: overlayFade 0.3s ease-out forwards; }
                .animate-modal { animation: modalSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md animate-overlay p-4">
                <div className="relative flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700 animate-modal">
                    
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                Edição de Solicitação de Serviço
                                <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded text-xs font-mono border border-slate-700">
                                    SS #{srData.id.substring(0,8)}
                                </span>
                            </h3>
                        </div>
                        <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                        <form id="editSrForm" onSubmit={submit} className="space-y-6">
                            
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Localização e Equipamento</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Embarcação / Local <span className="text-red-500">*</span></label>
                                        <select value={data.vessel_id} onChange={handleVesselChange} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500">
                                            <option value="">Selecione a Embarcação...</option>
                                            {vessels.map(v => <option key={v.id} value={v.id}>{v.name} ({v.tag})</option>)}
                                        </select>
                                        {errors.vessel_id && <span className="text-xs text-red-500">{errors.vessel_id}</span>}
                                    </div>
                                    
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Equipamento <span className="text-slate-500">(Opcional para salvar, Obrigatório para OS)</span></label>
                                        <select value={data.equipment_id} onChange={handleEquipmentChange} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500 disabled:opacity-50" disabled={!data.vessel_id}>
                                            <option value="">(Sem equipamento / Geral)</option>
                                            {filteredEquipments.map(eq => (
                                                <option key={eq.id} value={eq.id}>{eq.tag_number ? `[${eq.tag_number}] ` : ''}{eq.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="relative">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Prioridade</label>
                                    <button type="button" onClick={() => setIsPriorityOpen(!isPriorityOpen)} className="flex w-full items-center justify-between rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                                        {renderPriorityBadge(selectedPriority)}
                                        <svg className={`ml-2 h-4 w-4 text-slate-500 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {isPriorityOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsPriorityOpen(false)}></div>
                                            <ul className="absolute z-20 mt-1 w-full rounded-md border border-slate-700 bg-slate-900 py-1 shadow-xl ring-1 ring-black ring-opacity-5">
                                                {priorities.map((p) => (
                                                    <li key={p.id} onClick={() => { setData('priority', p.id); setIsPriorityOpen(false); }} className="cursor-pointer px-3 py-2 hover:bg-slate-800 transition">
                                                        {renderPriorityBadge(p)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Tipo de Manutenção <span className="text-red-500">*</span></label>
                                    <select value={data.maintenance_type} onChange={e => setData('maintenance_type', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500">
                                        <option value="corrective">Corretiva</option>
                                        <option value="preventive">Preventiva</option>
                                        <option value="predictive">Preditiva</option>
                                    </select>
                                </div>

                                {/* APENAS DUAS OPÇÕES DE STATUS AGORA */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Status <span className="text-red-500">*</span></label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500">
                                        <option value="pending">Pendente (Aguardando Retorno)</option>
                                        <option value="approved">Aprovada (Com Orçamento)</option>
                                        <option value="rejected">Rejeitada</option>
                                    </select>
                                </div>
                            </div>

                            {/* NOVO BLOCO CONDICIONAL DO ORÇAMENTO */}
                            {data.status === 'approved' && (
                                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 animate-overlay">
                                    <label className="mb-1 block text-xs font-medium text-yellow-400">Valor do Orçamento (R$) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={data.budget} 
                                        onChange={e => setData('budget', e.target.value)} 
                                        placeholder="Ex: 1500.50" 
                                        className="w-full rounded-md border border-yellow-700/50 bg-slate-950 p-2 text-sm text-yellow-100 focus:border-yellow-500 focus:ring-yellow-500" 
                                    />
                                    <p className="mt-1 text-[10px] text-slate-400">O valor do orçamento deve ser preenchido para habilitar a geração de OS.</p>
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Descrição do Problema / Serviço Solicitado <span className="text-red-500">*</span></label>
                                <textarea rows="3" value={data.description} onChange={e => setData('description', e.target.value)} className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500"></textarea>
                                {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Nome do Solicitante</label>
                                    <div className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300">
                                        {data.requester_name || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Data Desejada para Resolução <span className="text-slate-500">(Opcional)</span></label>
                                    <input type="date" value={data.desired_date} onChange={e => setData('desired_date', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500 [color-scheme:dark]" />
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4 mt-2">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Empresa / Terceirizado (Opcional)</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">CNPJ</label>
                                        <input type="text" value={data.vendor_cnpj} onChange={handleCnpjChange} placeholder="Ex: 00.000.000/0000-00" className={`w-full rounded-md border p-2 text-sm text-slate-300 focus:ring-1 focus:outline-none transition bg-slate-950 ${cnpjError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'}`} />
                                        {cnpjError && <span className="text-xs text-red-500 mt-1 block font-medium">{cnpjError}</span>}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Nome da Empresa</label>
                                        <input type="text" value={data.vendor_name} onChange={e => setData('vendor_name', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500" />
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>

                    <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                        <button type="button" onClick={handleDelete} disabled={processing} className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir
                        </button>
                        
                        <div className="flex gap-3">
                            <button onClick={onClose} disabled={processing} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
                            <button type="submit" form="editSrForm" disabled={processing} className="flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50">
                                {processing ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            
                            {/* BOTÃO GERAR OS COM LOGICA SOMBREADA */}
                            <button 
                                type="button" 
                                onClick={handleGenerateOS} 
                                disabled={processing || !canGenerateOS} 
                                className={`flex items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
                                    canGenerateOS 
                                    ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                }`}
                                title={!canGenerateOS ? "Aprove a SS, insira o orçamento e selecione um equipamento para gerar a OS." : "Salvar e gerar OS"}
                            >
                                {processing ? 'Processando...' : 'Gerar OS ->'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </>,
        document.body
    );
}