import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const formatDate = (value) => {
    if (!value) return '—';
    const [datePart] = String(value).split('T');
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
};

const formatDateTime = (value) =>
    value
        ? new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

const STATUS = {
    open: { label: 'Aberta', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    in_progress: { label: 'Em Andamento', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    scheduled: { label: 'Agendada', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    completed: { label: 'Concluída', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    cancelled: { label: 'Cancelada', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

function Badge({ status }) {
    const cfg = STATUS[status];
    if (!cfg) return <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[11px] font-bold text-slate-400">{status}</span>;
    return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cfg.classes}`}>{cfg.label}</span>;
}

export default function ExecutionWindowShow({ executionWindow, memberships = [], candidateWorkOrders = [] }) {
    const [showAdd, setShowAdd] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState(() => new Set());
    const [processing, setProcessing] = useState(false);

    const ativas = useMemo(() => memberships.filter(m => !m.removed_at), [memberships]);
    const removidas = useMemo(() => memberships.filter(m => m.removed_at), [memberships]);

    // Mesmas contas da aba Andamento (WeeklyProgress.jsx), só multiplicadas
    // pelo número de semanas da janela em vez de 1 (semanal) ou 52 (anual).
    const weeksMultiplier = useMemo(() => {
        const [ys, ms, ds] = executionWindow.start_date.split('T')[0].split('-').map(Number);
        const [ye, me, de] = executionWindow.end_date.split('T')[0].split('-').map(Number);
        const start = new Date(ys, ms - 1, ds);
        const end = new Date(ye, me - 1, de);
        const diffDays = Math.round((end - start) / 86400000) + 1;
        return Math.max(1, Math.ceil(diffDays / 7));
    }, [executionWindow]);

    const necessarioTotal = ativas.reduce((sum, m) => sum + (Number(m.work_order?.estimated_hours) || 0), 0);
    const disponivelEquipe = (44 * 0.75) * weeksMultiplier;
    const dispPreventiva = 0.6 * disponivelEquipe;
    const dispTripulacao = 30 * weeksMultiplier;
    const capacidadeSemanalEquipe = 44 * 0.75;
    const backlog = capacidadeSemanalEquipe > 0 ? (necessarioTotal / capacidadeSemanalEquipe) : 0;

    const MiniCard = ({ title, value, unit, highlight }) => (
        <div className="flex flex-col justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate" title={title}>{title}</span>
            <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-xl font-bold leading-none ${highlight ? 'text-blue-400' : 'text-white'}`}>{value}</span>
                {unit && <span className="text-[10px] font-medium text-slate-500">{unit}</span>}
            </div>
        </div>
    );

    const removerOS = (workOrderId) => {
        if (!confirm('Remover esta OS da Janela de Execução? A data prevista dela não muda, só sai deste lote.')) return;
        router.put(route('execution-windows.update', executionWindow.id), { remove_work_order_ids: [workOrderId] }, { preserveScroll: true });
    };

    /** Recoloca uma OS já removida de volta na janela (o histórico da remoção anterior fica preservado). */
    const recolocarOS = (workOrderId) => {
        router.put(route('execution-windows.update', executionWindow.id), { add_work_order_ids: [workOrderId] }, { preserveScroll: true });
    };

    const excluirJanela = () => {
        if (!confirm('Excluir esta Janela de Execução? As OS que estavam nela não são afetadas, só o agrupamento em si é apagado. Essa ação não pode ser desfeita.')) return;
        router.delete(route('execution-windows.destroy', executionWindow.id));
    };

    const toggleCandidata = (id) => {
        setSelectedToAdd(prev => {
            const novo = new Set(prev);
            if (novo.has(id)) novo.delete(id); else novo.add(id);
            return novo;
        });
    };

    const adicionarSelecionadas = () => {
        setProcessing(true);
        router.put(route('execution-windows.update', executionWindow.id), { add_work_order_ids: [...selectedToAdd] }, {
            preserveScroll: true,
            onSuccess: () => { setSelectedToAdd(new Set()); setShowAdd(false); },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <SIGMANLayout>
            <Head title={`Janela de Execução | ${executionWindow.vessel?.name} | SIGMAN`} />

            <div className="mx-auto max-w-5xl pb-10">
                <div className="mb-4 flex items-center justify-between">
                    <Link href={route('execution-windows.index')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Voltar para Janelas de Execução
                    </Link>

                    <button onClick={excluirJanela} className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300 ring-1 ring-inset ring-red-500/20">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Excluir Janela
                    </button>
                </div>

                <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-800 bg-[#0b203c] px-6 py-5 shadow-lg">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Janela de Execução</p>
                        <h1 className="mt-1 text-2xl font-bold text-white">{executionWindow.vessel?.name}</h1>
                        <p className="mt-2 text-sm text-slate-400">{formatDate(executionWindow.start_date)} — {formatDate(executionWindow.end_date)} · {weeksMultiplier} semana{weeksMultiplier > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <p>Criada por <span className="font-semibold text-slate-300">{executionWindow.creator?.nickname || executionWindow.creator?.username || '—'}</span> em {formatDate(executionWindow.created_at)}</p>
                        {executionWindow.updater && (
                            <p className="mt-1">Última edição por <span className="font-semibold text-slate-300">{executionWindow.updater.nickname || executionWindow.updater.username}</span> em {formatDate(executionWindow.updated_at)}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    <MiniCard title="Necessário Total" value={necessarioTotal.toFixed(1)} unit="Hh" highlight />
                    <MiniCard title="Disponível Equipe" value={disponivelEquipe.toFixed(1)} unit="Hh" />
                    <MiniCard title="Disp. Preventiva" value={dispPreventiva.toFixed(1)} unit="Hh" />
                    <MiniCard title="Disp. Tripulação" value={dispTripulacao.toFixed(1)} unit="Hh" />
                    <MiniCard title="Em Backlog" value={backlog.toFixed(2)} unit="Semanas" highlight={backlog > 1} />
                </div>

                <div className="mb-6 rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-lg overflow-hidden">
                    <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">OS na Janela ({ativas.length})</h3>
                        {candidateWorkOrders.length > 0 && (
                            <button onClick={() => setShowAdd(v => !v)} className="text-xs font-medium text-blue-400 hover:text-blue-300">
                                {showAdd ? 'Cancelar' : '+ Adicionar OS'}
                            </button>
                        )}
                    </div>

                    {showAdd && (
                        <div className="border-b border-slate-800 bg-slate-900/40 p-4">
                            <div className="max-h-56 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
                                {candidateWorkOrders.map(os => (
                                    <label key={os.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition ${selectedToAdd.has(os.id) ? 'border-blue-500/50 bg-blue-600/10' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'}`}>
                                        <input type="checkbox" checked={selectedToAdd.has(os.id)} onChange={() => toggleCandidata(os.id)} className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500" />
                                        <span className="min-w-0 flex-1">
                                            <span className="font-mono text-xs font-bold text-slate-300">#{os.os_number}</span>
                                            <span className="ml-2 text-[10px] text-slate-500">{os.estimated_hours ? `${os.estimated_hours}h` : 'sem estimativa'}</span>
                                            <span className="block truncate text-xs text-slate-400">{os.description}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={adicionarSelecionadas}
                                disabled={processing || selectedToAdd.size === 0}
                                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                            >
                                {processing ? 'Adicionando...' : `Adicionar ${selectedToAdd.size || ''} OS`}
                            </button>
                        </div>
                    )}

                    {ativas.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">Nenhuma OS ativa nesta janela.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-800">
                            <thead>
                                <tr>
                                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">OS</th>
                                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Descrição</th>
                                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Adicionada por</th>
                                    <th className="px-6 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/70">
                                {ativas.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-800/30 transition">
                                        <td className="whitespace-nowrap px-6 py-2.5 text-sm font-mono font-semibold text-slate-300">#{m.work_order?.os_number}</td>
                                        <td className="max-w-xs truncate px-4 py-2.5 text-sm text-slate-300">{m.work_order?.description}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5"><Badge status={m.work_order?.status} /></td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{m.added_by_user?.nickname || m.added_by_user?.username} em {formatDate(m.added_at)}</td>
                                        <td className="whitespace-nowrap px-6 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`${route('work-orders.show', m.work_order_id)}?back=${encodeURIComponent(route('execution-windows.show', executionWindow.id))}`} title="Abrir na tela de OS" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                </Link>
                                                <button onClick={() => removerOS(m.work_order_id)} title="Remover da janela" className="rounded-md p-1.5 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {removidas.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-[#0b203c]/60 shadow-lg overflow-hidden">
                        <div className="border-b border-slate-800 px-6 py-4">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Histórico de Remoções ({removidas.length})</h3>
                        </div>
                        <table className="min-w-full divide-y divide-slate-800">
                            <tbody className="divide-y divide-slate-800/70">
                                {removidas.map(m => (
                                    <tr key={m.id}>
                                        <td className="whitespace-nowrap px-6 py-2.5 text-sm font-mono text-slate-400">#{m.work_order?.os_number}</td>
                                        <td className="max-w-xs truncate px-4 py-2.5 text-sm text-slate-500">{m.work_order?.description}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                                            Removida por {m.removed_by_user?.nickname || m.removed_by_user?.username} em {formatDateTime(m.removed_at)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-2.5 text-right">
                                            <button onClick={() => recolocarOS(m.work_order_id)} className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline">
                                                Recolocar no plano
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </SIGMANLayout>
    );
}
