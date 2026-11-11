import { pdf } from '@react-pdf/renderer';
import OSPdfTemplate from '../components/OSPdfTemplate';

/*
 * Regras e rótulos de OS usados em várias abas/modais.
 */

// Matriz de prioridade: prazo para resolver a OS.
export const PRIORIDADES = [
    { valor: 'critical', rot: 'Crítica', prazo: '24 horas', cor: 'text-red-400', fundo: 'bg-red-500/10 ring-red-500/40' },
    { valor: 'high', rot: 'Alta', prazo: '72 horas', cor: 'text-orange-400', fundo: 'bg-orange-500/10 ring-orange-500/40' },
    { valor: 'medium', rot: 'Média', prazo: '15 dias', cor: 'text-yellow-300', fundo: 'bg-yellow-500/10 ring-yellow-500/40' },
    { valor: 'low', rot: 'Baixa', prazo: 'Sem prazo definido', cor: 'text-slate-300', fundo: 'bg-slate-500/10 ring-slate-500/40' },
];

/** "[AS-CMA-SPP-MCP01] (antiga AS01-SPP-MCP) Motor principal" -- as duas TAGs no seletor. */
export function rotuloEquipamento(eq) {
    if (!eq) return '';
    const nova = eq.tag_number ? `[${eq.tag_number}] ` : '';
    const antiga = eq.tag_antigo && eq.tag_antigo !== eq.tag_number ? `(antiga ${eq.tag_antigo}) ` : '';
    return `${nova}${antiga}${eq.name}`;
}

// --- Barra de Filtros (seleção múltipla) --------------------------------------

/** Status da OS como o usuário vê: a inativada é "cancelled" no banco, mas é outra coisa. */
export const OPCOES_STATUS = [
    { valor: 'open', rot: 'Aberta' },
    { valor: 'scheduled', rot: 'Agendada' },
    { valor: 'in_progress', rot: 'Em andamento' },
    { valor: 'completed', rot: 'Concluída' },
    { valor: 'cancelled', rot: 'Cancelada' },
    { valor: 'inactive', rot: 'Inativada' },
];
export const OPCOES_CLASSE = [
    { valor: 'corrective', rot: 'Corretiva' },
    { valor: 'preventive', rot: 'Preventiva' },
    { valor: 'predictive', rot: 'Preditiva' },
];
export const OPCOES_ORIGEM = [
    { valor: 'yes', rot: 'Plano de 52 Semanas' },
    { valor: 'no', rot: 'Fora do plano' },
    { valor: 'docking', rot: 'Docagem' },
    { valor: 'extra', rot: 'Atividade extra' },
];
export const ROTULO_PERIODICIDADE = {
    daily: 'Diário', weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal', bimonthly: 'Bimestral',
    quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual', biennial: 'Bianual', triennial: 'Trianual',
    quadrennial: 'Quadrienal', sexennial: 'Sexênio',
};

export const FILTROS_VAZIOS = { embarcacoes: [], status: [], classes: [], periodicidades: [], origens: [] };

export const statusDaOs = (os) => (os.is_inactive ? 'inactive' : os.status);

export const quantosFiltros = (f) => Object.values(f || {}).reduce((n, lista) => n + (lista?.length || 0), 0);

/**
 * A OS passa nos filtros? Dentro de um mesmo filtro vale "qualquer um dos
 * marcados" (ex.: AS ou CM1); entre filtros diferentes, todos precisam bater.
 */
export function passaFiltros(os, f = FILTROS_VAZIOS) {
    const tag = os.equipment?.vessel?.tag;
    if (f.embarcacoes?.length && !f.embarcacoes.includes(tag)) return false;
    if (f.status?.length && !f.status.includes(statusDaOs(os))) return false;
    if (f.classes?.length && !f.classes.includes(os.maintenance_type)) return false;
    if (f.periodicidades?.length && !f.periodicidades.includes(os.periodicity || 'avulsa')) return false;
    if (f.origens?.length && !f.origens.some((o) => passaFiltroDeOrigem(os, o))) return false;
    return true;
}

