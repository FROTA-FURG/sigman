/*
 * Apoio à integração da Análise de Óleo com as Ordens de Serviço: rótulos de
 * status/tipo e datas de OS. O vínculo ponto de coleta -> equipamento do
 * sistema fica gravado no banco (oil_sampling_points.equipment_id; ver o
 * comando oil-analysis:import).
 */

// --- OS ----------------------------------------------------------------------

export const STATUS_OS = {
    open: { rot: 'Aberta', cls: 'bg-blue-500/10 text-blue-300 ring-blue-500/30' },
    scheduled: { rot: 'Agendada', cls: 'bg-purple-500/10 text-purple-300 ring-purple-500/30' },
    in_progress: { rot: 'Em andamento', cls: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
    completed: { rot: 'Concluída', cls: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
    cancelled: { rot: 'Cancelada', cls: 'bg-slate-500/10 text-slate-400 ring-slate-500/30' },
};

export const TIPO_OS = { corrective: 'Corretiva', preventive: 'Preventiva', predictive: 'Preditiva' };

/** created_at da OS é data-alvo (meia-noite UTC): lê a data direto da string. */
export const dataAlvoOs = (os) => (os.created_at || '').slice(0, 10);

/** OS ainda por fazer (abertas, agendadas ou em andamento, não inativadas). */
export function osPendente(os) {
    return !os.is_inactive && ['open', 'scheduled', 'in_progress'].includes(os.status);
}
