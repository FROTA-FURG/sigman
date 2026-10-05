/**
 * Regras de condição da análise de óleo, espelhando a planilha "Ferramenta
 * de Gestão de Análise de Óleo".
 *
 * Validada contra as 204 amostras da planilha: reproduz a condição
 * registrada em 200 (98%). As 4 que não batem são da unidade hidráulica do
 * Munck (AS01-SMC-UHI03), que está com os limites de viscosidade em branco
 * na planilha -- ali a condição veio do laudo, não de regra.
 *
 * Por isso a condição OFICIAL de uma amostra é a registrada (laudo); o
 * cálculo daqui serve pra colorir cada valor e pra classificar análises
 * lançadas à mão.
 */

export const NIVEL = { NORMAL: 0, ATENCAO: 1, INTERVIR: 2 };
export const NIVEL_ROTULO = ['Normal', 'Atenção', 'Intervir'];

const ORDEM_CONDICAO = { Normal: 0, 'Atenção': 1, Intervir: 2 };

export const ESTILO_CONDICAO = {
    Normal: { badge: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30', dot: 'bg-emerald-500', celula: 'text-emerald-300' },
    'Atenção': { badge: 'bg-amber-500/10 text-amber-400 ring-amber-500/30', dot: 'bg-amber-500', celula: 'bg-amber-500/15 text-amber-300' },
    Intervir: { badge: 'bg-red-500/10 text-red-400 ring-red-500/30', dot: 'bg-red-500', celula: 'bg-red-500/20 text-red-300 font-semibold' },
    default: { badge: 'bg-slate-500/10 text-slate-400 ring-slate-500/30', dot: 'bg-slate-500', celula: 'text-slate-300' },
};

/**
 * Nível de um parâmetro frente aos limites do equipamento.
 * Retorna 0/1/2, ou null quando não dá pra avaliar (sem valor ou sem limite
 * cadastrado) -- nesse caso a célula fica neutra, em vez de afirmar "normal".
 */
export function nivelDoParametro(parametro, valor, limites) {
    if (valor === null || valor === undefined || !limites) return null;
    const { chave, sentido } = parametro;
    const amarelo = limites.amarelo || {};
    const vermelho = limites.vermelho || {};

    if (sentido === 'faixa') {
        const ri = vermelho[`${chave}_inf`], rs = vermelho[`${chave}_sup`];
        const ai = amarelo[`${chave}_inf`], as = amarelo[`${chave}_sup`];
        if (ri == null && ai == null) return null;
        if (ri != null && rs != null && (valor < ri || valor > rs)) return NIVEL.INTERVIR;
        if (ai != null && as != null && (valor < ai || valor > as)) return NIVEL.ATENCAO;
        return NIVEL.NORMAL;
    }

    const r = vermelho[chave];
    const a = amarelo[chave];

    if (sentido === 'min') {
        // TBN: reserva alcalina -- cair abaixo do limite é o problema.
        if (r == null && a == null) return null;
        if (r != null && valor <= r) return NIVEL.INTERVIR;
        if (a != null && valor <= a) return NIVEL.ATENCAO;
        return NIVEL.NORMAL;
    }

    // Contagem de partículas da hidráulica tem faixa verde própria:
    // acima do verde já é atenção, a partir do vermelho é intervir.
    if (chave === 'nas' && limites.verde?.nas != null) {
        if (r != null && valor >= r) return NIVEL.INTERVIR;
        if (valor > limites.verde.nas) return NIVEL.ATENCAO;
        return NIVEL.NORMAL;
    }

    if (r == null && a == null) return null;
    if (r != null && valor >= r) return NIVEL.INTERVIR;
    if (a != null && valor >= a) return NIVEL.ATENCAO;
    return NIVEL.NORMAL;
}

export function parametrosDaFamilia(familia) {
    return (familia?.grupos || []).flatMap((g) => g.parametros);
}

/** Pior nível entre os parâmetros avaliáveis; null se nenhum pôde ser avaliado. */
export function condicaoCalculada(resultados, familia, limites) {
    let pior = null;
    for (const p of parametrosDaFamilia(familia)) {
        const n = nivelDoParametro(p, resultados?.[p.chave], limites);
        if (n !== null && (pior === null || n > pior)) pior = n;
    }
    return pior === null ? null : NIVEL_ROTULO[pior];
}

/** Condição oficial: a registrada (laudo) quando existe, senão a calculada. */
export function condicaoDaAmostra(amostra, familia, limites) {
    return amostra.condicao || condicaoCalculada(amostra.resultados, familia, limites);
}

export function piorCondicao(condicoes) {
    return condicoes.reduce((pior, c) => {
        if (!c) return pior;
        if (!pior) return c;
        return (ORDEM_CONDICAO[c] ?? -1) > (ORDEM_CONDICAO[pior] ?? -1) ? c : pior;
    }, null);
}

/** Amostras em ordem cronológica (data, depois número da amostra). */
export function ordenarAmostras(amostras) {
    return [...amostras].sort((a, b) => {
        const da = a.dataColeta || '';
        const db = b.dataColeta || '';
        if (da !== db) return da < db ? -1 : 1;
        return (a.numero || 0) - (b.numero || 0);
    });
}

/** Texto do limite de um parâmetro, pro tooltip e pra tabela de limites. */
export function descreverLimite(parametro, limites, cor) {
    const faixa = limites?.[cor] || {};
    const k = parametro.chave;
    if (parametro.sentido === 'faixa') {
        const inf = faixa[`${k}_inf`], sup = faixa[`${k}_sup`];
        return inf != null && sup != null ? `${formatarNumero(inf)} – ${formatarNumero(sup)}` : null;
    }
    const v = faixa[k];
    if (v == null) return null;
    return parametro.sentido === 'min' ? `≤ ${formatarNumero(v)}` : `≥ ${formatarNumero(v)}`;
}

// --- Formatação --------------------------------------------------------------

export function formatarNumero(valor, casas = 2) {
    if (valor === null || valor === undefined || valor === '') return '—';
    const n = Number(valor);
    if (Number.isNaN(n)) return String(valor);
    return n.toLocaleString('pt-BR', { maximumFractionDigits: casas });
}

/** 'aaaa-mm-dd' -> 'dd/mm/aaaa', direto da string (data sem hora, sem fuso). */
export function formatarData(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('T')[0].split('-');
    return a && m && d ? `${d}/${m}/${a}` : '—';
}

export function formatarDataCurta(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('T')[0].split('-');
    return a && m && d ? `${d}/${m}/${a.slice(2)}` : '—';
}

export function hojeIso() {
    const h = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(h.getDate())}`;
}

export function diasEntre(isoA, isoB) {
    const [a1, m1, d1] = isoA.split('-').map(Number);
    const [a2, m2, d2] = isoB.split('-').map(Number);
    return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

/**
 * Parâmetros da amostra em Atenção/Intervir, já em texto:
 * "Cu 45 ppm (Intervir ≥ 41)". Piores primeiro.
 */
export function parametrosEmAlerta(amostra, familia, limites) {
    return parametrosDaFamilia(familia)
        .map((p) => ({ p, v: amostra?.resultados?.[p.chave], n: nivelDoParametro(p, amostra?.resultados?.[p.chave], limites) }))
        .filter((x) => x.n >= NIVEL.ATENCAO)
        .sort((a, b) => b.n - a.n)
        .map(({ p, v, n }) => {
            const cor = n === NIVEL.INTERVIR ? 'vermelho' : 'amarelo';
            const lim = descreverLimite(p, limites, cor);
            return `${p.rotulo} ${formatarNumero(v)}${p.unidade ? ` ${p.unidade}` : ''} (${NIVEL_ROTULO[n]}${lim ? ` ${lim}` : ''})`;
        });
}
