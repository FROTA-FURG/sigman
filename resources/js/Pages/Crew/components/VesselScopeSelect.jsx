/**
 * Seletor do vínculo do usuário com embarcação, nos três estados possíveis:
 * toda a frota, uma embarcação específica, ou nenhuma.
 *
 * Os três estados moram em dois campos no banco (has_fleet_access + vessel_id),
 * mas para quem preenche o formulário é uma escolha só — por isso um único
 * <select> com uma opção especial para a frota.
 */

export const FLEET_OPTION = '__fleet__';

// Espelha User::FLEET_CAPABLE_ROLES no backend. Estagiário e marinheiro são
// tripulação de um navio específico; terceiro tem fluxo próprio (tela de
// Terceiros) e não passa por aqui.
const FLEET_CAPABLE_ROLES = ['dev', 'coordinator', 'engineer', 'technician'];
const CREW_ROLES = ['intern', 'seaman'];

export default function VesselScopeSelect({
    roles = [],
    vessels = [],
    roleId,
    vesselId,
    hasFleetAccess,
    onChange,
    error,
}) {
    const roleName = (roles.find(r => r.id === roleId)?.name || '').toLowerCase();
    const canHaveFleet = FLEET_CAPABLE_ROLES.includes(roleName);
    const isCrew = CREW_ROLES.includes(roleName);

    const value = hasFleetAccess ? FLEET_OPTION : (vesselId || '');

    const handleChange = (e) => {
        const picked = e.target.value;
        if (picked === FLEET_OPTION) {
            onChange({ vessel_id: '', has_fleet_access: true });
        } else {
            onChange({ vessel_id: picked, has_fleet_access: false });
        }
    };

    return (
        <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
                Embarcação {isCrew && <span className="text-red-500">*</span>}
            </label>
            <select
                value={value}
                onChange={handleChange}
                className={`w-full rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${error ? 'border-red-500' : ''}`}
            >
                {canHaveFleet && <option value={FLEET_OPTION}>Toda a Frota</option>}
                {!isCrew && <option value="">Sem embarcação (Não Alocado)</option>}
                {vessels && vessels.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                ))}
            </select>

            {canHaveFleet && (
                <p className="mt-1 text-[11px] text-slate-500">
                    “Toda a Frota” dá visão de todas as embarcações; caso contrário o usuário só enxerga a embarcação escolhida.
                </p>
            )}
            {isCrew && (
                <p className="mt-1 text-[11px] text-slate-500">
                    Estagiário e marinheiro são tripulação de uma embarcação específica.
                </p>
            )}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
