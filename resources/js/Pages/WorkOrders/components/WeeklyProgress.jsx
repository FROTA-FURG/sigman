import React, { useMemo } from 'react';
import WeeklyProgressTable from './WeeklyProgressTable';

export default function WeeklyProgress({
    workOrders = [],
    equipments = [],
    users = [],
    vesselFilter,
    statusFilter,
    periodFilter,
    typeFilter,
    planFilter,
    weekStart,
    weekEnd,
    currentUser
}) {
    const filteredWorkOrders = useMemo(() => {
        let result = workOrders;

        if (vesselFilter) result = result.filter(os => os.equipment?.vessel?.tag === vesselFilter);
        if (statusFilter) result = result.filter(os => os.status === statusFilter);
        if (periodFilter) result = result.filter(os => os.periodicity === periodFilter);
        if (typeFilter) result = result.filter(os => os.maintenance_type === typeFilter);
        if (planFilter) result = result.filter(os => Boolean(os.in_52_week_plan) === (planFilter === 'yes'));

        if (weekStart && weekEnd) {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas o dia
            
            // Verifica se a data atual está dentro do intervalo selecionado (Semana Atual)
            const isCurrentWeek = now >= weekStart && now <= weekEnd;

            result = result.filter(os => {
                if (!os.created_at) return false;
                const [datePart] = os.created_at.split('T');
                const [year, month, day] = datePart.split('-');
                const osDate = new Date(year, month - 1, day, 12, 0, 0);
                
                const inRange = osDate >= weekStart && osDate <= weekEnd;
                if (!inRange) return false;

                // REGRA NOVA: Na semana atual, por padrão, mostrar apenas "Aberto" ou "Em Andamento".
                // Isso esconde as OSs "Scheduled" (Agendadas) que ainda não foram liberadas pelo Cron Job.
                if (isCurrentWeek && !statusFilter) {
                    if (os.status !== 'open' && os.status !== 'in_progress') return false;
                }

                return true;
            });
        }

        return result;
    }, [workOrders, vesselFilter, statusFilter, periodFilter, typeFilter, planFilter, weekStart, weekEnd]);

    const isWeekly = Boolean(weekStart && weekEnd);
    const weeksMultiplier = isWeekly ? 1 : 52;
    const periodLabel = isWeekly ? 'Semanal' : 'Anual';

    const necessarioTotal = filteredWorkOrders.reduce((sum, os) => sum + (Number(os.estimated_hours) || 0), 0);
    
    const disponivelEquipe = (44 * 0.75) * weeksMultiplier;
    const dispPreventiva = 0.6 * disponivelEquipe;
    const dispTripulacao = 30 * weeksMultiplier;
    
    const capacidadeSemanalEquipe = 44 * 0.75;
    const backlog = capacidadeSemanalEquipe > 0 ? (necessarioTotal / capacidadeSemanalEquipe) : 0;

    const MiniCard = ({ title, value, unit, highlight }) => (
        <div className="flex flex-col justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate" title={title}>
                {title}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-xl font-bold leading-none ${highlight ? 'text-blue-400' : 'text-white'}`}>
                    {value}
                </span>
                {unit && <span className="text-[10px] font-medium text-slate-500">{unit}</span>}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0 mb-4">
                <MiniCard 
                    title="Necessário Total" 
                    value={necessarioTotal.toFixed(1)} 
                    unit="Hh" 
                    highlight={true} 
                />
                <MiniCard 
                    title={`Disponível Equipe (${periodLabel})`} 
                    value={disponivelEquipe.toFixed(1)} 
                    unit="Hh" 
                />
                <MiniCard 
                    title={`Disp. Preventiva (${periodLabel})`} 
                    value={dispPreventiva.toFixed(1)} 
                    unit="Hh" 
                />
                <MiniCard 
                    title={`Disp. Tripulação (${periodLabel})`} 
                    value={dispTripulacao.toFixed(1)} 
                    unit="Hh" 
                />
                <MiniCard 
                    title="Em Backlog" 
                    value={backlog.toFixed(2)} 
                    unit="Semanas" 
                    highlight={backlog > 1}
                />
            </div>

            <div className="flex-1 min-h-0">
                <WeeklyProgressTable
                    workOrders={workOrders}
                    equipments={equipments}
                    users={users}
                    vesselFilter={vesselFilter}
                    statusFilter={statusFilter}
                    periodFilter={periodFilter}
                    typeFilter={typeFilter}
                    planFilter={planFilter}
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    currentUser={currentUser}
                />
            </div>
        </div>
    );
}