import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import EditNodeModal from './Equipments/EditNodeModal';
import WorkOrderPreviewModal from './components/WorkOrderPreviewModal';
import MaintenanceYearCalendar from '@/Components/MaintenanceYearCalendar';
import ImageLightbox from './components/ImageLightbox';

const STATUS = {
    open:        { label: 'Aberta',       classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    in_progress: { label: 'Em Andamento', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    scheduled:   { label: 'Agendada',     classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    completed:   { label: 'Concluída',    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    cancelled:   { label: 'Cancelada',    classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

const MAINTENANCE_TYPE = {
    preventive: { label: 'Preventiva', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    corrective: { label: 'Corretiva',  classes: 'bg-red-500/10 text-red-400 border-red-500/30' },
    predictive: { label: 'Preditiva',  classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
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
        return <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[11px] font-bold text-slate-400">{fallback ?? '—'}</span>;
    }
    return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${config.classes}`}>{config.label}</span>;
}

const renderStatus = (status) => {
    if (!status) return null;
    if (status === 'active') return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Operacional</span>;
    if (status === 'inactive') return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>Inativo / Atenção</span>;
    if (status === 'in_maintenance') return <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-400 ring-1 ring-inset ring-orange-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>Em Manutenção</span>;
    if (status === 'decommissioned') return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>Descomissionado</span>;
    return <span className="text-slate-400">{status}</span>;
};

const renderCriticality = (criticality) => {
    if (!criticality) return null;
    if (criticality === 'A') return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Classe A</span>;
    if (criticality === 'B') return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>Classe B</span>;
    if (criticality === 'C') return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>Classe C</span>;
    return <span className="text-slate-400">{criticality}</span>;
};

export default function Show({ equipment, workOrders = [], lastInspection = null }) {
    const { auth } = usePage().props;
    const allowedRoles = ['intern', 'coordinator', 'engineer', 'dev'];
    const canEdit = auth?.user && allowedRoles.includes(auth.user.role);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [previewOS, setPreviewOS] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    // EditNodeModal foi construído pra receber nós já formatados da árvore
    // (que usam `tag`, não `tag_number`) -- aqui adaptamos o model puro do
    // Eloquent pro mesmo formato, sem mexer no modal ou na árvore.
    const nodeDataForEdit = useMemo(() => ({
        id: equipment.id,
        type: equipment.children?.length > 0 ? 'system' : 'equipment',
        name: equipment.name,
        tag: equipment.tag_number,
        status: equipment.status,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        criticality: equipment.criticality,
        series_number: equipment.series_number,
        description: equipment.description,
        image_url: equipment.image_url,
    }), [equipment]);

    return (
        <SIGMANLayout>
            <Head title={`${equipment.name} | Equipamento | SIGMAN`} />

            <EditNodeModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} nodeData={nodeDataForEdit} />
            <WorkOrderPreviewModal isOpen={!!previewOS} onClose={() => setPreviewOS(null)} workOrder={previewOS} />
            {isLightboxOpen && (
                <ImageLightbox
                    src={`/storage/${equipment.image_url}`}
                    alt={equipment.name}
                    onClose={() => setIsLightboxOpen(false)}
                />
            )}

            <div className="flex flex-col gap-6 pb-8">

                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-start gap-4">
                        <Link
                            href={route('eq.index')}
                            className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition shrink-0"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>

                        {equipment.image_url ? (
                            <img
                                src={`/storage/${equipment.image_url}`}
                                alt={equipment.name}
                                onClick={() => setIsLightboxOpen(true)}
                                className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-700 cursor-zoom-in hover:ring-blue-500 transition"
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-900 ring-1 ring-slate-700">
                                <svg className="h-7 w-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        )}

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-bold leading-tight text-white">{equipment.name}</h2>
                                {equipment.tag_number && <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-300">{equipment.tag_number}</span>}
                            </div>
                            <p className="text-sm text-slate-400">
                                {equipment.vessel?.name}
                                {equipment.parent?.name && <span className="text-slate-600"> · Pertence a {equipment.parent.name}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {renderStatus(equipment.status)}
                        {renderCriticality(equipment.criticality)}
                        {canEdit && (
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white ring-1 ring-inset ring-slate-700"
                            >
                                <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Editar
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0b203c]/90 p-6 shadow-lg backdrop-blur-md">
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Descrição</h3>
                        <p className="text-sm text-slate-300 whitespace-pre-line">{equipment.description || 'Nenhuma descrição cadastrada para este equipamento.'}</p>

                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 border-t border-slate-800 pt-4">
                            <div>
                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Fabricante</span>
                                <span className="text-sm font-medium text-slate-200">{equipment.manufacturer || 'Não especificado'}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Modelo</span>
                                <span className="text-sm font-medium text-slate-200">{equipment.model || 'Não especificado'}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Nº de Série</span>
                                <span className="text-sm font-medium text-slate-200 font-mono">{equipment.series_number || 'Não especificado'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-6 shadow-lg backdrop-blur-md">
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Última Inspeção</h3>
                        {lastInspection ? (
                            <div className="space-y-3">
                                <div>
                                    <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Concluída em</span>
                                    <span className="text-xl font-bold text-white">{formatDate(lastInspection.completed_at || lastInspection.created_at)}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">OS</span>
                                    <button onClick={() => setPreviewOS(lastInspection)} className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline">
                                        #{lastInspection.os_number} — {lastInspection.description}
                                    </button>
                                </div>
                                <Badge config={MAINTENANCE_TYPE[lastInspection.maintenance_type]} fallback={lastInspection.maintenance_type} />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Nenhuma OS concluída registrada para este equipamento.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-lg backdrop-blur-md overflow-hidden">
                    <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Ordens de Serviço Vinculadas</h3>
                        <span className="text-xs text-slate-500">{workOrders.length} no total</span>
                    </div>

                    {workOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-sm text-slate-500">Nenhuma OS vinculada a este equipamento.</p>
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-slate-800">
                                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">OS</th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Descrição</th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Data Prevista</th>
                                        <th className="px-6 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/70">
                                    {workOrders.map((os) => {
                                        const status = os.is_inactive
                                            ? { label: 'Inativada', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/30' }
                                            : STATUS[os.status];
                                        return (
                                            <tr key={os.id} className="hover:bg-slate-800/30 transition">
                                                <td className="whitespace-nowrap px-6 py-2.5 text-sm font-mono font-semibold text-slate-300">#{os.os_number}</td>
                                                <td className="max-w-xs truncate px-4 py-2.5 text-sm text-slate-300">{os.description}</td>
                                                <td className="whitespace-nowrap px-4 py-2.5"><Badge config={MAINTENANCE_TYPE[os.maintenance_type]} fallback={os.maintenance_type} /></td>
                                                <td className="whitespace-nowrap px-4 py-2.5"><Badge config={status} fallback={os.status} /></td>
                                                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-400">{formatDate(os.created_at)}</td>
                                                <td className="whitespace-nowrap px-6 py-2.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setPreviewOS(os)}
                                                            title="Visualizar"
                                                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        </button>
                                                        <Link
                                                            href={route('work-orders.show', os.id)}
                                                            title="Abrir na tela de OS"
                                                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <MaintenanceYearCalendar workOrders={workOrders} emptyLabel="Nenhuma OS registrada para este equipamento" />
            </div>
        </SIGMANLayout>
    );
}
