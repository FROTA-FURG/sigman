import padrao from '../data/contornos.json';

/*
 * Contornos das chapas sobre o desenho de cada embarcação.
 *
 * Fase atual (só frontend): o padrão vem de data/contornos.json (versionado)
 * e o que a ferramenta de Mapeamento desenha fica salvo neste navegador
 * (localStorage). "Exportar JSON" gera o arquivo para substituir o padrão --
 * depois esse JSON vira tabela no banco (regiões e contornos por embarcação).
 *
 * Coordenadas em pixels do desenho original (largura × altura declaradas):
 * se o desenho for trocado por um de maior resolução com o mesmo
 * enquadramento, basta escalar.
 *
 * Imagem por região: o usuário pode subir um desenho novo só para uma região
 * (ex.: Boreste). Ela fica posicionada dentro da moldura da região
 * ({ src, x, y, largura, altura } no mesmo sistema de coordenadas), por cima
 * do desenho original; os contornos existentes continuam onde estão. Nesta
 * fase a imagem fica no navegador; com o backend, vai para o servidor.
 */

const CHAVE = 'sigman.espessura.contornos.v1';

export const EMBARCACOES = Object.keys(padrao);

/*
 * Visão geral: todas as partes juntas. Não precisa de mapeamento próprio --
 * cada região é um recorte do mesmo desenho, então os contornos (e as
 * imagens trocadas, posicionadas na moldura da região) já estão nas
 * coordenadas da folha inteira.
 */
export const VISAO_GERAL = 'GERAL';

/** Moldura [x1, y1, x2, y2] de uma região, ou da folha inteira na visão geral. */
export const caixaDe = (desenho, regiao) => (regiao === VISAO_GERAL ? [0, 0, desenho.largura, desenho.altura] : desenho.regioes[regiao].caixa);

export const nomeDaRegiao = (desenho, regiao) => (regiao === VISAO_GERAL ? 'Visão geral' : desenho.regioes[regiao]?.nome);

function lerSalvo() {
    try {
        return JSON.parse(window.localStorage.getItem(CHAVE) || 'null') || {};
    } catch {
        return {};
    }
}

/** Desenho + regiões + contornos + imagens por região (salvos no navegador, se houver). */
export function carregarDesenho(embarcacao) {
    const salvo = lerSalvo()[embarcacao];
    const base = padrao[embarcacao];
    return {
        ...base,
        contornos: salvo?.contornos ?? base.contornos,
        imagensRegiao: salvo?.imagens ?? base.imagensRegiao ?? {},
        historicoImagens: salvo?.historicoImagens ?? {},
        editadoNoNavegador: Boolean(salvo),
    };
}

function gravar(embarcacao, alteracao) {
    try {
        const tudo = lerSalvo();
        const atual = tudo[embarcacao] ?? { contornos: padrao[embarcacao].contornos, imagens: padrao[embarcacao].imagensRegiao ?? {} };
        tudo[embarcacao] = { ...atual, ...alteracao, salvoEm: new Date().toISOString() };
        window.localStorage.setItem(CHAVE, JSON.stringify(tudo));
        return true;
    } catch {
        return false; // sem storage ou cota cheia (imagem grande)
    }
}

export const salvarContornos = (embarcacao, contornos) => gravar(embarcacao, { contornos });

// --- Histórico de imagens por região ----------------------------------------
// Espelha a futura tabela hull_region_images: cada imagem enviada vira um
// registro (quem/quando enviou, último ajuste de posição, quando foi
// substituída). O arquivo da imagem em uso fica em `imagens[regiao]`; o das
// antigas, no próprio registro. Se o armazenamento do navegador encher, os
// arquivos das mais antigas são descartados e o registro continua.

