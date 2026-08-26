import React, { useMemo, useState } from 'react';
import MaintenanceYearCalendar from '@/Components/MaintenanceYearCalendar';
import CreateExecutionWindowModal from './CreateExecutionWindowModal';

/**
 * Calendário anual por embarcação. O filtro global de "Embarcação" (barra
 * de Filtros, compartilhado com Planejamento/Andamento/Métricas) já
 * escolhe uma; se estiver em "Todas", pede pra escolher aqui dentro, já
 * que misturar a manutenção de mais de um navio no mesmo grid de dias não
 * ajuda em nada -- perde-se justamente qual embarcação é cada bolinha.
 */
export default function FleetCalendar({
    workOrders = [],
    equipments = [],
    cruisePlans = {},
    vesselFilter,
    statusFilter,
    periodFilter,
    typeFilter,
    planFilter,
    currentUser,
}) {
    const roleName = String(currentUser?.role?.name || currentUser?.role || '').toLowerCase();
    const isTI = roleName.includes('developer') || roleName.includes('desenvolvedor') || roleName.includes('ti') || roleName.includes('admin');
    // Mesma regra do resto do módulo: quem não tem acesso à frota
    // (has_fleet_access) só enxerga a própria embarcação.
    const isGlobalViewer = Boolean(currentUser?.has_fleet_access) || isTI;

    const availableVessels = useMemo(() => {
        const mapa = new Map(); // tag -> { tag, name, vesselId }
        for (const os of workOrders) {
            const eq = equipments.find(e => e.id === os.equipment_id) || os.equipment;
            const v = eq?.vessel;
            if (v?.tag && !mapa.has(v.tag)) {
                mapa.set(v.tag, { tag: v.tag, name: v.name || v.tag, vesselId: eq?.vessel_id ?? v.id });
            }
        }
        let lista = [...mapa.values()].sort((a, b) => a.tag.localeCompare(b.tag));
        if (!isGlobalViewer) {
            lista = lista.filter(v => String(v.vesselId) === String(currentUser?.vessel_id));
        }
        return lista;
    }, [workOrders, equipments, isGlobalViewer, currentUser]);

    const [selfSelectedTag, setSelfSelectedTag] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Prioridade: filtro global da barra de Filtros > seleção feita aqui
    // dentro > única embarcação disponível (quem não vê a frota toda nem
    // precisa escolher).
    const selectedTag = vesselFilter || selfSelectedTag || (availableVessels.length === 1 ? availableVessels[0].tag : '');
    const selectedVessel = availableVessels.find(v => v.tag === selectedTag);

    const filteredWorkOrders = useMemo(() => {
        if (!selectedTag) return [];

        return workOrders.filter(os => {
            const eq = equipments.find(e => e.id === os.equipment_id) || os.equipment;
            const vesselTag = eq?.vessel?.tag;
            const eqVesselId = eq?.vessel_id ?? eq?.vessel?.id;

            if (vesselTag !== selectedTag) return false;

            if (!isGlobalViewer) {
                const userVesselId = currentUser?.vessel_id;
                if (!userVesselId || String(eqVesselId) !== String(userVesselId)) return false;
            }

            if (statusFilter && os.status !== statusFilter) return false;
            if (periodFilter && os.periodicity !== periodFilter) return false;
            if (typeFilter && os.maintenance_type !== typeFilter) return false;
            if (planFilter && Boolean(os.in_52_week_plan) !== (planFilter === 'yes')) return false;

            return true;
        });
    }, [workOrders, equipments, selectedTag, statusFilter, periodFilter, typeFilter, planFilter, isGlobalViewer, currentUser]);

    if (availableVessels.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
                Nenhuma embarcação disponível para visualizar.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <CreateExecutionWindowModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                vessel={selectedVessel}
                workOrders={workOrders}
                cruisePeriods={selectedTag ? (cruisePlans[selectedTag] || []) : []}
            />

            <div className="flex items-center justify-between gap-3">
                {!vesselFilter && availableVessels.length > 1 ? (
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Embarcação</label>
                        <select
                            value={selfSelectedTag}
                            onChange={(e) => setSelfSelectedTag(e.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-800 py-2 pl-3 pr-8 text-sm font-medium text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Selecione...</option>
                            {availableVessels.map(v => <option key={v.tag} value={v.tag}>{v.name}</option>)}
                        </select>
                    </div>
                ) : <span />}

                {selectedVessel && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Criar Janela de Execução
                    </button>
                )}
            </div>

            {selectedVessel ? (
                <MaintenanceYearCalendar
                    workOrders={filteredWorkOrders}
                    emptyLabel={`Nenhuma OS registrada para ${selectedVessel.name}`}
                    cruisePeriods={cruisePlans[selectedTag] || []}
                />
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
                    Selecione uma embarcação para ver o calendário anual de manutenção.
                </div>
            )}
        </div>
    );
}
