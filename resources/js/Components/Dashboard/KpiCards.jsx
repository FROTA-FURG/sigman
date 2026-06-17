import React from 'react';
import { Link } from '@inertiajs/react';

export default function KpiCards() {
    const fleet = [
        { id: 1, name: "Atlântico Sul", status: "Operational" },
        { id: 2, name: "Ciências do Mar", status: "Maintenance" },
        { id: 3, name: "Lancha Larus", status: "Maintenance" },
    ];

    const equipmentList = [
        { id: 1, status: 'Active' }, 
        { id: 2, status: 'Active' },
        { id: 3, status: 'Inactive' }, 
        { id: 4, status: 'Maintenance' },
        { id: 5, status: 'Decommissioned' },
        { id: 5, status: 'Decommissioned' },
        { id: 5, status: 'Decommissioned' },
        { id: 5, status: 'Decommissioned' },
        { id: 5, status: 'Decommissioned' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Active' },
        { id: 5, status: 'Decommissioned' },
    ];

    // Logic: Vessel Calculations
    const maintenanceVessels = fleet.filter(vessel => vessel.status === "Maintenance");
    const spacing = '\u00A0'.repeat(10);
    const maintenanceNamesMarquee = maintenanceVessels.map(v => v.name).join(`${spacing} • ${spacing}`) + spacing.repeat(2);   

    const totalFleet = fleet.length;
    const operationalCount = fleet.filter(vessel => vessel.status === "Operational").length;
    const operationalPercentage = totalFleet > 0 ? Math.round((operationalCount / totalFleet) * 100) : 0;

    // Logic: Equipment Calculations
    const totalEquipment = equipmentList.length;
    const getEquipmentPercentage = (status) => {
        const count = equipmentList.filter(e => e.status === status).length;
        return totalEquipment > 0 ? Math.round((count / totalEquipment) * 100) : 0;
    };

    return (
        <>
            <style>{`
                @keyframes marquee-left-right {
                    0% { transform: translateX(-100%); left: 0; }
                    100% { transform: translateX(0); left: 100%; }
                }
                .animate-marquee-lr {
                    position: absolute;
                    white-space: nowrap;
                    animation: marquee-left-right 15s linear infinite;
                }
            `}</style>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                
                {/* Card 1: Embarcações Operacionais */}
               <div className="overflow-hidden rounded-xl bg-[#0b203c]/90 p-4 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Embarcações</p>
                            <p className="mt-1 text-2xl font-bold text-white">{operationalCount}</p>
                        </div>
                        <div className="rounded-full bg-blue-500/10 p-2 text-blue-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-2 text-[10px] text-green-500 font-bold tracking-tight uppercase">
                        {operationalPercentage}% Disponível
                    </div>
                </div>

                {/* Card 2: Em Manutenção (Carrossel) */}
                <div className="overflow-hidden rounded-xl bg-[#0b203c]/90 p-4 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Em Manutenção</p>
                            <p className="mt-1 text-2xl font-bold text-white">{maintenanceVessels.length}</p>
                        </div>
                        <div className="rounded-full bg-orange-500/10 p-2 text-orange-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-2 relative flex h-4 w-full items-center overflow-hidden text-[10px]">
                        <span className="font-medium text-orange-400 animate-marquee-lr italic">
                            {maintenanceNamesMarquee}
                        </span>
                    </div>
                </div>

                {/* Card 3: Equipamentos (Semafórico) */}
                <div className="overflow-hidden rounded-xl bg-[#0b203c]/90 p-4 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-blue-400">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Equipamentos</p>
                            <p className="mt-1 text-2xl font-bold text-white">{totalEquipment}</p>
                        </div>
                        <div className="rounded-full bg-slate-500/10 p-2 text-slate-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            </svg>
                        </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[9px] font-bold">
                        <div className="flex items-center text-green-500">
                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                            {getEquipmentPercentage('Active')}% Ativo
                        </div>
                        <div className="flex items-center text-yellow-500">
                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-yellow-500 shadow-[0_0_5px_#eab308]"></span>
                            {getEquipmentPercentage('Inactive')}% Inativo
                        </div>
                        <div className="flex items-center text-orange-500">
                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_#f97316]"></span>
                            {getEquipmentPercentage('Maintenance')}% Manut.
                        </div>
                        <div className="flex items-center text-red-500">
                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></span>
                            {getEquipmentPercentage('Decommissioned')}% Desat.
                        </div>
                    </div>
                </div>

                {/* Card 4: Ordens de Serviço */}
                <Link 
                    href={route('work-orders.index')} 
                    className="block overflow-hidden rounded-xl bg-[#0b203c]/90 p-4 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-indigo-900/20 hover:ring-indigo-500"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Ordens de Serviço</p>
                            <p className="mt-1 text-2xl font-bold text-white">28</p>
                        </div>
                        <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-2 text-[10px] font-bold italic tracking-tighter text-indigo-400 uppercase">
                        Em Andamento
                    </div>
                </Link>

                {/* Card 5: Solicitações */}
                <Link 
                    href={route('service-requests.index')}
                    className="block overflow-hidden rounded-xl bg-[#0b203c]/90 p-4 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-emerald-900/20 hover:ring-emerald-500"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Solicitações de Serviço</p>
                            <p className="mt-1 text-2xl font-bold text-white">12</p>
                        </div>
                        <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase italic tracking-tight">ABERTAS</div>
                </Link>
                
            </div>
        </>
    );
}