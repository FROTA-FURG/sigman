/*
 * Cálculos da medição de espessura de chapas (ultrassom).
 *
 *   Perda (%)            = (Ep − Eatual) / Ep
 *   EMA                  = Ep − Ep × 20% (alerta)  |  Ep − Ep × 25% (crítico)
 *   Taxa de corrosão     = (Ep − Eatual) / tempo decorrido      -> "TC norma" (API 570)
 *                          inclinação da reta pelas campanhas   -> "TC tendência"
 *   Vida residual (anos) = (Eatual − EMA crítica) / TC
 *
 * Eatual = menor leitura da chapa (pior caso) ou a média, conforme o seletor.
 * Limites únicos para todas as regiões: 20% alerta, 25% crítico.
 */

export const LIMITE_ALERTA = 0.2;
export const LIMITE_CRITICO = 0.25;

// Subida maior que isso entre campanhas = chapa substituída: a tendência
// recomeça dali (senão a reta mistura a chapa velha com a nova).
const SALTO_DE_SUBSTITUICAO_MM = 0.3;
// TC norma com base de tempo curta é dominada pela tolerância de laminação
// (ex.: CMI construído em 2017 e medido em 2018): não serve para projetar.
const BASE_MINIMA_TC_NORMA_ANOS = 3;

export const STATUS = {
    normal: { rot: 'Normal', cor: '#34d399', badge: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
    alerta: { rot: 'Alerta', cor: '#fbbf24', badge: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
    critico: { rot: 'Crítico', cor: '#f87171', badge: 'bg-red-500/10 text-red-300 ring-red-500/30' },
    semMedicao: { rot: 'Sem medição', cor: '#64748b', badge: 'bg-slate-500/10 text-slate-400 ring-slate-500/30' },
};

// Vida residual × próxima docagem.
export const PRAZO = {
    antes: { rot: 'Atinge o limite antes da próxima docagem', cor: '#f87171' },
    seguinte: { rot: 'Atinge o limite até a docagem seguinte (~2,5 anos depois)', cor: '#fbbf24' },
    folga: { rot: 'Com folga', cor: '#34d399' },
    semDados: { rot: 'Sem dados para projetar', cor: '#64748b' },
};
const INTERVALO_ENTRE_DOCAGENS_ANOS = 2.5;

export const chaveDaChapa = (regiao, numero) => `${regiao}-${numero}`;

export const media = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);

export function leitura(pontos, modo) {
    const validos = (pontos || []).filter((x) => x != null);
    if (!validos.length) return null;
    return modo === 'media' ? media(validos) : Math.min(...validos);
}

/** Ano decimal de uma data 'aaaa-mm-dd'. */
export const anoDecimal = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return a + (m - 1) / 12 + (d - 1) / 365;
};

const dataDeAnoDecimal = (ano) => {
    const a = Math.floor(ano);
    const resto = ano - a;
    const d = new Date(a, 0, 1);
    d.setDate(d.getDate() + Math.round(resto * 365));
    return d;
};

/** Regressão linear simples: y = a + b·x. */
function regressao(pontos) {
    const n = pontos.length;
    const mx = media(pontos.map((p) => p.x));
    const my = media(pontos.map((p) => p.y));
    const sxx = pontos.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    if (n < 2 || sxx === 0) return null;
    const b = pontos.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx;
    return { a: my - b * mx, b };
}

/**
 * Tudo o que a tela precisa de uma chapa, considerando só as campanhas até
 * `ateAno` (o controle de campanha "volta no tempo").
 */
export function analisarChapa({ ep, medicoes }, campanhas, { modo, ateAno, anoBase, proximaDocagem }) {
    // Sem E.P. (chapa só desenhada, sem planilha) não há como calcular perda.
    const serie = !ep ? [] : campanhas
        .map((c) => ({ c, pontos: (medicoes?.[c.id] ?? []).filter((v) => v != null) }))
        .filter(({ c, pontos }) => anoDecimal(c.data) <= ateAno + 0.999 && pontos.length)
        .map(({ c, pontos }) => ({ campanha: c, x: anoDecimal(c.data), y: leitura(pontos, modo), pontos }));

    const emaAlerta = ep * (1 - LIMITE_ALERTA);
    const emaCritica = ep * (1 - LIMITE_CRITICO);
    const base = { ep, emaAlerta, emaCritica, serie, status: 'semMedicao', prazo: 'semDados' };
    if (!serie.length) return base;

    // Recorta a série a partir da última substituição detectada. A detecção
    // olha sempre a MÉDIA: na mínima, um pite que aparece numa campanha e não
    // na seguinte pareceria uma "subida" e viraria falsa substituição.
    let inicio = 0;
    serie.forEach((p, i) => {
        if (i > 0 && media(p.pontos) > media(serie[i - 1].pontos) + SALTO_DE_SUBSTITUICAO_MM) inicio = i;
    });
    const trecho = serie.slice(inicio);
    const substituida = inicio > 0;

    const atual = serie[serie.length - 1];
    const perda = (ep - atual.y) / ep;
    const status = perda >= LIMITE_CRITICO ? 'critico' : perda >= LIMITE_ALERTA ? 'alerta' : 'normal';

    // TC norma: desde a construção (ou desde a substituição).
    const anoReferencia = substituida ? trecho[0].x : anoBase;
    const decorrido = atual.x - anoReferencia;
    const tcNorma = decorrido > 0 ? Math.max(0, (ep - atual.y) / decorrido) : null;
    const tcNormaBaseCurta = tcNorma != null && decorrido < BASE_MINIMA_TC_NORMA_ANOS;

    // TC tendência: inclinação da reta pelas campanhas (precisa de 2+).
    const reta = trecho.length >= 2 ? regressao(trecho) : null;
    const tcTendencia = reta ? Math.max(0, -reta.b) : null;

    const tc = tcTendencia ?? (tcNormaBaseCurta ? null : tcNorma);
    const vidaResidual = tc > 0 ? Math.max(0, (atual.y - emaCritica) / tc) : null;
    const anoLimite = vidaResidual != null ? atual.x + vidaResidual : null;

    let prazo = 'semDados';
    if (status === 'critico') prazo = 'antes';
    else if (anoLimite != null && proximaDocagem) {
        const doc = anoDecimal(proximaDocagem);
        prazo = anoLimite <= doc ? 'antes' : anoLimite <= doc + INTERVALO_ENTRE_DOCAGENS_ANOS ? 'seguinte' : 'folga';
    } else if (tc === 0) prazo = 'folga';

    return {
        ...base,
        atual,
        perda,
        status,
        substituida,
        trecho,
        reta,
        tcNorma,
        tcTendencia,
        tcNormaBaseCurta,
        fonteTc: tcTendencia != null ? 'tendencia' : tc != null ? 'norma' : null,
        vidaResidual,
        anoLimite,
        dataLimite: anoLimite != null ? dataDeAnoDecimal(anoLimite) : null,
        prazo,
    };
}

export const fmt = (v, casas = 2) => (v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
export const fmtPct = (v) => (v == null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
export const fmtData = (d) => (d ? d.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '—');
