/*
 * Origem da OS: Plano de 52 Semanas, Docagem e Atividade extra. Podem ser
 * combinadas, menos plano de 52 semanas + atividade extra (a trava que vale
 * está no servidor, WorkOrderController::validarOrigem).
 */
const OPCOES = [
    { campo: 'in_52_week_plan', rot: 'Plano de 52 Semanas', desc: 'Faz parte do cronograma anual de manutenção.' },
    { campo: 'is_docking', rot: 'Docagem', desc: 'Serviço da docagem da embarcação.' },
    { campo: 'is_extra_activity', rot: 'Atividade extra', desc: 'Fora do plano (não combina com o plano de 52 semanas).' },
];

const conflita = { in_52_week_plan: 'is_extra_activity', is_extra_activity: 'in_52_week_plan' };

export default function OriginFlags({ data, setData, disabled = false, error }) {
    return (
        <div>
            <span className="mb-1 block text-xs font-medium text-slate-400">Origem da OS</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {OPCOES.map(({ campo, rot, desc }) => {
                    const bloqueada = Boolean(conflita[campo] && data[conflita[campo]]);
                    const travada = disabled || bloqueada;
                    return (
                        <label key={campo}
                               title={bloqueada ? 'Plano de 52 Semanas e Atividade extra não podem ser marcados juntos.' : undefined}
                               className={`flex items-start gap-2.5 rounded-md border p-2.5 transition-colors ${data[campo] ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 bg-slate-950/60'} ${travada ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-600'}`}>
                            <input
                                type="checkbox"
                                checked={Boolean(data[campo])}
                                onChange={(e) => setData(campo, e.target.checked)}
                                disabled={travada}
                                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed"
                            />
                            <span>
                                <span className="block text-sm font-medium text-slate-200">{rot}</span>
                                <span className="block text-[11px] leading-snug text-slate-500">{desc}</span>
                            </span>
                        </label>
                    );
                })}
            </div>
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    );
}
