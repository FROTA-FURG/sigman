import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import EditWorkOrderModal from './components/EditWorkOrderModal';

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

const MAINTENANCE_TYPE = {
    corrective: 'Corretiva',
    preventive: 'Preventiva',
    predictive: 'Preditiva',
};

const PERIODICITY = {
    daily: 'Diário',
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
    bimonthly: 'Bimestral',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual',
    biennial: 'Bianual',
    triennial: 'Trianual',
    quadrennial: 'Quadrienal',
    sexennial: 'Sexênio',
    docking: 'Docagem',
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

// created_at (e o created_at de outra OS, em referências cruzadas) é uma
// DATA-ALVO -- sempre meia-noite UTC no banco -- não um instante real como
// approved_at/inactivated_at. Passar isso por Date()+fuso do navegador
// arredonda pro dia anterior sempre que o fuso for negativo (Brasil,
// UTC-3), então aqui a data sai direto da string, sem conversão de fuso.
const formatPureDate = (value) => {
    if (!value) return '—';
    const [datePart] = value.split('T');
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
};

const formatDateTime = (value) =>
    value
        ? new Date(value).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—';

// Etiqueta colorida de status/prioridade
function Badge({ config, fallback }) {
    if (!config) {
        return <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-400">{fallback}</span>;
    }
    return (
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${config.classes}`}>{config.label}</span>
    );
}

// Um par rótulo/valor dentro dos cartões
function Field({ label, children, className = '' }) {
    return (
        <div className={className}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-200">{children || '—'}</dd>
        </div>
    );
}

function Card({ title, children, className = '' }) {
    return (
        <section className={`rounded-xl border border-slate-800 bg-[#0b203c] shadow-lg ${className}`}>
            <header className="border-b border-slate-800 px-6 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">{title}</h2>
            </header>
            <div className="px-6 py-5">{children}</div>
        </section>
    );
}

export default function Show({ workOrder, equipments = [] }) {
    const [changingStatus, setChangingStatus] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { auth } = usePage().props;
    const { url } = usePage();

    // Se veio de um lugar específico (ex.: uma Janela de Execução), volta
    // pra lá em vez de sempre cair na listagem geral de OS. route() do
    // Ziggy gera link absoluto (http://...), então normaliza com new URL()
    // em vez de só checar se começa com "/" -- e descarta qualquer origem
    // diferente da atual, ficando só com o path+query relativo.
    const { backHref, backLabel } = useMemo(() => {
        const query = url.split('?')[1] || '';
        const back = new URLSearchParams(query).get('back');
        if (!back) {
            return { backHref: route('work-orders.index'), backLabel: 'Voltar para Ordens de Serviço' };
        }
        try {
            const parsed = new URL(back, window.location.origin);
            return { backHref: `${parsed.pathname}${parsed.search}`, backLabel: 'Voltar' };
        } catch {
            return { backHref: route('work-orders.index'), backLabel: 'Voltar para Ordens de Serviço' };
        }
    }, [url]);

    // status='cancelled' por baixo é o que tira a OS inativada das
    // métricas (ver WorkOrderService::inactivateWorkOrder), mas aqui na
    // tela isso é bem diferente de "cancelada de vez".
    const status = workOrder.is_inactive
        ? { label: 'Inativada', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/30' }
        : STATUS[workOrder.status];
    const priority = PRIORITY[workOrder.priority];
    const equipment = workOrder.equipment ?? {};
    const vessel = equipment.vessel ?? {};

    // Mesma regra de permissão do EditWorkOrderModal pros campos gerais:
    // TI/Engenheiro sempre, estagiário só na OS da própria embarcação.
    // Status é à parte: o estagiário só aprova (intern_status) -- quem
    // dispara/muda o status de verdade é o engenheiro (ou TI). Uma OS
    // inativada não muda de status por aqui -- isso é papel do fluxo de
    // reprogramação dela.
    const roleName = String(auth?.user?.role?.name || auth?.user?.role || '').toLowerCase();
    const isTI = roleName.includes('ti') || roleName.includes('developer') || roleName.includes('admin') || roleName.includes('desenvolvedor');
    const isEngenheiro = roleName.includes('engenheir') || roleName.includes('engineer');
    const isEstagiario = roleName.includes('intern') || roleName.includes('estagiari');
    const isLinkedToVessel = String(vessel.id) === String(auth?.user?.vessel_id);
    const canEditFields = isTI || isEngenheiro || (isEstagiario && isLinkedToVessel);
    const canChangeStatus = !workOrder.is_inactive && (isTI || isEngenheiro);

    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        setChangingStatus(true);
        router.put(route('work-orders.update-status', workOrder.id), { status: newStatus }, {
            preserveScroll: true,
            onFinish: () => setChangingStatus(false),
        });
    };

    // Atividades da mais recente para a mais antiga
    const activities = [...(workOrder.activities ?? [])].sort(
        (a, b) => new Date(b.started_at) - new Date(a.started_at)
    );

    return (
        <SIGMANLayout>
            <Head title={`OS ${workOrder.os_number} | SIGMAN`} />

            <EditWorkOrderModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                osData={workOrder}
                equipments={equipments}
                currentUser={auth?.user}
            />

            <div className="mx-auto max-w-6xl pb-10">
                {/* VOLTAR */}
                <div className="mb-4 flex items-center justify-between">
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        {backLabel}
                    </Link>

                    {canEditFields && (
                        <button
                            onClick={() => setIsEditOpen(true)}
                            className="flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white ring-1 ring-inset ring-slate-700"
                        >
                            <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Editar OS
                        </button>
                    )}
                </div>

                {/* CABEÇALHO */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-800 bg-[#0b203c] px-6 py-5 shadow-lg">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ordem de Serviço</p>
                        <h1 className="mt-1 font-mono text-3xl font-bold text-white">{workOrder.os_number}</h1>
                        <p className="mt-2 text-sm text-slate-400">
                            {vessel.name || 'Embarcação não informada'}
                            {equipment.name ? <span className="text-slate-600"> • </span> : null}
                            {equipment.name}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canChangeStatus ? (
                            <select
                                value={workOrder.status}
                                onChange={handleStatusChange}
                                disabled={changingStatus}
                                title="Mudar status da OS"
                                className={`rounded-full border px-3 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${status?.classes || 'bg-slate-500/10 text-slate-400 border-slate-500/30'} ${changingStatus ? 'opacity-50' : 'cursor-pointer'}`}
                            >
                                {Object.entries(STATUS).map(([value, cfg]) => (
                                    <option key={value} value={value} className="bg-slate-900 text-slate-200">{cfg.label}</option>
                                ))}
                            </select>
                        ) : (
                            <Badge config={status} fallback={workOrder.status} />
                        )}
                        <Badge config={priority} fallback={workOrder.priority} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* DESCRIÇÃO */}
                    <Card title="Descrição do Serviço" className="lg:col-span-2">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                            {workOrder.description || 'Sem descrição registrada.'}
                        </p>
                    </Card>

                    {/* EQUIPAMENTO */}
                    <Card title="Equipamento">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                            <Field label="Embarcação">{vessel.name}</Field>
                            <Field label="Equipamento">{equipment.name}</Field>
                            <Field label="TAG">
                                <span className="font-mono">{workOrder.tag_number}</span>
                            </Field>
                            <Field label="Nº de Série">
                                <span className="font-mono">{workOrder.series_number_id}</span>
                            </Field>
                            <Field label="Fabricante">{workOrder.manufacturer}</Field>
                            <Field label="Modelo">{workOrder.model}</Field>
                        </dl>
                    </Card>

                    {/* PLANEJAMENTO */}
                    <Card title="Planejamento">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                            <Field label="Tipo de Manutenção">
                                {MAINTENANCE_TYPE[workOrder.maintenance_type] ?? workOrder.maintenance_type}
                            </Field>
                            <Field label="Periodicidade">
                                {PERIODICITY[workOrder.periodicity] ?? workOrder.periodicity}
                            </Field>
                            <Field label="Plano de 52 Semanas">
                                {workOrder.in_52_week_plan ? (
                                    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                                        Pertence ao plano
                                    </span>
                                ) : (
                                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-400">
                                        Avulsa
                                    </span>
                                )}
                            </Field>
                            <Field label="Data Prevista">{formatPureDate(workOrder.created_at)}</Field>
                            <Field label="Horas Estimadas">
                                {workOrder.estimated_hours ? `${workOrder.estimated_hours} h` : null}
                            </Field>
                            <Field label="Fornecedor">{workOrder.vendor_name}</Field>
                            <Field label="Terceiro Responsável">
                                {workOrder.third_party?.razao_social}
                            </Field>
                            <Field label="SS Vinculada">
                                {workOrder.service_request?.ss_number ?? workOrder.ss_number}
                            </Field>
                            <Field label="Disparada em">{formatDateTime(workOrder.dispatched_at)}</Field>
                            <Field label="Iniciada em">{formatDateTime(workOrder.started_at)}</Field>
                            <Field label="Concluída em">{formatDateTime(workOrder.completed_at)}</Field>
                            <Field label="Aprovada pelo Engenheiro" className="col-span-2">
                                {workOrder.approved_at
                                    ? `${workOrder.approver?.nickname || workOrder.approver?.username || 'Engenheiro'} em ${formatDate(workOrder.approved_at)}`
                                    : null}
                            </Field>
                        </dl>
                    </Card>

                    {/* REPROGRAMAÇÃO (só aparece quando tem alguma ponta da cadeia de inativação) */}
                    {(workOrder.is_inactive || workOrder.rescheduled_from) && (
                        <Card title="Reprogramação" className="lg:col-span-2">
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                                {workOrder.rescheduled_from && (
                                    <Field label="Substitui a OS" className="sm:col-span-2">
                                        <Link
                                            href={route('work-orders.show', workOrder.rescheduled_from.id)}
                                            className="font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline"
                                        >
                                            {workOrder.rescheduled_from.os_number}
                                        </Link>
                                        <span className="ml-2 text-slate-500">
                                            (inativada em {formatDate(workOrder.rescheduled_from.inactivated_at)})
                                        </span>
                                    </Field>
                                )}
                                {workOrder.is_inactive && (
                                    <>
                                        <Field label="Inativada por">
                                            {workOrder.inactivated_by_user?.nickname || workOrder.inactivated_by_user?.username || '—'}
                                        </Field>
                                        <Field label="Inativada em">{formatDateTime(workOrder.inactivated_at)}</Field>
                                        <Field label="Motivo" className="sm:col-span-2">
                                            {workOrder.inactivation_reason || 'Nenhum motivo registrado.'}
                                        </Field>
                                        {workOrder.rescheduled_to && (
                                            <Field label="Reprogramada para a OS" className="sm:col-span-2">
                                                <Link
                                                    href={route('work-orders.show', workOrder.rescheduled_to.id)}
                                                    className="font-mono font-bold text-orange-400 hover:text-orange-300 hover:underline"
                                                >
                                                    {workOrder.rescheduled_to.os_number}
                                                </Link>
                                                <span className="ml-2 text-slate-500">
                                                    (em {formatPureDate(workOrder.rescheduled_to.created_at)})
                                                </span>
                                            </Field>
                                        )}
                                    </>
                                )}
                            </dl>
                        </Card>
                    )}

                    {/* AVALIAÇÃO DO ESTAGIÁRIO */}
                    <Card title="Avaliação do Estagiário" className="lg:col-span-2">
                        {workOrder.intern_status ? (
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
                                <Field label="Situação">{workOrder.intern_status}</Field>
                                <Field label="Estagiário">{workOrder.intern_name}</Field>
                                <Field label="Justificativa" className="sm:col-span-1">
                                    {workOrder.intern_reason}
                                </Field>
                            </dl>
                        ) : (
                            <p className="text-sm text-slate-500">Esta OS ainda não foi avaliada por um estagiário.</p>
                        )}
                    </Card>

                    {/* ATIVIDADES */}
                    <Card title={`Atividades Registradas (${activities.length})`} className="lg:col-span-2">
                        {activities.length === 0 ? (
                            <p className="text-sm text-slate-500">Nenhuma atividade registrada nesta Ordem de Serviço ainda.</p>
                        ) : (
                            <ol className="space-y-4">
                                {activities.map((activity) => (
                                    <li
                                        key={activity.id}
                                        className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <p className="text-sm font-semibold text-blue-400">
                                                Responsável:{' '}
                                                <span className="text-slate-200">
                                                    {activity.responsible_user?.username ?? 'Não informado'}
                                                </span>
                                            </p>

                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <span className="rounded border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-slate-400">
                                                    Início: <span className="text-slate-300">{formatDateTime(activity.started_at)}</span>
                                                </span>
                                                {activity.completed_at ? (
                                                    <span className="rounded border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-slate-400">
                                                        Fim: <span className="text-slate-300">{formatDateTime(activity.completed_at)}</span>
                                                    </span>
                                                ) : (
                                                    <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 font-medium text-yellow-400">
                                                        Em andamento
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="mt-3 whitespace-pre-wrap border-t border-slate-800 pt-3 text-sm leading-relaxed text-slate-300">
                                            {activity.description}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>
                </div>
            </div>
        </SIGMANLayout>
    );
}
