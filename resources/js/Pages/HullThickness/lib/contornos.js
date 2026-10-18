/*
 * Desenho do casco: regiões, imagens e contornos vindos do servidor.
 *
 * Cada região tem seu próprio QUADRO de coordenadas (largura × altura),
 * definido pela 1ª imagem enviada. Os contornos das chapas e a posição das
 * imagens usam esse quadro; trocar a imagem não move as chapas.
 *
 * Visão geral: não tem mapeamento próprio -- as regiões são arrumadas
 * automaticamente em linhas (costados em cima, conveses, depois anteparas e
 * espelho), cada uma escalada para caber.
 */

export const VISAO_GERAL = 'GERAL';

/** Converte a embarcação das props no formato que os componentes usam. */
export function montarDesenho(emb) {
    const regioes = Object.fromEntries(emb.regioes.map((r) => [r.code, r]));
    const contornos = Object.entries(emb.chapas)
        .filter(([, c]) => Array.isArray(c.contorno) && c.contorno.length >= 3)
        .map(([chave, c]) => {
            const [regiao, numero] = chave.split('-');
            return { regiao, numero: Number(numero), pontos: c.contorno, por: c.contornoPor, em: c.contornoEm };
        })
        .filter((c) => regioes[c.regiao]);
    return { regioes, contornos };
}

export const nomeDaRegiao = (desenho, regiao) => (regiao === VISAO_GERAL ? 'Visão geral' : desenho.regioes[regiao]?.nome);

/** Moldura [x1, y1, x2, y2] do quadro da região (null enquanto não tem imagem). */
export function caixaDe(desenho, regiao) {
    const q = desenho.regioes[regiao]?.quadro;
    return q ? [0, 0, q.largura, q.altura] : null;
}

// --- Visão geral ---------------------------------------------------------------

const LINHAS = [['BB'], ['BE'], ['CC', 'CP'], ['AV', 'AR', 'EP']];
const LARGURA_GERAL = 1000;
const ESPACO = 24;
const PROPORCAO_SEM_DESENHO = { BB: 3, BE: 3 }; // largura/altura do espaço reservado de quem ainda não tem imagem

/**
 * Posição de cada região na visão geral: { largura, altura, posicoes: { code: { x, y, escala, w, h } } }.
 * Em cada linha, as regiões ficam com a mesma altura e ocupam a largura toda.
 */
export function layoutVisaoGeral(desenho) {
    const codigos = Object.keys(desenho.regioes);
    const usados = new Set(LINHAS.flat());
    const linhas = [...LINHAS.map((l) => l.filter((c) => desenho.regioes[c])), codigos.filter((c) => !usados.has(c))].filter((l) => l.length);

    const posicoes = {};
    let y = 0;
    for (const linha of linhas) {
        const proporcoes = linha.map((c) => {
            const q = desenho.regioes[c].quadro;
            return q ? q.largura / q.altura : PROPORCAO_SEM_DESENHO[c] ?? 1.4;
        });
        const larguraUtil = LARGURA_GERAL - ESPACO * (linha.length - 1);
        const altura = larguraUtil / proporcoes.reduce((s, p) => s + p, 0);
        let x = 0;
        linha.forEach((c, i) => {
            const w = altura * proporcoes[i];
            const q = desenho.regioes[c].quadro;
            posicoes[c] = { x, y, w, h: altura, escala: q ? w / q.largura : 1 };
            x += w + ESPACO;
        });
        y += altura + ESPACO;
    }
    return { largura: LARGURA_GERAL, altura: Math.max(1, y - ESPACO), posicoes };
}

// --- Geometria -----------------------------------------------------------------

export const caminhoSvg = (pontos) => `M${pontos.map(([x, y]) => `${x},${y}`).join('L')}Z`;

export function centroide(pontos) {
    const n = pontos.length;
    return [pontos.reduce((s, p) => s + p[0], 0) / n, pontos.reduce((s, p) => s + p[1], 0) / n];
}

/** Posição que centraliza a imagem inteira no quadro, com uma escala extra opcional. */
export function centralizarNoQuadro(imagem, quadro, escala = 1) {
    const fit = Math.min(quadro.largura / imagem.larguraPx, quadro.altura / imagem.alturaPx) * escala;
    const largura = imagem.larguraPx * fit;
    const altura = imagem.alturaPx * fit;
    return { largura, altura, escala, x: (quadro.largura - largura) / 2, y: (quadro.altura - altura) / 2 };
}

/**
 * Alterações de contorno entre duas listas, só da região: [{ numero, pontos | null }].
 * É o que vai para o servidor (inclusive no Ctrl+Z).
 */
export function diferencas(antes, depois, regiao) {
    const mapa = (lista) => new Map(lista.filter((c) => c.regiao === regiao).map((c) => [c.numero, c.pontos]));
    const a = mapa(antes);
    const d = mapa(depois);
    const numeros = new Set([...a.keys(), ...d.keys()]);
    return [...numeros]
        .filter((n) => JSON.stringify(a.get(n) ?? null) !== JSON.stringify(d.get(n) ?? null))
        .map((n) => ({ numero: n, pontos: d.get(n) ?? null }));
}