const agora = () => new Date().toISOString();
const novoId = () => `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function estadoImagens(embarcacao) {
    const salvo = lerSalvo()[embarcacao];
    return {
        imagens: { ...(salvo?.imagens ?? padrao[embarcacao].imagensRegiao ?? {}) },
        historicoImagens: JSON.parse(JSON.stringify(salvo?.historicoImagens ?? {})),
    };
}

/** Grava; se faltar espaço, descarta o arquivo das imagens antigas (mais velhas primeiro) e tenta de novo. */
function gravarImagens(embarcacao, imagens, historicoImagens) {
    if (gravar(embarcacao, { imagens, historicoImagens })) return { ok: true, descartadas: 0 };
    const antigas = Object.values(historicoImagens).flat()
        .filter((h) => h.src && h.substituidaEm)
        .sort((a, b) => a.substituidaEm.localeCompare(b.substituidaEm));
    let descartadas = 0;
    for (const h of antigas) {
        h.src = null;
        h.arquivoDescartado = true;
        descartadas += 1;
        if (gravar(embarcacao, { imagens, historicoImagens })) return { ok: true, descartadas };
    }
    return { ok: false, descartadas };
}

/** Tira a imagem atual de uso: o arquivo vai para o registro dela no histórico. */
function aposentarAtual(imagens, historicoImagens, regiao) {
    const atual = imagens[regiao];
    if (!atual) return;
    const registro = (historicoImagens[regiao] ?? []).find((h) => h.id === atual.id);
    if (registro) Object.assign(registro, { src: atual.src, substituidaEm: agora() });
    delete imagens[regiao];
}

/** Nova imagem em uso na região (envio ou reuso de uma antiga). */
export function registrarNovaImagem(embarcacao, regiao, imagem, usuario) {
    const { imagens, historicoImagens } = estadoImagens(embarcacao);
    aposentarAtual(imagens, historicoImagens, regiao);
    const id = novoId();
    const quando = agora();
    imagens[regiao] = { ...imagem, id, enviadaPor: usuario, enviadaEm: quando };
    historicoImagens[regiao] = [
        { id, nome: imagem.nome, larguraPx: imagem.larguraPx, alturaPx: imagem.alturaPx, enviadaPor: usuario, enviadaEm: quando, src: null },
        ...(historicoImagens[regiao] ?? []),
    ];
    return { ...gravarImagens(embarcacao, imagens, historicoImagens), imagens, historicoImagens };
}

/** Ajuste de posição/escala da imagem em uso. */
export function registrarAjusteImagem(embarcacao, regiao, posicao, usuario) {
    const { imagens, historicoImagens } = estadoImagens(embarcacao);
    if (!imagens[regiao]) return { ok: false, imagens, historicoImagens };
    const quando = agora();
    imagens[regiao] = { ...imagens[regiao], ...posicao, posicionadaPor: usuario, posicionadaEm: quando };
    const registro = (historicoImagens[regiao] ?? []).find((h) => h.id === imagens[regiao].id);
    if (registro) Object.assign(registro, { posicionadaPor: usuario, posicionadaEm: quando });
    return { ...gravarImagens(embarcacao, imagens, historicoImagens), imagens, historicoImagens };
}

/** Volta a região ao desenho original (a imagem atual fica no histórico). */
export function removerImagemRegiao(embarcacao, regiao, usuario) {
    const { imagens, historicoImagens } = estadoImagens(embarcacao);
    const atual = imagens[regiao];
    aposentarAtual(imagens, historicoImagens, regiao);
    const registro = (historicoImagens[regiao] ?? []).find((h) => h.id === atual?.id);
    if (registro) registro.removidaPor = usuario;
    return { ...gravarImagens(embarcacao, imagens, historicoImagens), imagens, historicoImagens };
}

/** Última atualização de imagem da região (envio, ajuste ou remoção) -- futura hull_regions.image_updated_by/at. */
export function ultimaAtualizacaoImagem(historico = []) {
    const eventos = historico.flatMap((h) => [
        h.enviadaEm && { quem: h.enviadaPor, quando: h.enviadaEm, oque: 'enviou' },
        h.posicionadaEm && { quem: h.posicionadaPor, quando: h.posicionadaEm, oque: 'ajustou' },
        h.substituidaEm && h.removidaPor && { quem: h.removidaPor, quando: h.substituidaEm, oque: 'removeu' },
    ]).filter(Boolean);
    return eventos.sort((a, b) => b.quando.localeCompare(a.quando))[0] ?? null;
}

/** Troca (ou remove, com null) a imagem de uma região sem histórico -- usado na importação de JSON. */
export function salvarImagemRegiao(embarcacao, regiao, imagem) {
    const imagens = { ...(lerSalvo()[embarcacao]?.imagens ?? padrao[embarcacao].imagensRegiao ?? {}) };
    if (imagem) imagens[regiao] = imagem;
    else delete imagens[regiao];
    return gravar(embarcacao, { imagens });
}

/**
 * Lê a imagem escolhida e reduz para no máx. 2000 px no lado maior (cabe no
 * armazenamento do navegador e continua nítida no zoom da região).
 */
export function lerImagem(arquivo, ladoMaximo = 2000) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = () => reject(new Error('não foi possível ler o arquivo.'));
        leitor.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('o arquivo não é uma imagem válida.'));
            img.onload = () => {
                const fator = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * fator);
                canvas.height = Math.round(img.height * fator);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff'; // PNG com transparência vira fundo branco, como o desenho
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve({ src: canvas.toDataURL('image/jpeg', 0.85), larguraPx: canvas.width, alturaPx: canvas.height, nome: arquivo.name });
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    });
}

/** Posição que centraliza a imagem inteira dentro da moldura da região, com uma escala extra opcional. */
export function centralizarNaRegiao(imagem, caixa, escala = 1) {
    const [x1, y1, x2, y2] = caixa;
    const fit = Math.min((x2 - x1) / imagem.larguraPx, (y2 - y1) / imagem.alturaPx) * escala;
    const largura = imagem.larguraPx * fit;
    const altura = imagem.alturaPx * fit;
    return { ...imagem, largura, altura, x: x1 + (x2 - x1 - largura) / 2, y: y1 + (y2 - y1 - altura) / 2 };
}

export function descartarEdicao(embarcacao) {
    try {
        const tudo = lerSalvo();
        delete tudo[embarcacao];
        window.localStorage.setItem(CHAVE, JSON.stringify(tudo));
    } catch { /* sem storage: nada a descartar */ }
}

/** Arquivo no mesmo formato de data/contornos.json, só com esta embarcação (inclui as imagens trocadas). */
export function exportarJson(embarcacao, contornos, imagensRegiao = {}) {
    const { tagSistema, imagem, largura, altura, regioes } = padrao[embarcacao];
    const ordenados = [...contornos].sort((a, b) => a.regiao.localeCompare(b.regiao) || a.numero - b.numero);
    const blob = new Blob([JSON.stringify({ [embarcacao]: { tagSistema, imagem, largura, altura, regioes, imagensRegiao, contornos: ordenados } }, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `contornos-${embarcacao}.json` });
    a.click();
    URL.revokeObjectURL(url);
}

/** Lê um JSON exportado; devolve contornos e imagens da embarcação ou lança erro legível. */
export async function lerJsonImportado(arquivo, embarcacao) {
    const dados = JSON.parse(await arquivo.text());
    const contornos = dados?.[embarcacao]?.contornos;
    if (!Array.isArray(contornos)) throw new Error(`O arquivo não tem contornos de ${embarcacao}.`);
    return {
        contornos: contornos.filter((c) => c.regiao && Number.isInteger(c.numero) && Array.isArray(c.pontos) && c.pontos.length >= 3),
        imagens: dados[embarcacao].imagensRegiao ?? null,
    };
}

export const caminhoSvg = (pontos) => `M${pontos.map(([x, y]) => `${x},${y}`).join('L')}Z`;

export function centroide(pontos) {
    const n = pontos.length;
    return [pontos.reduce((s, p) => s + p[0], 0) / n, pontos.reduce((s, p) => s + p[1], 0) / n];
}
