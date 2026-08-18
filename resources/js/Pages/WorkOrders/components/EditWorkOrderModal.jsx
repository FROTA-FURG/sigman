import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router, usePage } from '@inertiajs/react';

export default function EditWorkOrderModal({ isOpen, onClose, osData, equipments = [], currentUser }) {
    const [mounted, setMounted] = useState(false);

    // Empresas terceirizadas disponíveis para vincular (vem das props da página)
    const thirdParties = usePage().props.thirdParties ?? [];

    const { data, setData, put, processing, errors, reset } = useForm({
        equipment_id: '',
        description: '',
        maintenance_type: '',
        priority: '',
        status: '',
        periodicity: '',
        in_52_week_plan: false,
        engineer_comment: '',
        vendor_name: '',
        third_party_id: '',
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
                in_52_week_plan: Boolean(osData.in_52_week_plan),
                engineer_comment: osData.engineer_comment || '',
                vendor_name: osData.vendor_name || '',
                third_party_id: osData.third_party_id || '',
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

    // Identificação do Equipamento Atual e sua Embarcação
    const currentEq = equipments.find(x => x.id === data.equipment_id);
    const vesselPrefix = currentEq?.vessel?.tag || currentEq?.vessel?.prefix || '-';
    const eqVesselId = currentEq?.vessel_id || currentEq?.vessel?.id;

    // Lógica de Permissão de Edição Global
    const roleName = String(currentUser?.role?.name || currentUser?.role || '').toLowerCase();
    const isTI = roleName.includes('ti') || roleName.includes('developer') || roleName.includes('admin') || roleName.includes('desenvolvedor');
    const isEngenheiro = roleName.includes('engenheir') || roleName.includes('engineer');
    const isEstagiario = roleName.includes('intern') || roleName.includes('estagiari');
    
    const userVesselId = currentUser?.vessel_id;
    const isLinkedToVessel = String(eqVesselId) === String(userVesselId);

    // O modal só é editável se for TI, Engenheiro, ou o Estagiário daquela exata embarcação
    const canEdit = isTI || isEngenheiro || (isEstagiario && isLinkedToVessel);

    // A observação do engenheiro é da gestão. O estagiário até abre este modal
    // (edita outros campos da OS da embarcação dele), mas o campo fica só de
    // leitura — a trava de verdade está no servidor, isto aqui é a interface.
    const isCoordenador = roleName.includes('coordinator') || roleName.includes('coordenador');
    const canComment = isTI || isEngenheiro || isCoordenador;

    // Estilo padrão para os inputs dependendo da permissão
    const inputClasses = `w-full rounded-md border border-slate-700 p-2 text-sm focus:border-blue-500 ${!canEdit ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-950 text-slate-300'}`;

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
                                {canEdit ? 'Edição de Ordem de Serviço' : 'Visualização de Ordem de Serviço'}
                                <span className="bg-slate-800 text-blue-400 px-2 py-0.5 rounded text-xs font-mono border border-slate-700">
                                    {osData.os_number}
                                </span>
                            </h3>
                            {!canEdit && (
                                <p className="text-[10px] text-orange-400 mt-1">Você não tem permissão para editar os dados desta OS.</p>
                            )}
                        </div>
                        
                        <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                        <form id="editOsForm" onSubmit={submit} className="space-y-6">
                            
                            {/* INFORMAÇÕES DE VALIDAÇÃO (SOMENTE LEITURA) */}
                            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Validação Prévia (Pelo Estagiário)
                                </h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Status da Validação</label>
                                        <div className="text-sm font-bold text-white">
                                            {osData.intern_status === 'approved' ? (
                                                <span className="text-emerald-400 flex items-center gap-1.5"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Aprovada</span>
                                            ) : osData.intern_status === 'waiting' ? (
                                                <span className="text-orange-400 flex items-center gap-1.5"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Aguardando Insumo</span>
                                            ) : (
                                                <span className="text-slate-400">Pendente</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Validado Por</label>
                                        <div className="text-sm font-medium text-slate-300">{osData.intern_name || '-'}</div>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Motivo do Atraso / Falta de Material</label>
                                        <div className="text-sm text-slate-400 bg-slate-950/50 p-2.5 rounded-md border border-slate-700/50 min-h-[44px]">
                                            {osData.intern_reason || 'Nenhuma observação registrada.'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* OBSERVAÇÃO DO ENGENHEIRO */}
                            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" /></svg>
                                        Observação do Engenheiro
                                    </h4>
                                    {osData.engineer_comment_by && (
                                        <span className="text-[10px] text-slate-500">
                                            Último registro: {osData.engineer_comment_by}
                                            {osData.engineer_comment_at ? ` em ${new Date(osData.engineer_comment_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                                        </span>
                                    )}
                                </div>

                                {canComment ? (
                                    <>
                                        <textarea
                                            rows="3"
                                            value={data.engineer_comment}
                                            onChange={e => setData('engineer_comment', e.target.value)}
                                            placeholder="Oriente a equipe, responda o que o estagiário apontou, registre uma decisão de planejamento..."
                                            className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <p className="mt-1 text-[10px] text-slate-500">Pode ser reescrito a qualquer momento; salvar com o campo vazio remove a observação.</p>
                                    </>
                                ) : (
                                    <div className="min-h-[44px] whitespace-pre-wrap rounded-md border border-slate-700/50 bg-slate-950/50 p-2.5 text-sm text-slate-400">
                                        {osData.engineer_comment || 'Nenhuma observação registrada pelo engenheiro.'}
                                    </div>
                                )}
                                {errors.engineer_comment && <span className="text-xs text-red-500">{errors.engineer_comment}</span>}
                            </div>

                            {/* IDENTIFICAÇÃO DO ATIVO */}
                            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Identificação do Ativo</h4>
                                
                                <div className="grid grid-cols-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Equipamento {canEdit && <span className="text-red-500">*</span>}</label>
                                    <select 
                                        value={data.equipment_id} 
                                        onChange={e => setData('equipment_id', e.target.value)} 
                                        disabled={!canEdit}
                                        className={inputClasses}
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

                            {/* RESTANTE DO FORMULÁRIO */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Tipo de Manut. {canEdit && <span className="text-red-500">*</span>}</label>
                                    <select value={data.maintenance_type} onChange={e => setData('maintenance_type', e.target.value)} disabled={!canEdit} className={inputClasses}>
                                        <option value="corrective">Corretiva</option>
                                        <option value="preventive">Preventiva</option>
                                        <option value="predictive">Preditiva</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Prioridade {canEdit && <span className="text-red-500">*</span>}</label>
                                    <select value={data.priority} onChange={e => setData('priority', e.target.value)} disabled={!canEdit} className={inputClasses}>
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Status {canEdit && <span className="text-red-500">*</span>}</label>
                                    <select 
                                        value={data.status} 
                                        onChange={e => setData('status', e.target.value)} 
                                        disabled={!canEdit}
                                        className={inputClasses}
                                    >
                                        <option value="open">Aberto (Não Iniciado)</option>
                                        <option value="in_progress">Em Andamento</option>
                                        <option value="scheduled">Agendada (Futuro)</option>
                                        <option value="completed">Concluída</option>
                                        <option value="cancelled">Cancelada</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Periodicidade</label>
                                    <select value={data.periodicity} onChange={e => setData('periodicity', e.target.value)} disabled={!canEdit} className={inputClasses}>
                                        <option value="">Nenhuma (Avulsa)</option>
                                        <option value="daily">Diário</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="biweekly">Quinzenal</option>
                                        <option value="monthly">Mensal</option>
                                        <option value="bimonthly">Bimestral</option>
                                        <option value="quarterly">Trimestral</option>
                                        <option value="semiannual">Semestral</option>
                                        <option value="annual">Anual</option>
                                        <option value="biennial">Bianual</option>
                                        <option value="triennial">Trianual</option>
                                        <option value="quadrennial">Quadrienal</option>
                                        <option value="sexennial">Sexênio</option>
                                        <option value="docking">Docagem</option>
                                    </select>
                                    {errors.periodicity && <span className="text-xs text-red-500">{errors.periodicity}</span>}
                                </div>
                            </div>

                            <label className={`flex items-start gap-3 rounded-md border border-slate-700 bg-slate-950/60 p-3 transition-colors ${canEdit ? 'cursor-pointer hover:border-slate-600' : 'cursor-not-allowed opacity-60'}`}>
                                <input
                                    type="checkbox"
                                    checked={data.in_52_week_plan}
                                    onChange={e => setData('in_52_week_plan', e.target.checked)}
                                    disabled={!canEdit}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-slate-200">Pertence ao Plano de 52 Semanas</span>
                                    <span className="block text-xs text-slate-500">Marque se esta OS faz parte do cronograma anual de manutenção preventiva, e não de uma demanda avulsa.</span>
                                </span>
                            </label>

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
                                        disabled={!canEdit}
                                        placeholder="Ex: 2.5" 
                                        className={inputClasses} 
                                    />
                                    {errors.estimated_hours && <span className="text-xs text-red-500">{errors.estimated_hours}</span>}
                                </div>

                                <div className="sm:col-span-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Data da OS {canEdit && <span className="text-red-500">*</span>}</label>
                                    <input 
                                        type="date" 
                                        value={data.created_at} 
                                        onChange={e => setData('created_at', e.target.value)}
                                        disabled={!canEdit}
                                        className={`${inputClasses} [color-scheme:dark]`}
                                    />
                                    {errors.created_at && <span className="text-xs text-red-500">{errors.created_at}</span>}
                                </div>

                                <div className="sm:col-span-1">
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Empresa Terceirizada (perfil)</label>
                                    <select
                                        value={data.third_party_id}
                                        onChange={e => setData('third_party_id', e.target.value)}
                                        disabled={!canEdit}
                                        className={inputClasses}
                                    >
                                        <option value="">Nenhuma (OS interna)</option>
                                        {thirdParties.map(tp => (
                                            <option key={tp.id} value={tp.id}>{tp.razao_social}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Descrição do Problema / Serviço {canEdit && <span className="text-red-500">*</span>}</label>
                                <textarea 
                                    rows="4" 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)}
                                    disabled={!canEdit}
                                    className={`${inputClasses} resize-none`}
                                />
                                {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                            </div>

                        </form>
                    </div>

                    <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                        <button 
                            type="button" 
                            onClick={handleDelete}
                            disabled={processing || !canEdit}
                            className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir OS
                        </button>
                        
                        <div className="flex gap-3">
                            <button onClick={onClose} disabled={processing} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-50">
                                {canEdit ? 'Cancelar' : 'Fechar'}
                            </button>
                            <button 
                                type="submit" 
                                form="editOsForm" 
                                disabled={processing || !canEdit} 
                                className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
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