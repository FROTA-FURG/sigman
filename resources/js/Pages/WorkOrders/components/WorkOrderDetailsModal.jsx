import React, { useState, useEffect } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';

export default function WorkOrderDetailsModal({ isOpen, onClose, workOrderId, osNumber, activities = [], users = [] }) {
    const { auth } = usePage().props; // Pega os dados do usuário logado
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        work_order_id: '',
        responsible_user_id: '',
        description: '',
        started_at: '',
        completed_at: '',
    });

    useEffect(() => {
        if (isOpen && workOrderId) {
            setData(d => ({ ...d, work_order_id: workOrderId }));
            setIsFormOpen(false);
            setEditingId(null);
            reset('description', 'started_at', 'completed_at', 'responsible_user_id');
            clearErrors();
        }
    }, [isOpen, workOrderId]);

    if (!isOpen) return null;

    const currentActivities = activities.filter(act => act.work_order_id === workOrderId);

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const formatDateBr = (dateString) => {
        if (!dateString) return null;
        const dateObj = new Date(dateString);
        const datePart = dateObj.toLocaleDateString('pt-BR');
        const timePart = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${datePart} às ${timePart}`;
    };

    const handleAddNew = () => {
        setEditingId(null);
        reset('description', 'started_at', 'completed_at');
        setData(d => ({ 
            ...d, 
            work_order_id: workOrderId, 
            responsible_user_id: auth.user.id 
        }));
        clearErrors();
        setIsFormOpen(true);
    };

    const handleEditClick = (activity) => {
        setEditingId(activity.id);
        setData({
            work_order_id: workOrderId,
            responsible_user_id: activity.responsible_user_id || '',
            description: activity.description || '',
            started_at: formatDateForInput(activity.started_at),
            completed_at: formatDateForInput(activity.completed_at),
        });
        clearErrors();
        setIsFormOpen(true);
    };

    const handleCancelForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        reset();
        clearErrors();
    };

    const handleSubmitActivity = (e) => {
        e.preventDefault();
        if (editingId) {
            put(route('work-order-activities.update', editingId), {
                preserveScroll: true,
                onSuccess: () => handleCancelForm()
            });
        } else {
            post(route('work-order-activities.store'), {
                preserveScroll: true,
                onSuccess: () => handleCancelForm()
            });
        }
    };

    const handleDeleteActivity = (activityId) => {
        if (window.confirm('Tem certeza que deseja excluir esta atividade? Essa ação não pode ser desfeita.')) {
            router.delete(route('work-order-activities.destroy', activityId), {
                preserveScroll: true,
            });
        }
    };

    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-700/50 p-5 shrink-0 bg-slate-900/30">
                    <div>
                        <h3 className="text-lg font-bold text-white">Detalhamento de Atividades</h3>
                        <p className="text-sm text-slate-400">Ordem de Serviço #{osNumber}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-800">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Lista de Atividades */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-[#0b203c]">
                    {currentActivities.length > 0 ? (
                        <div className="space-y-4">
                            {currentActivities.map(activity => (
                                <div key={activity.id} className="relative p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 group hover:border-slate-600 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-semibold text-blue-400 text-sm">
                                            Responsável: <span className="text-slate-200">
                                                {/* Puxa o nome do usuário que veio do backend (responsible_user) */}
                                                {activity.responsible_user?.username || activity.responsible_user?.name || 'Usuário'}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-start gap-2">
                                            <div className="text-xs text-slate-400 flex flex-col items-end gap-1 mr-2">
                                                <span className="bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                                                    Início: <span className="text-slate-300">{formatDateBr(activity.started_at) || '-'}</span>
                                                </span>
                                                {activity.completed_at ? (
                                                    <span className="bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                                                        Fim: <span className="text-slate-300">{formatDateBr(activity.completed_at)}</span>
                                                    </span>
                                                ) : (
                                                    <span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">Em andamento</span>
                                                )}
                                            </div>
                                            
                                            {/* BOTÃO DE EDITAR */}
                                            <button 
                                                onClick={() => handleEditClick(activity)}
                                                className="text-slate-500 hover:text-blue-400 hover:bg-slate-800 p-1.5 rounded-md transition-colors"
                                                title="Editar Atividade"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>

                                            {/* BOTÃO DA LIXEIRA */}
                                            <button 
                                                onClick={() => handleDeleteActivity(activity.id)}
                                                className="text-slate-500 hover:text-red-400 hover:bg-slate-800 p-1.5 rounded-md transition-colors"
                                                title="Excluir Atividade"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mt-3 pt-3 border-t border-slate-700/30">
                                        {activity.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                            Nenhuma atividade registrada para esta Ordem de Serviço ainda.
                        </div>
                    )}
                </div>

                {/* Formulário de Atividade (Criar ou Editar) */}
                {isFormOpen && (
                    <form onSubmit={handleSubmitActivity} className="p-5 border-t border-slate-700/50 bg-slate-900/80 shrink-0 space-y-4">
                        <h4 className="text-sm font-semibold text-white">
                            {editingId ? 'Editar Atividade' : 'Registrar Nova Atividade'}
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* CAMPO DE SELEÇÃO DE USUÁRIO */}
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-400">Responsável pela Atividade <span className="text-red-500">*</span></label>
                                <select 
                                    value={data.responsible_user_id}
                                    onChange={e => setData('responsible_user_id', e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500"
                                >
                                    <option value="">Selecione um usuário...</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.username} {user.nickname ? `(${user.nickname})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.responsible_user_id && <span className="text-xs text-red-500">{errors.responsible_user_id}</span>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Data/Hora de Início <span className="text-red-500">*</span></label>
                                <input type="datetime-local" value={data.started_at} onChange={e => setData('started_at', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 [color-scheme:dark]" />
                                {errors.started_at && <span className="text-xs text-red-500">{errors.started_at}</span>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Data/Hora de Fim</label>
                                <input type="datetime-local" value={data.completed_at} onChange={e => setData('completed_at', e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500 [color-scheme:dark]" />
                                {errors.completed_at && <span className="text-xs text-red-500">{errors.completed_at}</span>}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Descrição <span className="text-red-500">*</span></label>
                            <textarea rows="3" value={data.description} onChange={e => setData('description', e.target.value)} className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500" />
                            {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={handleCancelForm} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition">Cancelar</button>
                            <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
                                {processing ? 'Salvando...' : 'Salvar Atividade'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Footer do Modal Principal (Aparece apenas se o form estiver fechado) */}
                {!isFormOpen && (
                    <div className="border-t border-slate-700/50 p-4 shrink-0 bg-slate-900/50 flex justify-between items-center">
                        <button onClick={handleAddNew} className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-blue-400 text-sm font-semibold rounded-lg transition shadow-sm flex items-center">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Adicionar Atividade
                        </button>
                        <button onClick={onClose} className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition">
                            Fechar Aba
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}