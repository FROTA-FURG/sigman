import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, usePage } from '@inertiajs/react';

// Importando nossos componentes modulares
import KpiCards from '@/Components/Dashboard/KpiCards';
import MaintenanceStatus from '@/Components/Dashboard/MaintenanceStatus';
import MonthlyChart from '@/Components/Dashboard/MonthlyChart';
import MaintenanceComplianceCharts from '@/Components/Dashboard/MaintenanceComplianceCharts';
import ServiceRequestsTable from '@/Components/Dashboard/ServiceRequestsTable';
import WorkOrdersTable from '@/Components/Dashboard/WorkOrdersTable';

export default function Dashboard() {
    const user = usePage().props.auth.user;

    return (
        <SIGMANLayout>
            <Head title="Dashboard | SIGMAN" />

            <div className="flex h-full flex-col space-y-4 overflow-hidden">

                <div className="shrink-0 border-b border-slate-800 pb-2">
                    <h2 className="text-xl font-bold leading-tight text-white">
                        Painel de Controle SIGMAN
                    </h2>
                    <p className="text-xs text-slate-400">Acompanhe os principais indicadores de manutenção da frota.</p>
                </div>

                <div className="shrink-0">
                    <KpiCards />
                </div>

                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    
                    <div className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-4">

                        <div className="min-w-0 h-full">
                            <MonthlyChart />
                        </div>
                        
                        <div className="min-w-0 h-full">
                            <MaintenanceStatus />
                        </div>

                        <div className="min-w-0 h-full">
                            <MaintenanceComplianceCharts /> 
                        </div>

                    </div>

                    

                    {/* <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        
                        <div className="min-h-0 overflow-y-auto rounded-xl ring-1 ring-slate-800 custom-scrollbar flex flex-col">
                            <ServiceRequestsTable />
                        </div>

                        <div className="min-h-0 overflow-y-auto rounded-xl ring-1 ring-slate-800 custom-scrollbar flex flex-col">
                            <WorkOrdersTable />
                        </div>

                    </div> */}

                </div>
                
            </div>
        </SIGMANLayout>
    );
}