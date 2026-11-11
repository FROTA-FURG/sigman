import { FILTROS_VAZIOS, osDoAndamento } from '../lib/os';
import React, { useMemo } from 'react';
import WeeklyProgressTable from './WeeklyProgressTable';

export default function WeeklyProgress({
    workOrders = [],
    equipments = [],
    users = [],
    filtros = FILTROS_VAZIOS,
    weekStart,
    weekEnd,
    currentUser
}) {
    // Mesma lista da tabela; o "Necessário" conta só o que ainda falta fazer.
    const filteredWorkOrders = useMemo(
        () => osDoAndamento(workOrders, filtros, weekStart, weekEnd).filter(os => !os.is_inactive && !['completed', 'cancelled'].includes(os.status)),
        [workOrders, filtros, weekStart, weekEnd],
    );

    const isWeekly = Boolean(weekStart && weekEnd);
    const weeksMultiplier = isWeekly ? 1 : 52;
    const periodLabel = isWeekly ? 'Semanal' : 'Anual';

    const necessarioTotal = filteredWorkOrders.reduce((sum, os) => sum + (Number(os.estimated_hours) || 0), 0);
    
    const disponivelEquipe = (44 * 0.75) * weeksMultiplier;
    const dispPreventiva = 0.6 * disponivelEquipe;
    const dispTripulacao = 30 * weeksMultiplier;
    
    // Demanda acima do que a equipe tem disponível no mesmo período.
    const excedente = necessarioTotal - disponivelEquipe;
    const ultrapassa = excedente > 0.05;

    const capacidadeSemanalEquipe = 44 * 0.75;
    const backlog = capacidadeSemanalEquipe > 0 ? (necessarioTotal / capacidadeSemanalEquipe) : 0;

    const MiniCard = ({ title, value, unit, highlight, alerta }) => (
        <div
            className={`relative flex flex-col justify-center rounded-lg border p-3 shadow-sm ${alerta ? 'border-red-500/60 bg-red-500/10' : 'border-slate-700/50 bg-slate-800/40'}`}
            title={alerta || undefined}
        >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400" title={alerta ? undefined : title}>
                <span className="truncate">{title}</span>
                {alerta && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-label="Atenção">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                )}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-xl font-bold leading-none ${alerta ? 'text-red-300' : highlight ? 'text-blue-400' : 'text-white'}`}>
                    {value}
                </span>
                {unit && <span className="text-[10px] font-medium text-slate-500">{unit}</span>}
            </div>
            {alerta && <span className="mt-1 text-[10px] font-medium text-red-300">Acima do disponível</span>}
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
                    alerta={ultrapassa ? `Ultrapassa em ${excedente.toFixed(1)} Hh o disponível da equipe (${disponivelEquipe.toFixed(1)} Hh, ${periodLabel.toLowerCase()})` : null}
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
                    filtros={filtros}
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    currentUser={currentUser}
                />
            </div>
        </div>
    );
}