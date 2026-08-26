import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from '@inertiajs/react';

export default function EditNodeModal({ isOpen, onClose, nodeData }) {
    const [mounted, setMounted] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        tag: '',
        status: 'active',
        manufacturer: '',
        model: '',
        criticality: '',
        series_number: '',
        description: '',
        image: null,
        remove_image: false,
        _method: 'put', // multipart não funciona com PUT de verdade; Laravel repassa via _method
    });

    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (nodeData) {
            setData({
                name: nodeData.name || '',
                tag: nodeData.tag || '',
                status: nodeData.status || 'active',
                manufacturer: nodeData.manufacturer || '',
                model: nodeData.model || '',
                criticality: nodeData.criticality || '',
                series_number: nodeData.series_number || '',
                description: nodeData.description || '',
                image: null,
                remove_image: false,
                _method: 'put',
            });
            setImagePreview(nodeData.image_url ? `/storage/${nodeData.image_url}` : null);
            clearErrors();
        }
    }, [nodeData, isOpen]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files?.[0] || null;
        setData(d => ({ ...d, image: file, remove_image: false }));
        setImagePreview(file ? URL.createObjectURL(file) : (nodeData?.image_url ? `/storage/${nodeData.image_url}` : null));
    };

    const handleRemoveImage = () => {
        setData(d => ({ ...d, image: null, remove_image: true }));
        setImagePreview(null);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('equipments.update', nodeData.id), {
            forceFormData: true,
            onSuccess: () => onClose(),
        });
    };

    if (!isOpen || !mounted || !nodeData) return null;

    if (nodeData.type === 'section') {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md">
                <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-700">
                    <h3 className="text-lg font-bold text-white mb-2">Edição não permitida</h3>
                    <p className="text-sm text-slate-400 mb-4">As Seções são categorias fixas e não podem ser editadas.</p>
                    <button onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Fechar</button>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
                <div className="relative flex w-full max-w-2xl max-h-[85vh] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">
                    
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-white">Editar Informações</h3>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 ring-1 ring-slate-700">{nodeData.tag || 'Sem TAG'}</span>
                        </div>
                        <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">X</button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                        <form id="editNodeForm" onSubmit={submit} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Nome do Item <span className="text-red-500">*</span></label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">TAG do Equipamento</label>
                                    <input type="text" value={data.tag} onChange={e => setData('tag', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-blue-400 font-mono focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Status Atual</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                        <option value="active">Operacional</option>
                                        <option value="inactive">Atenção / Inativo</option>
                                        <option value="in_maintenance">Em Manutenção</option>
                                        <option value="decommissioned">Descomissionado</option>
                                    </select>
                                </div>
                            </div>

                            {['equipment', 'component'].includes(nodeData.type) && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                    <div className="sm:col-span-3">
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Número de Série</label>
                                        <input type="text" value={data.series_number} onChange={e => setData('series_number', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Marca / Fabricante</label>
                                        <input type="text" value={data.manufacturer} onChange={e => setData('manufacturer', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Modelo</label>
                                        <input type="text" value={data.model} onChange={e => setData('model', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                                    </div>
                                    <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Classe</label>
                                        <select value={data.criticality} onChange={e => setData('criticality', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500">
                                            <option value="A">Classe A</option>
                                            <option value="B">Classe B</option>
                                            <option value="C">Classe C</option>
                                        </select>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Descrição</label>
                                        <textarea
                                            rows="3"
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder="Função do equipamento, particularidades, observações gerais..."
                                            className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500"
                                        />
                                        {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Foto do Equipamento</label>
                                        <div className="flex items-center gap-4">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Pré-visualização" className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-slate-700" />
                                            ) : (
                                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-950 ring-1 ring-slate-700">
                                                    <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1.5">
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    onChange={handleImageChange}
                                                    className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-700"
                                                />
                                                {imagePreview && (
                                                    <button type="button" onClick={handleRemoveImage} className="self-start text-xs font-medium text-red-400 hover:text-red-300">
                                                        Remover foto
                                                    </button>
                                                )}
                                                <span className="text-[11px] text-slate-500">JPG, PNG ou WEBP, até 4MB.</span>
                                            </div>
                                        </div>
                                        {errors.image && <span className="text-xs text-red-500">{errors.image}</span>}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                        <button onClick={onClose} disabled={processing} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800">Cancelar</button>
                        <button type="submit" form="editNodeForm" disabled={processing} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500">
                            {processing ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}