import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from '@inertiajs/react';

export const TIPOS_COMPONENTE = [
    { value: 'sobressalente_rotativo', label: 'Sobressalente e Rotativo', ajuda: 'Item mais descartável, troca fácil, menor durabilidade.' },
    { value: 'sobressalente_consumivel', label: 'Sobressalente Consumível', ajuda: 'Óleo, filtro -- o TAG ajuda o técnico a identificar o tipo em uso.' },
    { value: 'item_critico', label: 'Item Crítico', ajuda: 'Pode parar o equipamento ou diminuir a eficiência.' },
];

export const TIPO_COMPONENTE_LABEL = Object.fromEntries(TIPOS_COMPONENTE.map(t => [t.value, t.label]));

/**
 * Criar/editar um componente (nível opcional abaixo do equipamento --
 * ex.: Motor -> pistão 1/2/3). Usado tanto na página de detalhe do
 * equipamento quanto (via delegação) pelo EditNodeModal, quando o nó
 * clicado na árvore é um componente.
 */
export default function ComponentModal({ isOpen, onClose, equipmentId, component = null }) {
    const [mounted, setMounted] = useState(false);
    const isEdit = Boolean(component);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        equipment_id: equipmentId || '',
        name: '',
        tag_number: '',
        tipo: '',
        manufacturer: '',
        model: '',
        description: '',
    });

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!isOpen) return;
        setData({
            equipment_id: equipmentId || component?.equipment_id || '',
            name: component?.name || '',
            tag_number: component?.tag_number || '',
            tipo: component?.tipo || '',
            manufacturer: component?.manufacturer || '',
            model: component?.model || '',
            description: component?.description || '',
        });
        clearErrors();
    }, [isOpen, component, equipmentId]);

    if (!isOpen || !mounted) return null;

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('components.update', component.id), { onSuccess: () => onClose() });
        } else {
            post(route('components.store'), { onSuccess: () => { reset(); onClose(); } });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
            <div className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
                    <h3 className="text-base font-bold text-white">{isEdit ? 'Editar Componente' : 'Adicionar Componente'}</h3>
                    <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                    <form id="componentForm" onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Nome do Componente <span className="text-red-500">*</span></label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Ex: Pistão 1" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 placeholder-slate-600 focus:border-blue-500" />
                                {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">TAG</label>
                                <input type="text" value={data.tag_number} onChange={e => setData('tag_number', e.target.value)} placeholder="Opcional" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-blue-400 font-mono focus:border-blue-500" />
                                {errors.tag_number && <span className="text-xs text-red-500">{errors.tag_number}</span>}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-slate-400">Tipo de Componente <span className="text-red-500">*</span></label>
                            <div className="space-y-2">
                                {TIPOS_COMPONENTE.map(t => (
                                    <label key={t.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${data.tipo === t.value ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
                                        <input
                                            type="radio"
                                            name="tipo"
                                            checked={data.tipo === t.value}
                                            onChange={() => setData('tipo', t.value)}
                                            className="mt-0.5 h-4 w-4 text-blue-500 focus:ring-blue-500"
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-slate-200">{t.label}</span>
                                            <span className="block text-xs text-slate-500">{t.ajuda}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {errors.tipo && <span className="text-xs text-red-500">{errors.tipo}</span>}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Marca / Fabricante</label>
                                <input type="text" value={data.manufacturer} onChange={e => setData('manufacturer', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Modelo</label>
                                <input type="text" value={data.model} onChange={e => setData('model', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Observação</label>
                            <textarea
                                rows="2"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                placeholder="Ex: Óleo 15W40 API CI-4 -- trocar a cada 250h"
                                className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500"
                            />
                            {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                        </div>
                    </form>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                    <button onClick={onClose} disabled={processing} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
                    <button type="submit" form="componentForm" disabled={processing || !data.name || !data.tipo} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                        {processing ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Adicionar Componente'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
