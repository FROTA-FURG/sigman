import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link, usePage } from '@inertiajs/react';

const STATUS = {
    open:        { label: 'Aberta',       classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    in_progress: { label: 'Em Andamento', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    scheduled:   { label: 'Agendada',     classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    completed:   { label: 'Concluída',    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    cancelled:   { label: 'Cancelada',    classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

function StatCard({ label, value, accent }) {
    return (
        <div className="rounded-xl border border-slate-800 bg-[#0b203c] px-5 py-4 shadow-lg">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
        </div>
    );
}

export default function Dashboard({ workOrders = [], stats = {} }) {
    const user = usePage().props.auth.user;

    return (
        <SIGMANLayout>
            <Head title="Dashboard | SIGMAN" />

            <div className="mx-auto max-w-6xl">
                <div className="mb-6 border-b border-slate-800 pb-3">
                    <h1 className="text-xl font-bold text-white">Painel do Terceiro</h1>
                    <p className="text-xs text-slate-400">
                        Bem-vindo, {user.nickname || user.name}. Acompanhe as Ordens de Serviço atribuídas à sua empresa.
                    </p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Total de OS" value={stats.total ?? 0} accent="text-white" />
                    <StatCard label="Abertas" value={stats.open ?? 0} accent="text-blue-400" />
                    <StatCard label="Em Andamento" value={stats.in_progress ?? 0} accent="text-yellow-400" />
                    <StatCard label="Concluídas" value={stats.completed ?? 0} accent="text-emerald-400" />
                    <StatCard label="Atrasadas" value={stats.delayed ?? 0} accent="text-red-400" />
                </div>

                {/* Lista de OS */}
                <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c] shadow-lg">
                    <header className="border-b border-slate-800 px-6 py-4">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Ordens de Serviço da Empresa</h2>
                    </header>

                    {workOrders.length === 0 ? (
                        <p className="px-6 py-10 text-center text-sm text-slate-500">
                            Nenhuma Ordem de Serviço atribuída à sua empresa ainda.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/40 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">OS</th>
                                        <th className="px-6 py-3 font-medium">Embarcação</th>
                                        <th className="px-6 py-3 font-medium">Equipamento</th>
                                        <th className="px-6 py-3 font-medium">Data Prevista</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {workOrders.map((os) => {
                                        const status = STATUS[os.status];
                                        return (
                                            <tr key={os.id} className="transition hover:bg-slate-800/40">
                                                <td className="px-6 py-3 font-mono font-semibold text-white">{os.os_number}</td>
                                                <td className="px-6 py-3 text-slate-300">{os.equipment?.vessel?.name ?? '—'}</td>
                                                <td className="px-6 py-3 text-slate-300">{os.equipment?.name ?? '—'}</td>
                                                <td className="px-6 py-3 text-slate-400">{formatDate(os.created_at)}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status?.classes ?? 'border-slate-700 text-slate-400'}`}>
                                                        {status?.label ?? os.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <Link
                                                        href={route('work-orders.show', os.id)}
                                                        className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                                                    >
                                                        Abrir
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </SIGMANLayout>
    );
}