/**
 * Filtro de origem (barra de Filtros):
 *   '' todas | 'yes' plano de 52 semanas | 'no' fora do plano |
 *   'docking' docagem | 'extra' atividade extra
 */
export function passaFiltroDeOrigem(os, filtro) {
    if (!filtro) return true;
    if (filtro === 'yes') return Boolean(os.in_52_week_plan);
    if (filtro === 'no') return !os.in_52_week_plan;
    if (filtro === 'docking') return Boolean(os.is_docking);
    if (filtro === 'extra') return Boolean(os.is_extra_activity);
    return true;
}

/** Selos de origem da OS para as tabelas. */
export function selosDeOrigem(os) {
    const selos = [];
    if (os.in_52_week_plan) selos.push({ rot: '52S', titulo: 'Plano de 52 Semanas', cls: 'bg-blue-500/15 text-blue-300 ring-blue-500/30' });
    if (os.is_docking) selos.push({ rot: 'DOC', titulo: 'Docagem', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' });
    if (os.is_extra_activity) selos.push({ rot: 'EXTRA', titulo: 'Atividade extra', cls: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30' });
    return selos;
}

/**
 * OS da aba Andamento no período. Sem status escolhido nos Filtros: abertas,
 * agendadas, em andamento e concluídas (estas vão para uma seção própria no
 * fim da tabela); canceladas/inativadas só aparecem se marcadas no filtro.
 */
export const STATUS_PADRAO_ANDAMENTO = ['open', 'scheduled', 'in_progress', 'completed'];

export function osDoAndamento(workOrders, filtros = FILTROS_VAZIOS, weekStart = null, weekEnd = null) {
    return workOrders.filter((os) => {
        if (!passaFiltros(os, filtros)) return false;
        if (!filtros.status?.length && !STATUS_PADRAO_ANDAMENTO.includes(statusDaOs(os))) return false;
        if (weekStart && weekEnd) {
            if (!os.created_at) return false;
            const [y, m, d] = os.created_at.substring(0, 10).split('-');
            const data = new Date(y, m - 1, d, 12, 0, 0);
            if (data < weekStart || data > weekEnd) return false;
        }
        return true;
    });
}

/** Dispara o download de um Blob com o nome dado. */
export function baixarBlob(blob, nome) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revogar na hora pode cortar o download quando vários saem em sequência.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Gera e baixa o PDF de uma OS. */
export async function baixarOsPdf(os) {
    const blob = await pdf(<OSPdfTemplate os={os} />).toBlob();
    baixarBlob(blob, `SIGMAN_OS_${os.os_number || 'Sem_Numero'}.pdf`);
}

/**
 * Baixa um PDF por OS, um de cada vez. A pausa entre eles evita que o
 * navegador descarte downloads disparados em rajada (o Chrome pede, uma
 * vez, permissão para "baixar vários arquivos").
 */
export async function baixarVariasOsPdf(lista, aoAvancar = () => {}) {
    for (let i = 0; i < lista.length; i++) {
        aoAvancar(i + 1, lista.length);
        await baixarOsPdf(lista[i]);
        if (i < lista.length - 1) await new Promise(r => setTimeout(r, 400));
    }
}

/** "Ana em 10/11/2026 14:30" -- quem salvou a OS por último. */
export function ultimaAtualizacao(os) {
    if (!os?.updated_at) return null;
    const quem = os.updater ? (os.updater.nickname || os.updater.username) : 'Sistema';
    const quando = new Date(os.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return { quem, quando };
}

/** Quem executou a atividade: usuário do sistema ou o nome digitado (gente de fora). */
export function nomeResponsavel(atividade) {
    const u = atividade?.responsible_user;
    if (u) return u.nickname || u.username || u.name;
    return atividade?.responsible_name || null;
}

/** "Ana em 10/11/2026 14:30" -- quem lançou/alterou a atividade por último. */
export function ultimaAtualizacaoAtividade(atividade) {
    if (!atividade?.updated_at || !atividade.updater) return null;
    return ultimaAtualizacao(atividade);
}

// ---- Histórico da OS (work_order_events) ----------------------------------

const ROTULO_CHECAGEM = { pending: 'Pendente', waiting: 'Aguardando', approved: 'Checada' };
const ROTULO_CARGO = { intern: 'estagiário', engineer: 'engenheiro', coordinator: 'coordenador', dev: 'TI', technician: 'técnico', seaman: 'marinheiro', terceiro: 'terceiro' };
const ROTULO_MODO = { periodicidade: 'pela periodicidade', nova_data: 'para nova data', sem_reagendamento: 'sem reagendar' };
const rotuloStatusOs = (v) => OPCOES_STATUS.find((o) => o.valor === v)?.rot || v;

export const rotuloCargo = (cargo) => ROTULO_CARGO[cargo] || cargo || '';

/** Texto e cor de um evento do histórico. */
export function descreverEvento(ev) {
    switch (ev.action) {
        case 'checagem':
            if (ev.to_value === 'approved') return { texto: 'Checou e aprovou', cor: 'text-emerald-400' };
            if (ev.to_value === 'waiting') return { texto: 'Marcou como aguardando', cor: 'text-orange-400' };
            return { texto: `Voltou a checagem para pendente (estava ${ROTULO_CHECAGEM[ev.from_value]?.toLowerCase() || ev.from_value})`, cor: 'text-slate-300' };
        case 'observacao': return { texto: 'Escreveu uma observação', cor: 'text-slate-300' };
        case 'comentario_engenheiro': return { texto: 'Observação do engenheiro', cor: 'text-blue-300' };
        case 'disparo': return { texto: `Disparou a OS (${rotuloStatusOs(ev.to_value)})`, cor: 'text-blue-400' };
        case 'status': return { texto: `Mudou o status: ${rotuloStatusOs(ev.from_value)} → ${rotuloStatusOs(ev.to_value)}`, cor: 'text-slate-300' };
        case 'inativacao':
            return ev.to_value
                ? { texto: `Inativou e reprogramou ${ROTULO_MODO[ev.from_value] || ''}: ${ev.to_value}`, cor: 'text-orange-400' }
                : { texto: 'Inativou sem reagendar', cor: 'text-orange-400' };
        case 'aprovacao_desfeita': return { texto: 'Desfez a aprovação da engenharia', cor: 'text-orange-300' };
        case 'reagendamento':
            return { texto: `Reagendou a OS atrasada ${ev.from_value === 'periodicidade' ? 'para o próximo ciclo' : 'para nova data'}: ${ev.to_value}`, cor: 'text-purple-300' };
        case 'reprogramada_de': return { texto: `Criada pela reprogramação da ${ev.from_value}`, cor: 'text-orange-300' };
        default: return { texto: ev.action, cor: 'text-slate-300' };
    }
}

/** Último evento de um dos tipos dados (ex.: quem disparou). */
export function ultimoEvento(os, ...acoes) {
    const lista = (os?.events || []).filter((e) => acoes.includes(e.action));
    return lista[lista.length - 1] || null;
}

export const quemFez = (ev) => (ev ? `${ev.user_name || 'Sistema'}${ev.user_role ? ` (${rotuloCargo(ev.user_role)})` : ''}` : '');

const GESTAO = ['dev', 'coordinator', 'engineer'];

/**
 * Aprovada pela gestão (mesma regra de WorkOrder::aprovadaPelaGestao): validação
 * final no disparo (approved_at) ou última checagem "aprovada" feita pela gestão.
 * Daí em diante só a gestão mexe na checagem.
 */
export function aprovadaPelaGestao(os) {
    if (os?.approved_at) return true;
    if ((os?.intern_status || 'pending') !== 'approved') return false;
    const ultima = ultimoEvento(os, 'checagem');
    return Boolean(ultima && ultima.to_value === 'approved' && GESTAO.includes(ultima.user_role));
}
