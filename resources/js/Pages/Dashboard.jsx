import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, usePage } from '@inertiajs/react';

// Importando nossos componentes modulares
import KpiCards from '@/Components/Dashboard/KpiCards';
import VesselTelemetryCards from '@/Components/Dashboard/VesselTelemetryCards';
import MaintenanceStatus from '@/Components/Dashboard/MaintenanceStatus';
import MonthlyChart from '@/Components/Dashboard/MonthlyChart';
import MaintenanceComplianceCharts from '@/Components/Dashboard/MaintenanceComplianceCharts';
import ServiceRequestsTable from '@/Components/Dashboard/ServiceRequestsTable';
import WorkOrdersTable from '@/Components/Dashboard/WorkOrdersTable';

export default function Dashboard({ vessels = [] }) {
    const user = usePage().props.auth.user;

    return (
        <SIGMANLayout>
            <Head title="Dashboard | SIGMAN" />

            {/* Painel de parede: preenche a tela toda, sem scroll (notebook, monitor e TV) */}
            <div className="flex h-full min-h-0 flex-col gap-3">

                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                        <h2 className="text-lg font-bold leading-tight text-white">Painel de Controle SIGMAN</h2>
                        <p className="text-[11px] text-slate-400">Monitoramento e indicadores de manutenção da frota.</p>
                    </div>
                </div>

                <div className="shrink-0">
                    <KpiCards />
                </div>

                {/* Monitoramento da frota (telemetria) — seção principal, cresce mais */}
                <div className="min-h-0 flex-[3]">
                    <VesselTelemetryCards vessels={vessels} />
                </div>

                {/* Indicadores compactos — última linha */}
                <div className="grid min-h-0 flex-[2] grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="min-h-0 min-w-0"><MonthlyChart /></div>
                    <div className="min-h-0 min-w-0"><MaintenanceStatus /></div>
                    <div className="min-h-0 min-w-0"><MaintenanceComplianceCharts /></div>
                </div>

            </div>
        </SIGMANLayout>
    );
}