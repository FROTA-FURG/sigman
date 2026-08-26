import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link, router } from '@inertiajs/react';
import WorkOrdersTabBar from '../components/WorkOrdersTabBar';

const formatDate = (value) => {
    if (!value) return '—';
    const [datePart] = String(value).split('T');
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
};

export default function ExecutionWindowsIndex({ executionWindows = [] }) {
    return (
        <SIGMANLayout>
            <Head title="Janelas de Execução | SIGMAN" />

            <div className="flex h-full flex-col space-y-4">
                <div>
                    <h2 className="text-xl font-bold leading-tight text-white">Ordens de Serviço</h2>
                    <p className="text-xs text-slate-400">Histórico de Janelas de Execução já criadas.</p>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800">
                    <WorkOrdersTabBar activeTab="execution-windows" onTabClick={() => router.visit(route('work-orders.index'))} />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-lg backdrop-blur-md">
                    {executionWindows.length === 0 ? (
                        <div className="flex h-full items-center justify-center p-10 text-center text-sm text-slate-500">
                            Nenhuma Janela de Execução criada ainda. Crie uma pela aba Calendário, escolhendo a embarcação.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-800">
                            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Embarcação</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Período</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">OS ativas</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Criado por</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Última edição</th>
                                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/70">
                                {executionWindows.map(w => (
                                    <tr key={w.id} className="hover:bg-slate-800/30 transition">
                                        <td className="whitespace-nowrap px-6 py-3 text-sm font-semibold text-white">{w.vessel?.name}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">{formatDate(w.start_date)} — {formatDate(w.end_date)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">{w.work_orders_count}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-400">{w.creator?.nickname || w.creator?.username || '—'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-400">{w.updater ? (w.updater.nickname || w.updater.username) : '—'}</td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right">
                                            <Link href={route('execution-windows.show', w.id)} className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline">
                                                Ver detalhes
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </SIGMANLayout>
    );
}
