import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from '@inertiajs/react';

// Nossas Constantes de Estrutura
const VESSELS = [
    { id: 'CMA', name: 'Atlântico Sul', prefix: 'AS' },
    { id: 'CM01', name: 'Ciências do Mar', prefix: 'CM1' }, // Sugestão de prefixo
    { id: 'LL', name: 'Lancha Larus', prefix: 'LL' },
];

const SECTIONS = [
    { id: 'CMA', name: 'Casa de Máquinas', prefix: 'CMA' },
    { id: 'PPA', name: 'Popa', prefix: 'PPA' },
];

const SYSTEMS = {
    'CMA': [
        { id: 'SPP', name: 'Sistema de Propulsão', prefix: 'SPP' },
        { id: 'LUB', name: 'Lubrificação', prefix: 'LUB' },
        { id: 'ACO', name: 'Ar Comprimido', prefix: 'ACO' },
        { id: 'SEL', name: 'Sistema Elétrico', prefix: 'SEL' },
    ],
    'PPA': [
        { id: 'ACN', name: 'Ancoragem', prefix: 'ACN' },
        { id: 'ACO', name: 'Ar Comprimido', prefix: 'ACO' },
        { id: 'EST', name: 'Estrutural', prefix: 'EST' },
    ]
};

export default function CreateNodeModal({ isOpen, onClose, selectedParent }) {
    const [mounted, setMounted] = useState(false);
    const [suggestedTag, setSuggestedTag] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        parent_id: '',
        parent_type: '',
        node_type: 'equipment',
        vessel_prefix: '',
        section: '',
        system: '',
        name: '',
        tag: '',
        status: 'active',
        criticality: 'A',
        manufacturer: '',
        model: '',
        series_number: '', 
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Tenta autocompletar a Embarcação baseada em onde o usuário clicou
    useEffect(() => {
        if (selectedParent) {
            let foundPrefix = '';
            
            if (selectedParent.tag) {
                foundPrefix = selectedParent.tag.split('-')[0];
            } else {
                const matchedVessel = VESSELS.find(v => selectedParent.name.includes(v.name));
                if (matchedVessel) foundPrefix = matchedVessel.prefix;
            }

            // Atualiza os dados do formulário com as informações do Pai
            setData(currentData => ({
                ...currentData,
                parent_id: selectedParent.id,
                // Se for 'vessel', envia 'vessel'. Se não, envia 'equipment'
                parent_type: selectedParent.type === 'vessel' ? 'vessel' : 'equipment',
                vessel_prefix: foundPrefix || currentData.vessel_prefix
            }));
        }
    }, [selectedParent]);

    // Geração Inteligente da TAG baseada nas seleções
    useEffect(() => {
        const vesselPrefix = data.vessel_prefix;
        const sectionPrefix = data.section;
        const systemPrefix = data.system;

        let equipmentPrefix = '';
        if (data.name) {
            const words = data.name.toUpperCase().replace(/\b(DE|DA|DO|E|A|O)\b/g, '').trim().split(/\s+/);
            equipmentPrefix = words.map(w => w[0]).join('').substring(0, 4);
        }

        const parts = [vesselPrefix, sectionPrefix, systemPrefix, equipmentPrefix].filter(Boolean);
        const newSuggestedTag = parts.join('-');
        
        setSuggestedTag(newSuggestedTag);

    }, [data.vessel_prefix, data.section, data.system, data.name]);

    const handleUseSuggestedTag = () => {
        setData('tag', suggestedTag);
    };

    const submit = (e) => {
        e.preventDefault();
        console.log("Equipment data: ",data)
        post(route('equipments.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!isOpen || !mounted) return null;

    const availableSystems = data.section && SYSTEMS[data.section] ? SYSTEMS[data.section] : [];

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
                        <h3 className="text-base font-bold text-white">Adicionar Novo Nó</h3>
                        <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                        {errors.parent_id && (
                            <div className="mb-4 rounded-md bg-red-500/10 p-3 ring-1 ring-red-500/20 text-red-400 text-xs font-semibold">
                                Erro: Você precisa selecionar uma Embarcação ou um Sistema na árvore antes de adicionar um item.
                            </div>
                        )}

                        {selectedParent && (
                            <div className="mb-6 rounded-md bg-blue-500/10 p-3 ring-1 ring-blue-500/20 flex items-start">
                                <svg className="h-5 w-5 text-blue-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-xs text-blue-300">Vinculando nó dentro de: <span className="font-bold">{selectedParent.name}</span></p>
                            </div>
                        )}

                        <form id="createNodeForm" onSubmit={submit} className="space-y-6">
                            
                            {/* Bloco de Categorização */}
                            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categorização da Árvore</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Tipo de Nó</label>
                                        <select value={data.node_type} onChange={e => setData('node_type', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                            <option value="system">Sistema</option>
                                            <option value="equipment">Equipamento</option>
                                            <option value="component">Componente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Embarcação</label>
                                        <select value={data.vessel_prefix} onChange={e => setData('vessel_prefix', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                            <option value="">Selecione...</option>
                                            {VESSELS.map(v => (
                                                <option key={v.id} value={v.prefix}>{v.name} ({v.prefix})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Seção</label>
                                        <select value={data.section} onChange={e => setData(d => ({ ...d, section: e.target.value, system: '' }))} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                            <option value="">Selecione...</option>
                                            {SECTIONS.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Sistema</label>
                                        <select value={data.system} onChange={e => setData('system', e.target.value)} disabled={!data.section} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 disabled:opacity-50">
                                            <option value="">Selecione...</option>
                                            {availableSystems.map(sys => <option key={sys.id} value={sys.id}>{sys.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Identificação */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Nome do Item <span className="text-red-500">*</span></label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Ex: Bomba de Óleo" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 placeholder-slate-600 focus:border-blue-500" />
                                </div>
                                <div className="relative">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">TAG do Equipamento <span className="text-red-500">*</span></label>
                                    <input type="text" value={data.tag} onChange={e => setData('tag', e.target.value)} placeholder="Ex: AS-CMA-LUB-BOMBA" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-blue-400 font-mono focus:border-blue-500" />
                                    {suggestedTag && data.tag !== suggestedTag && (
                                        <div className="absolute top-full left-0 mt-1 flex w-full items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5">
                                            <span className="text-[10px] font-mono text-emerald-400">Sugestão: {suggestedTag}</span>
                                            <button type="button" onClick={handleUseSuggestedTag} className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200">Usar Sugestão</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Número de Série</label>
                                <input type="text" value={data.series_number} onChange={e => setData('series_number', e.target.value)} placeholder="Ex: SN-987654" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 placeholder-slate-600 focus:border-blue-500" />
                            </div>

                            {/* Detalhes Técnicos - Oculta os 3 de fabricação se for Sistema */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Status Inicial</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="active">Operacional</option>
                                        <option value="inactive">Atenção / Inativo</option>
                                        <option value="in_maintenance">Em Manutenção</option>
                                        <option value="decommissioned">Descomissionado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Criticidade</label>
                                    <select value={data.criticality} onChange={e => setData('criticality', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="A">Classe A</option>
                                        <option value="B">Classe B</option>
                                        <option value="C">Classe C</option>
                                    </select>
                                </div>

                                {data.node_type !== 'system' && (
                                    <>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-400">Marca / Fabricante</label>
                                            <input type="text" value={data.manufacturer} onChange={e => setData('manufacturer', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-400">Modelo</label>
                                            <input type="text" value={data.model} onChange={e => setData('model', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                        <button onClick={onClose} disabled={processing} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50">Cancelar</button>
                        <button type="submit" form="createNodeForm" disabled={processing} className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">
                            {processing ? 'Salvando...' : 'Adicionar à Árvore'}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}