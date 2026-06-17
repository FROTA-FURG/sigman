import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, usePage } from '@inertiajs/react';

export default function CreateServiceRequestModal({ isOpen, onClose, vessels = [], equipments = [], users = [] }) {
    const { auth } = usePage().props; // Captura os dados do usuário logado
    const [mounted, setMounted] = useState(false);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [cnpjError, setCnpjError] = useState('');

    // Estado para exibir os detalhes do equipamento na tela
    const [selectedEquipmentDetails, setSelectedEquipmentDetails] = useState(null);
    
    const priorities = [
        { id: 'low', label: 'Baixa (Rotina)', textColor: 'text-slate-400', bgColor: 'bg-slate-500/10', dotColor: 'bg-slate-400', ringColor: 'ring-slate-500/20' },
        { id: 'normal', label: 'Normal', textColor: 'text-green-500', bgColor: 'bg-green-500/10', dotColor: 'bg-green-500', ringColor: 'ring-green-500/20' },
        { id: 'high', label: 'Alta (Impacta Operação)', textColor: 'text-orange-500', bgColor: 'bg-orange-500/10', dotColor: 'bg-orange-500', shadow: 'shadow-[0_0_5px_#f97316]', ringColor: 'ring-orange-500/20' },
        { id: 'urgent', label: 'Urgente (Risco/Parada)', textColor: 'text-red-500', bgColor: 'bg-red-500/10', dotColor: 'bg-red-500', shadow: 'shadow-[0_0_5px_#ef4444]', ringColor: 'ring-red-500/20' },
    ];

    // Nome do usuário logado (tenta pegar name, username ou nickname)
    const loggedUserName = auth.user.name || auth.user.username || auth.user.nickname || 'Usuário Logado';

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        vessel_id: '',
        equipment_id: '',
        tag_number: '',
        description: '',
        requester_name: loggedUserName, // Preenche automaticamente com o usuário logado
        desired_date: '',
        maintenance_type: 'corrective',
        priority: 'normal', 
        status: 'pending',
        vendor_cnpj: '', // Novo campo
        vendor_name: '', // Novo campo
    });

    const selectedPriority = priorities.find(p => p.id === data.priority) || priorities[1];

    // Máscara: Formata o texto para 00.000.000/0000-00 enquanto digita
    const maskCNPJ = (value) => {
        return value
            .replace(/\D/g, '') // Remove tudo o que não é dígito
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18); // Limita o tamanho máximo
    };

    // Validador: Faz o cálculo matemático para aprovar o CNPJ
    const isValidCNPJ = (cnpj) => {
        cnpj = cnpj.replace(/[^\d]+/g, '');
        
        if (cnpj === '' || cnpj.length !== 14) return false;
        
        // Elimina CNPJs inválidos conhecidos (todos os números iguais)
        if (/^(\d)\1+$/.test(cnpj)) return false; 

        // Valida DVs (Dígitos Verificadores)
        let length = cnpj.length - 2;
        let numbers = cnpj.substring(0, length);
        let digits = cnpj.substring(length);
        let sum = 0;
        let pos = length - 7;

        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }
        let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(0))) return false;

        length = length + 1;
        numbers = cnpj.substring(0, length);
        sum = 0;
        pos = length - 7;
        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }
        result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(1))) return false;

        return true;
    };

    const handleCnpjChange = (e) => {
        const maskedValue = maskCNPJ(e.target.value);
        setData('vendor_cnpj', maskedValue);

        // Só valida se o usuário terminou de digitar os 14 números (18 caracteres com a máscara)
        if (maskedValue.length === 18) {
            if (!isValidCNPJ(maskedValue)) {
                setCnpjError('CNPJ inválido. Verifique os números digitados.');
            } else {
                setCnpjError(''); 
            }
        } else {
            setCnpjError('');
        }
    };

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            reset();
            clearErrors();
            setSelectedEquipmentDetails(null);
        }
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

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

    const handleSubmit = (e) => {
        if (data.vendor_cnpj && !isValidCNPJ(data.vendor_cnpj)) {
            setCnpjError('Por favor, corrija o CNPJ antes de enviar.');
            return; 
        }

        post(route('service-requests.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setCnpjError(''); 
                onClose();
            },
        });
    };

    const renderPriorityBadge = (p) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${p.bgColor} ${p.textColor} ring-1 ring-inset ${p.ringColor}`}>
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${p.dotColor} ${p.shadow || ''}`}></span>
            {p.label}
        </span>
    );

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
                        <h3 className="text-base font-bold text-white">Nova Solicitação de Serviço</h3>
                        <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                        <form id="sr-form" onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* BLOCO DE IDENTIFICAÇÃO */}
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Localização e Equipamento</h4>
                                
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Embarcação / Local <span className="text-red-500">*</span></label>
                                        <select 
                                            value={data.vessel_id} 
                                            onChange={handleVesselChange} 
                                            className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500"
                                        >
                                            <option value="">Selecione a Embarcação...</option>
                                            {vessels.map(v => <option key={v.id} value={v.id}>{v.name} ({v.tag})</option>)}
                                        </select>
                                        {errors.vessel_id && <span className="text-xs text-red-500">{errors.vessel_id}</span>}
                                    </div>
                                    
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Equipamento <span className="text-slate-500">(Opcional)</span></label>
                                        <select 
                                            value={data.equipment_id} 
                                            onChange={handleEquipmentChange} 
                                            className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500 disabled:opacity-50"
                                            disabled={!data.vessel_id}
                                        >
                                            <option value="">(Sem equipamento / Geral)</option>
                                            {equipments.filter(eq => eq.vessel_id === data.vessel_id).map(eq => (
                                                <option key={eq.id} value={eq.id}>{eq.tag_number ? `[${eq.tag_number}] ` : ''}{eq.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {selectedEquipmentDetails && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-emerald-500/20 mt-3">
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">TAG Vinculada</label>
                                            <span className="text-sm font-mono text-emerald-300">{selectedEquipmentDetails.tag_number || '-'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">Marca / Fabricante</label>
                                            <span className="text-sm text-slate-300">{selectedEquipmentDetails.manufacturer || selectedEquipmentDetails.marca || '-'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-500 uppercase">Modelo</label>
                                            <span className="text-sm text-slate-300">{selectedEquipmentDetails.model || selectedEquipmentDetails.modelo || '-'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* BLOCO DE INFORMAÇÕES DA SOLICITAÇÃO */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Tipo de Manutenção</label>
                                    <select value={data.maintenance_type} onChange={e => setData('maintenance_type', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500">
                                        <option value="corrective">Corretiva (Falha ou Quebra)</option>
                                        <option value="preventive">Preventiva (Melhoria ou Rotina)</option>
                                        <option value="predictive">Preditiva (Análise/Inspeção)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Descrição do Problema / Serviço Solicitado <span className="text-red-500">*</span></label>
                                <textarea rows="3" value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Descreva o sintoma apresentado, ruídos, vazamentos ou o serviço necessário..." className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500"></textarea>
                                {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Nome do Solicitante</label>
                                    {/* CAMPO TRAVADO (READONLY) COM O USUÁRIO LOGADO */}
                                    <input 
                                        type="text" 
                                        value={data.requester_name} 
                                        readOnly
                                        className="w-full rounded-md border border-slate-700/50 bg-slate-800 p-2 text-sm text-slate-400 cursor-not-allowed" 
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Data Desejada para Resolução <span className="text-slate-500">(Opcional)</span></label>
                                    <input type="date" value={data.desired_date} onChange={e => setData('desired_date', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500 [color-scheme:dark]" />
                                </div>
                            </div>

                            {/* NOVO BLOCO: FORNECEDOR / EMPRESA */}
                              <div className="border-t border-slate-800 pt-4 mt-2">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Empresa / Terceirizado (Opcional)</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">CNPJ</label>
                                        <input 
                                            type="text" 
                                            value={data.vendor_cnpj} 
                                            onChange={handleCnpjChange} 
                                            placeholder="Ex: 00.000.000/0000-00" 
                                            className={`w-full rounded-md border p-2 text-sm text-slate-300 focus:ring-1 focus:outline-none transition bg-slate-950
                                                ${cnpjError 
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                                    : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'
                                                }`} 
                                        />
                                        {cnpjError && (
                                            <span className="text-xs text-red-500 mt-1 block font-medium">
                                                {cnpjError}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Nome da Empresa</label>
                                        <input 
                                            type="text" 
                                            value={data.vendor_name} 
                                            onChange={e => setData('vendor_name', e.target.value)} 
                                            placeholder="Ex: Prestadora Naval SS" 
                                            className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-emerald-500" 
                                        />
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                        <button onClick={onClose} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition">Cancelar</button>
                        <button form="sr-form" type="submit" disabled={processing} className="flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50">
                            {processing ? 'Enviando...' : 'Enviar Solicitação'}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}