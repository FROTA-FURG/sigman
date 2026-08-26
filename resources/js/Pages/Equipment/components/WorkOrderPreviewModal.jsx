import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';

// Mesmo mapeamento de cores/labels de WorkOrders/Show.jsx, para a prévia
// bater visualmente com a tela cheia da OS.
const STATUS = {
    open:        { label: 'Aberta',       classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    in_progress: { label: 'Em Andamento', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    scheduled:   { label: 'Agendada',     classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    completed:   { label: 'Concluída',    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    cancelled:   { label: 'Cancelada',    classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

const PRIORITY = {
    low:      { label: 'Baixa',   classes: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
    medium:   { label: 'Média',   classes: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    high:     { label: 'Alta',    classes: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    critical: { label: 'Crítica', classes: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

// Mesma cor por tipo usada nas bolinhas do calendário anual (azul/vermelho/verde).
const MAINTENANCE_TYPE = {
    preventive: { label: 'Preventiva', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    corrective: { label: 'Corretiva',  classes: 'bg-red-500/10 text-red-400 border-red-500/30' },
    predictive: { label: 'Preditiva',  classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
};

const PERIODICITY = {
    daily: 'Diário', weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal',
    bimonthly: 'Bimestral', quarterly: 'Trimestral', semiannual: 'Semestral',
    annual: 'Anual', biennial: 'Bianual', triennial: 'Trianual',
    quadrennial: 'Quadrienal', sexennial: 'Sexênio', docking: 'Docagem',
};

// created_at/completed_at são DATAS-ALVO (sempre meia-noite UTC no banco),
// não instantes reais -- `new Date(iso).toLocaleDateString()` arredonda
// pro dia anterior em fuso negativo (Brasil, UTC-3). Extrai a data direto
// da string, igual ao formatBr de FutureOS.jsx.
const formatDate = (value) => {
    if (!value) return '—';
    const [datePart] = value.split('T');
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
};

function Badge({ config, fallback }) {
    if (!config) {
        return <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-400">{fallback ?? '—'}</span>;
    }
    return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${config.classes}`}>{config.label}</span>;
}

function Field({ label, children }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-200">{children || '—'}</dd>
        </div>
    );
}

export default function WorkOrderPreviewModal({ isOpen, onClose, workOrder }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!isOpen || !mounted || !workOrder) return null;

    const status = workOrder.is_inactive
        ? { label: 'Inativada', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/30' }
        : STATUS[workOrder.status];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
            <div className="relative flex w-full max-w-xl max-h-[85vh] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">

                <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-white">OS #{workOrder.os_number}</h3>
                        <Badge config={status} fallback={workOrder.status} />
                    </div>
                    <button onClick={onClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-900 p-6">
                    <dl className="space-y-5">
                        <Field label="Descrição">{workOrder.description}</Field>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Field label="Tipo de Manutenção"><Badge config={MAINTENANCE_TYPE[workOrder.maintenance_type]} fallback={workOrder.maintenance_type} /></Field>
                            <Field label="Prioridade"><Badge config={PRIORITY[workOrder.priority]} fallback={workOrder.priority} /></Field>
                            <Field label="Periodicidade">{PERIODICITY[workOrder.periodicity] || '—'}</Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Field label="Data Prevista">{formatDate(workOrder.created_at)}</Field>
                            <Field label="Data de Conclusão">{formatDate(workOrder.completed_at)}</Field>
                            <Field label="Horas Estimadas">{workOrder.estimated_hours ? `${workOrder.estimated_hours}h` : '—'}</Field>
                        </div>

                        {(workOrder.vendor_name || workOrder.third_party_id) && (
                            <Field label="Executante">{workOrder.vendor_name || 'Terceirizada'}</Field>
                        )}

                        {workOrder.engineer_comment && (
                            <Field label="Observação do Engenheiro">{workOrder.engineer_comment}</Field>
                        )}
                    </dl>
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 bg-slate-900 px-6 py-4">
                    <button onClick={onClose} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800">Fechar</button>
                    <Link
                        href={route('work-orders.show', workOrder.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                        Abrir na Tela de OS
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                </div>
            </div>
        </div>,
        document.body
    );
}
