import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    caminhoSvg, centralizarNaRegiao, centroide, descartarEdicao, exportarJson, lerImagem, lerJsonImportado,
    registrarAjusteImagem, registrarNovaImagem, removerImagemRegiao, salvarContornos, salvarImagemRegiao,
} from '../lib/contornos';
import RegionBackground from './RegionBackground';
import ImageHistory from './ImageHistory';

/*
 * Ferramenta de mapeamento: desenha o contorno de cada chapa por cima do
 * desenho da embarcação, clicando nos cantos.
 *
 *  - Desenhar: clique adiciona um canto; a chapa só fecha clicando de volta
 *    no 1º canto (verde). Botão direito desfaz o último canto; Esc cancela
 *    a chapa toda.
 *  - Editar: clique numa chapa para selecionar; arraste os cantos;
 *    botão direito num canto o remove; Delete apaga a chapa.
 *  - Imã: o canto "gruda" em cantos e bordas já desenhados, para chapas
 *    vizinhas dividirem a mesma borda sem fresta.
 *  - Zoom: roda do mouse (aproxima no ponto do cursor) ou botões + / − /
 *    Ajustar; Espaço + arrastar ou botão do meio movem a vista. Ímã e
 *    tamanho dos cantos acompanham o zoom (tolerância constante na tela).
 *  - Imagem: troca o desenho só desta região (ex.: Boreste). A imagem entra
 *    centralizada; dá para arrastar, mudar a escala e ver o desenho antigo
 *    por cima para alinhar. As chapas já desenhadas continuam -- o usuário
 *    decide se redesenha e apaga as antigas.
 *
 * Tudo é salvo neste navegador na hora; "Exportar JSON" gera o arquivo que
 * substitui data/contornos.json (e depois vira tabela no banco).
 */

const IMA_PX_TELA = 7;
const ZOOM_MAXIMO = 12;
const PASSO_ZOOM = 1.25;
const redondo = (v) => Math.round(v * 10) / 10;

function pontoMaisProximoNoSegmento([px, py], [ax, ay], [bx, by]) {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return [ax + t * dx, ay + t * dy];
}
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export default function MapperTool({ embarcacao, desenho, regiao, onRegiao, onContornosAlterados, usuario, chapaInicial = null }) {
    const { regioes } = desenho;
    const [x1, y1, x2, y2] = regioes[regiao].caixa;
    const svgRef = useRef(null);
    const arquivoRef = useRef(null);

    const [contornos, setContornos] = useState(desenho.contornos);
    const [historico, setHistorico] = useState([]);
    const [modo, setModo] = useState('desenhar');
    const [rascunho, setRascunho] = useState([]);
    const [cursor, setCursor] = useState(null); // { p, grudou }
    const [numero, setNumero] = useState('');
    const [selecionada, setSelecionada] = useState(null); // índice em `contornos`
    const [arrasto, setArrasto] = useState(null); // { indice, vertice }
    const [ima, setIma] = useState(true);
    const [aviso, setAviso] = useState(null);
    const historicoAntesDoArrasto = useRef(null);
    const imagemRef = useRef(null);
    const [imagens, setImagens] = useState(desenho.imagensRegiao);
    const [historicoImagens, setHistoricoImagens] = useState(desenho.historicoImagens);
    const [opacidadeOriginal, setOpacidadeOriginal] = useState(0.4);
    const [arrastoImagem, setArrastoImagem] = useState(null); // { inicio: [x,y], base: {x,y} }

    // Vista (viewBox) da região: zoom e deslocamento.
    const larguraRegiao = x2 - x1;
    const alturaRegiao = y2 - y1;
    const [vista, setVista] = useState({ x: x1, y: y1, w: larguraRegiao });
    const [movendoVista, setMovendoVista] = useState(null); // { tela: [cx,cy], base: {x,y} }
    const [espaco, setEspaco] = useState(false);
    const moveuVista = useRef(false);
    const hVista = vista.w * (alturaRegiao / larguraRegiao);
    const zoom = larguraRegiao / vista.w;

    const limitarVista = (v) => {
        const w = Math.min(larguraRegiao, Math.max(larguraRegiao / ZOOM_MAXIMO, v.w));
        const h = w * (alturaRegiao / larguraRegiao);
        return { w, x: Math.min(x2 - w, Math.max(x1, v.x)), y: Math.min(y2 - h, Math.max(y1, v.y)) };
    };
    /** Aproxima/afasta mantendo o ponto `foco` (coordenada do desenho) parado na tela. */
    const zoomEm = (fator, foco) => setVista((v) => {
        const h = v.w * (alturaRegiao / larguraRegiao);
        const [fx, fy] = foco ?? [v.x + v.w / 2, v.y + h / 2];
        const w = Math.min(larguraRegiao, Math.max(larguraRegiao / ZOOM_MAXIMO, v.w / fator));
        const novoH = w * (alturaRegiao / larguraRegiao);
        return limitarVista({ w, x: fx - ((fx - v.x) / v.w) * w, y: fy - ((fy - v.y) / h) * novoH });
    });
    const ajustarVista = () => setVista({ x: x1, y: y1, w: larguraRegiao });

    useEffect(() => { ajustarVista(); }, [regiao, embarcacao]); // eslint-disable-line react-hooks/exhaustive-deps

    // Roda do mouse: precisa de listener não-passivo para impedir a rolagem da página.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return undefined;
        const aoRolar = (e) => {
            e.preventDefault();
            zoomEm(e.deltaY < 0 ? PASSO_ZOOM : 1 / PASSO_ZOOM, pontoDoEvento(e));
        };
        svg.addEventListener('wheel', aoRolar, { passive: false });
        return () => svg.removeEventListener('wheel', aoRolar);
    });

    // Espaço segurado = mão para mover a vista.
    useEffect(() => {
        const ehCampo = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
        const baixo = (e) => { if (e.code === 'Space' && !ehCampo(e)) { e.preventDefault(); setEspaco(true); } };
        const cima = (e) => { if (e.code === 'Space') setEspaco(false); };
        window.addEventListener('keydown', baixo);
        window.addEventListener('keyup', cima);
        return () => { window.removeEventListener('keydown', baixo); window.removeEventListener('keyup', cima); };
    }, []);

    // Só ao trocar de embarcação: as edições daqui já atualizam o estado local.
    useEffect(() => { setContornos(desenho.contornos); setImagens(desenho.imagensRegiao); setHistoricoImagens(desenho.historicoImagens); setHistorico([]); }, [embarcacao]); // eslint-disable-line react-hooks/exhaustive-deps

    const daRegiao = useMemo(() => contornos.map((c, i) => ({ ...c, indice: i })).filter((c) => c.regiao === regiao), [contornos, regiao]);
    const mapeados = useMemo(() => new Set(daRegiao.map((c) => c.numero)), [daRegiao]);
    const total = regioes[regiao].chapas;
    const faltando = useMemo(() => Array.from({ length: total }, (_, i) => i + 1).filter((n) => !mapeados.has(n)), [total, mapeados]);

    // Ao trocar de região: limpa o que estava em andamento e sugere o próximo nº.
    useEffect(() => { setRascunho([]); setSelecionada(null); setNumero(faltando[0] ? String(faltando[0]) : ''); }, [regiao, embarcacao]); // eslint-disable-line react-hooks/exhaustive-deps

    // Veio da visão geral clicando numa chapa: abre já selecionada para editar.
    useEffect(() => {
        if (!chapaInicial) return;
        const alvo = daRegiao.find((c) => `${c.regiao}-${c.numero}` === chapaInicial);
        if (alvo) { setModo('editar'); setSelecionada(alvo.indice); }
    }, [chapaInicial, regiao]); // eslint-disable-line react-hooks/exhaustive-deps

    const aplicar = useCallback((novos, mensagem) => {
        setHistorico((h) => [...h.slice(-29), contornos]);
        setContornos(novos);
        const ok = salvarContornos(embarcacao, novos);
        onContornosAlterados?.(novos);
        setAviso(ok ? mensagem : 'Não foi possível salvar neste navegador — exporte o JSON para não perder o trabalho.');
    }, [contornos, embarcacao, onContornosAlterados]);

    const desfazer = () => {
        if (!historico.length) return;
        const anterior = historico[historico.length - 1];
        setHistorico((h) => h.slice(0, -1));
        setContornos(anterior);
        salvarContornos(embarcacao, anterior);
        onContornosAlterados?.(anterior);
        setSelecionada(null);
        setAviso('Última alteração desfeita.');
    };

    // Coordenada do desenho (px da imagem) a partir do evento do mouse.
    const pontoDoEvento = (e) => {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return [p.x, p.y];
    };

    // Unidades do desenho por pixel de tela, no zoom atual.
    // (com a altura limitada a 66vh o SVG pode sobrar nas laterais: vale o maior dos dois)
    const escala = () => {
        const svg = svgRef.current;
        if (!svg) return 1;
        return Math.max(vista.w / (svg.clientWidth || 1), hVista / (svg.clientHeight || 1));
    };

    /** Gruda em canto (prioridade) ou borda existente dentro da tolerância. */
    const grudar = (p, ignorar = null) => {
        if (!ima) return { p: p.map(redondo), grudou: false };
        const tol = IMA_PX_TELA * escala();
        let melhor = null;
        const considerar = (q, tipo) => {
            const d = distancia(p, q);
            if (d <= tol && (!melhor || d < melhor.d || (tipo === 'canto' && melhor.tipo !== 'canto'))) melhor = { q, d, tipo };
        };
        daRegiao.forEach((c) => c.pontos.forEach((q, v) => {
            if (!(ignorar && ignorar.indice === c.indice && ignorar.vertice === v)) considerar(q, 'canto');
        }));
        rascunho.forEach((q) => considerar(q, 'canto'));
        if (!melhor || melhor.tipo !== 'canto') {
            daRegiao.forEach((c) => c.pontos.forEach((a, v) => {
                if (ignorar && ignorar.indice === c.indice) return;
                considerar(pontoMaisProximoNoSegmento(p, a, c.pontos[(v + 1) % c.pontos.length]), 'borda');
            }));
        }
        return melhor ? { p: melhor.q.map(redondo), grudou: melhor.tipo } : { p: p.map(redondo), grudou: false };
    };

    const fecharChapa = () => {
        const n = Number(numero);
        if (rascunho.length < 3) { setAviso('Uma chapa precisa de pelo menos 3 cantos.'); return; }
        if (!Number.isInteger(n) || n < 1) { setAviso('Informe o nº da chapa antes de fechar.'); return; }
        const existente = daRegiao.find((c) => c.numero === n);
        if (existente && !window.confirm(`A chapa ${n} já está mapeada em ${regioes[regiao].nome}. Substituir o contorno?`)) return;
        const novos = [...contornos.filter((c, i) => !(existente && i === existente.indice)), { regiao, numero: n, pontos: rascunho }];
        aplicar(novos, `Chapa ${n} mapeada (${rascunho.length} cantos).`);
        setRascunho([]);
        const proxima = Array.from({ length: total }, (_, i) => i + 1).find((k) => k !== n && !mapeados.has(k));
        setNumero(proxima ? String(proxima) : '');
    };

    const apagarSelecionada = () => {
        if (selecionada == null) return;
        const c = contornos[selecionada];
        aplicar(contornos.filter((_, i) => i !== selecionada), `Chapa ${c.numero} removida do mapa.`);
        setSelecionada(null);
    };

    const renumerar = (valor) => {
        const n = Number(valor);
        if (selecionada == null || !Number.isInteger(n) || n < 1) return;
        if (daRegiao.some((c) => c.numero === n && c.indice !== selecionada)) { setAviso(`Já existe a chapa ${n} nesta região.`); return; }
        aplicar(contornos.map((c, i) => (i === selecionada ? { ...c, numero: n } : c)), `Chapa renumerada para ${n}.`);
    };

    // Teclado
    useEffect(() => {
        const onKey = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            const desenhando = modo === 'desenhar' && rascunho.length > 0;
            if (e.key === 'Escape') { setRascunho([]); setSelecionada(null); }
            if ((e.key === 'Delete' || e.key === 'Backspace') && modo === 'editar' && selecionada != null) { e.preventDefault(); apagarSelecionada(); }
            // Ctrl+Z desfaz a última alteração salva; não age no meio de uma chapa (lá é o botão direito).
            if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && !desenhando) { e.preventDefault(); desfazer(); }
            if (e.key === '+' || e.key === '=') zoomEm(PASSO_ZOOM, cursor?.p);
            if (e.key === '-') zoomEm(1 / PASSO_ZOOM, cursor?.p);
            if (e.key === '0') ajustarVista();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const aoMover = (e) => {
        if (movendoVista) {
            const k = escala();
            const dx = (e.clientX - movendoVista.tela[0]) * k;
            const dy = (e.clientY - movendoVista.tela[1]) * k;
            if (Math.abs(dx) + Math.abs(dy) > 0) moveuVista.current = true;
            setVista((v) => limitarVista({ ...v, x: movendoVista.base.x - dx, y: movendoVista.base.y - dy }));
            return;
        }
        const p = pontoDoEvento(e);
        if (arrastoImagem) {
            const { inicio, base } = arrastoImagem;
            setImagens((atual) => ({ ...atual, [regiao]: { ...atual[regiao], x: base.x + p[0] - inicio[0], y: base.y + p[1] - inicio[1] } }));
            return;
        }
        if (arrasto) {
            const g = grudar(p, arrasto);
            setContornos((cs) => cs.map((c, i) => (i === arrasto.indice ? { ...c, pontos: c.pontos.map((q, v) => (v === arrasto.vertice ? g.p : q)) } : c)));
            setCursor(g);
            return;
        }
        if (modo === 'desenhar') setCursor(grudar(p));
    };

    const desfazerCanto = () => {
        setRascunho((r) => r.slice(0, -1));
        setAviso(null);
    };

    const aoClicar = (e) => {
        // Tira o foco do campo "Nº da chapa": senão Backspace apagaria o número em vez do canto.
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        if (moveuVista.current || espaco) { moveuVista.current = false; return; } // foi arraste de vista, não clique
        if (modo !== 'desenhar' || e.button !== 0) return;
        const g = grudar(pontoDoEvento(e));
        if (rascunho.length >= 3 && distancia(g.p, rascunho[0]) <= IMA_PX_TELA * escala()) { fecharChapa(); return; }
        setRascunho((r) => [...r, g.p]);
    };

    const soltarArrasto = () => {
        if (movendoVista) { setMovendoVista(null); return; }
        if (arrastoImagem) { setArrastoImagem(null); salvarAjusteImagem(); return; }
        if (!arrasto) return;
        const c = contornos[arrasto.indice];
        setArrasto(null);
        // O arrasto já atualizou o estado ao vivo; aqui só grava (o histórico guarda o estado anterior ao arrasto).
        setHistorico((h) => [...h.slice(-29), historicoAntesDoArrasto.current]);
        salvarContornos(embarcacao, contornos);
        onContornosAlterados?.(contornos);
        setAviso(`Canto da chapa ${c.numero} ajustado.`);
    };
    const removerCanto = (e, indice, vertice) => {
        e.preventDefault();
        const c = contornos[indice];
        if (c.pontos.length <= 3) { setAviso('A chapa precisa de pelo menos 3 cantos.'); return; }
        aplicar(contornos.map((k, i) => (i === indice ? { ...k, pontos: k.pontos.filter((_, v) => v !== vertice) } : k)), `Canto removido da chapa ${c.numero}.`);
    };

    // --- Imagem da região -------------------------------------------------
    const imagemDaRegiao = imagens[regiao];

    // Aplica o resultado de uma operação de imagem (já gravada no navegador) na tela.
    const aplicarImagens = (resultado, mensagem) => {
        setImagens(resultado.imagens);
        setHistoricoImagens(resultado.historicoImagens);
        onContornosAlterados?.(contornos);
        if (!resultado.ok) setAviso('A imagem é grande demais para guardar neste navegador. Use um arquivo menor (ou exporte o JSON antes de sair).');
        else if (resultado.descartadas) setAviso(`${mensagem} Para caber, o arquivo de ${resultado.descartadas} imagem(ns) antiga(s) foi descartado — o registro continua na lista.`);
        else setAviso(mensagem);
    };

    const subirImagem = async (arquivo) => {
        try {
            const lida = await lerImagem(arquivo);
            aplicarImagens(registrarNovaImagem(embarcacao, regiao, { ...centralizarNaRegiao(lida, regioes[regiao].caixa), escala: 1 }, usuario),
                `Imagem "${arquivo.name}" aplicada em ${regioes[regiao].nome}. As ${daRegiao.length} chapas já desenhadas continuam — redesenhe e apague as antigas se precisar.`);
            setOpacidadeOriginal(0.4);
        } catch (err) {
            setAviso(`Não foi possível usar a imagem: ${err.message}`);
        }
    };

    const reutilizarImagem = (item) => {
        if (item.original) {
            aplicarImagens(removerImagemRegiao(embarcacao, regiao, usuario), `${regioes[regiao].nome} voltou ao desenho original.`);
            return;
        }
        const base = { src: item.srcVisivel, larguraPx: item.larguraPx, alturaPx: item.alturaPx, nome: item.nome };
        aplicarImagens(registrarNovaImagem(embarcacao, regiao, { ...centralizarNaRegiao(base, regioes[regiao].caixa), escala: 1 }, usuario),
            `Imagem "${item.nome}" voltou a ser usada em ${regioes[regiao].nome}.`);
    };

    const salvarPosicao = (posicao, mensagem) => {
        const { x, y, largura, altura, escala } = posicao;
        aplicarImagens(registrarAjusteImagem(embarcacao, regiao, { x, y, largura, altura, escala }, usuario), mensagem);
    };

    const reescalar = (escala) => {
        if (!imagemDaRegiao) return;
        const cx = imagemDaRegiao.x + imagemDaRegiao.largura / 2;
        const cy = imagemDaRegiao.y + imagemDaRegiao.altura / 2;
        const ajuste = centralizarNaRegiao(imagemDaRegiao, regioes[regiao].caixa, escala);
        // Mantém o centro onde o usuário deixou.
        setImagens((atual) => ({ ...atual, [regiao]: { ...ajuste, escala, x: cx - ajuste.largura / 2, y: cy - ajuste.altura / 2 } }));
    };

    const salvarAjusteImagem = () => {
        if (imagens[regiao]) salvarPosicao(imagens[regiao], 'Posição da imagem salva.');
    };

    const apagarChapasDaRegiao = () => {
        if (!daRegiao.length || !window.confirm(`Apagar as ${daRegiao.length} chapas desenhadas em ${regioes[regiao].nome}? (Ctrl+Z desfaz)`)) return;
        aplicar(contornos.filter((c) => c.regiao !== regiao), `Chapas de ${regioes[regiao].nome} apagadas.`);
        setSelecionada(null);
    };

    const importar = async (arquivo) => {
        try {
            const lidos = await lerJsonImportado(arquivo, embarcacao);
            if (lidos.imagens) {
                setImagens(lidos.imagens);
                Object.keys({ ...imagens, ...lidos.imagens }).forEach((r) => salvarImagemRegiao(embarcacao, r, lidos.imagens[r] ?? null));
            }
            aplicar(lidos.contornos, `${lidos.contornos.length} contornos importados de ${arquivo.name}.`);
        } catch (err) {
            setAviso(`Não foi possível importar: ${err.message}`);
        }
    };

    const restaurarPadrao = () => {
        if (!window.confirm('Descartar o que foi mapeado neste navegador e voltar aos contornos padrão do sistema?')) return;
        descartarEdicao(embarcacao);
        window.location.reload();
    };

    // Rótulos e cantos com tamanho constante na tela, qualquer que seja o zoom.
    const tamanhoFonte = vista.w / 48;
    const raio = vista.w / 220;
    const sel = selecionada != null ? contornos[selecionada] : null;
    const totalMapeadas = contornos.length;
    const totalChapas = Object.values(regioes).reduce((s, r) => s + r.chapas, 0);

    const botaoModo = (chave, rotulo) => (
        <button type="button" onClick={() => { setModo(chave); setRascunho([]); setSelecionada(null); }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${modo === chave ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            {rotulo}
        </button>
    );

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-3">
                {/* Barra de ferramentas */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-[#0b203c]/90 px-4 py-3">
                    <div className="flex rounded-lg border border-slate-700 bg-slate-900/60 p-0.5">
                        {botaoModo('desenhar', 'Desenhar')}
                        {botaoModo('editar', 'Editar')}
                        {botaoModo('imagem', 'Imagem')}
                    </div>
                    {modo === 'imagem' && (
                        <>
                            <button type="button" onClick={() => imagemRef.current?.click()} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
                                {imagemDaRegiao ? 'Trocar imagem' : 'Subir imagem desta região'}
                            </button>
                            <input ref={imagemRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                                   onChange={(e) => { if (e.target.files[0]) subirImagem(e.target.files[0]); e.target.value = ''; }} />
                            {imagemDaRegiao && (
                                <>
                                    <button type="button" onClick={() => salvarPosicao({ ...centralizarNaRegiao(imagemDaRegiao, regioes[regiao].caixa), escala: 1 }, 'Imagem centralizada.')}
                                            className="rounded-md px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Centralizar</button>
                                    <label className="flex items-center gap-2 text-xs text-slate-300">Escala
                                        <input type="range" min="0.3" max="3" step="0.01" value={imagemDaRegiao.escala ?? 1}
                                               onChange={(e) => reescalar(Number(e.target.value))} onPointerUp={salvarAjusteImagem} onKeyUp={salvarAjusteImagem} className="w-28 accent-blue-500" />
                                        <span className="w-10 tabular-nums text-slate-400">{Math.round((imagemDaRegiao.escala ?? 1) * 100)}%</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-slate-300" title="Mostra o desenho original por cima, para alinhar a imagem nova às chapas já desenhadas.">Desenho antigo
                                        <input type="range" min="0" max="1" step="0.05" value={opacidadeOriginal} onChange={(e) => setOpacidadeOriginal(Number(e.target.value))} className="w-24 accent-amber-500" />
                                    </label>
                                    <button type="button" onClick={() => window.confirm('Remover a imagem nova e voltar ao desenho original desta região? Ela continua na lista de imagens usadas.') && aplicarImagens(removerImagemRegiao(embarcacao, regiao, usuario), 'Voltou ao desenho original.')}
                                            className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-red-300">Remover imagem</button>
                                </>
                            )}
                        </>
                    )}
                    {modo === 'desenhar' && (
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                            Nº da chapa
                            <input type="number" min="1" value={numero} onChange={(e) => setNumero(e.target.value)}
                                   className="w-20 rounded-md border-slate-700 bg-slate-900 py-1 text-sm text-white focus:border-blue-500 focus:ring-blue-500" />
                        </label>
                    )}
                    {modo === 'desenhar' && rascunho.length > 0 && (
                        <>
                            <span className="text-xs text-slate-400">{rascunho.length} canto{rascunho.length === 1 ? '' : 's'}</span>
                            <span className="text-[11px] text-slate-500">{rascunho.length >= 3 ? 'clique no ponto verde para fechar' : 'mínimo de 3 cantos'} · botão direito desfaz o último</span>
                            <button type="button" onClick={() => setRascunho([])} className="rounded-md px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Cancelar</button>
                        </>
                    )}
                    <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-300" title="Faz o canto grudar em cantos e bordas de chapas já desenhadas, para vizinhas não ficarem com fresta.">
                        <input type="checkbox" checked={ima} onChange={(e) => setIma(e.target.checked)} className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500" />
                        Ímã
                    </label>
                    <button type="button" onClick={desfazer} disabled={!historico.length} className="rounded-md px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40" title="Ctrl+Z">Desfazer</button>
                </div>

                {/* Desenho */}
                <div className="relative overflow-hidden rounded-lg bg-white ring-1 ring-slate-700">
                    {/* Zoom */}
                    <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg bg-slate-900/90 p-0.5 shadow-lg ring-1 ring-slate-700">
                        <button type="button" onClick={() => zoomEm(1 / PASSO_ZOOM)} disabled={zoom <= 1.001} className="h-7 w-7 rounded-md text-base font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-30" title="Afastar (−)">−</button>
                        <button type="button" onClick={ajustarVista} className="h-7 min-w-[3.25rem] rounded-md px-1 text-[11px] font-semibold tabular-nums text-slate-300 hover:bg-slate-700" title="Ajustar à região (0)">{Math.round(zoom * 100)}%</button>
                        <button type="button" onClick={() => zoomEm(PASSO_ZOOM)} disabled={zoom >= ZOOM_MAXIMO - 0.01} className="h-7 w-7 rounded-md text-base font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-30" title="Aproximar (+)">+</button>
                    </div>
                    {zoom > 1.001 && (
                        <p className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300">Espaço + arrastar (ou botão do meio) para mover</p>
                    )}
                    <svg
                        ref={svgRef}
                        viewBox={`${vista.x} ${vista.y} ${vista.w} ${hVista}`}
                        className={`block h-auto w-full touch-none select-none ${movendoVista ? 'cursor-grabbing' : espaco ? 'cursor-grab' : modo === 'desenhar' ? 'cursor-crosshair' : modo === 'imagem' && imagemDaRegiao ? 'cursor-move' : 'cursor-default'}`}
                        style={{ maxHeight: '66vh', aspectRatio: `${larguraRegiao} / ${alturaRegiao}` }}
                        onPointerMove={aoMover}
                        onPointerLeave={() => setCursor(null)}
                        onMouseDown={(e) => e.button === 1 && e.preventDefault()} // sem a rolagem automática do botão do meio
                        onClick={aoClicar}
                        onPointerUp={soltarArrasto}
                        onContextMenu={(e) => {
                            if (modo !== 'desenhar') return;
                            e.preventDefault();
                            if (rascunho.length) desfazerCanto(); // botão direito = desfaz o último canto
                        }}
                        onPointerDown={(e) => {
                            if (e.button === 1 || (espaco && e.button === 0)) {
                                e.preventDefault();
                                e.currentTarget.setPointerCapture(e.pointerId);
                                moveuVista.current = false;
                                setMovendoVista({ tela: [e.clientX, e.clientY], base: { x: vista.x, y: vista.y } });
                                return;
                            }
                            if (modo !== 'imagem' || !imagemDaRegiao) return;
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setArrastoImagem({ inicio: pontoDoEvento(e), base: { x: imagemDaRegiao.x, y: imagemDaRegiao.y } });
                        }}
                    >
                        <RegionBackground desenho={desenho} regiao={regiao} imagens={imagens} opacidadeOriginal={modo === 'imagem' ? opacidadeOriginal : 0} />

                        {daRegiao.map((c) => {
                            const ativa = c.indice === selecionada;
                            const [cx, cy] = centroide(c.pontos);
                            return (
                                <g key={`${c.regiao}-${c.numero}-${c.indice}`}>
                                    <path d={caminhoSvg(c.pontos)} fill={ativa ? '#3b82f6' : '#38bdf8'} fillOpacity={modo === 'imagem' ? 0 : ativa ? 0.45 : 0.25}
                                          stroke={ativa ? '#1d4ed8' : '#0369a1'} strokeWidth={ativa ? 2 : 1} vectorEffect="non-scaling-stroke"
                                          className={modo === 'editar' ? 'cursor-pointer' : 'pointer-events-none'}
                                          onClick={(e) => { if (modo === 'editar') { e.stopPropagation(); setSelecionada(c.indice); } }} />
                                    <text x={cx} y={cy} fontSize={tamanhoFonte} textAnchor="middle" dominantBaseline="central" fontWeight="700"
                                          fill="#0c4a6e" stroke="#fff" strokeWidth={tamanhoFonte / 5} paintOrder="stroke" className="pointer-events-none">{c.numero}</text>
                                </g>
                            );
                        })}

                        {/* Cantos editáveis da chapa selecionada */}
                        {modo === 'editar' && sel && sel.regiao === regiao && sel.pontos.map(([x, y], v) => (
                            <circle key={v} cx={x} cy={y} r={raio * 1.6} fill="#fff" stroke="#1d4ed8" strokeWidth={1.5} vectorEffect="non-scaling-stroke"
                                    className="cursor-move"
                                    onPointerDown={(e) => { if (espaco || e.button !== 0) return; e.stopPropagation(); e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId); historicoAntesDoArrasto.current = contornos; setArrasto({ indice: selecionada, vertice: v }); }}
                                    onContextMenu={(e) => removerCanto(e, selecionada, v)} />
                        ))}

                        {/* Chapa em desenho */}
                        {modo === 'desenhar' && rascunho.length > 0 && (
                            <>
                                <polyline points={[...rascunho, ...(cursor ? [cursor.p] : [])].map((p) => p.join(',')).join(' ')}
                                          fill="#fbbf24" fillOpacity={0.2} stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" className="pointer-events-none" />
                                {rascunho.map(([x, y], v) => (
                                    <circle key={v} cx={x} cy={y} r={v === 0 ? raio * 1.8 : raio} fill={v === 0 ? '#16a34a' : '#d97706'} stroke="#fff" strokeWidth={1} vectorEffect="non-scaling-stroke" className="pointer-events-none" />
                                ))}
                                {/* Cursor sobre o ponto verde com 3+ cantos: o próximo clique fecha a chapa. */}
                                {rascunho.length >= 3 && cursor && distancia(cursor.p, rascunho[0]) <= IMA_PX_TELA * escala() && (
                                    <circle cx={rascunho[0][0]} cy={rascunho[0][1]} r={raio * 3.2} fill="#16a34a" fillOpacity={0.25} stroke="#16a34a" strokeWidth={2} vectorEffect="non-scaling-stroke" className="pointer-events-none" />
                                )}
                            </>
                        )}
                        {cursor?.grudou && (modo === 'desenhar' || arrasto) && (
                            <circle cx={cursor.p[0]} cy={cursor.p[1]} r={raio * 2.2} fill="none" stroke={cursor.grudou === 'canto' ? '#dc2626' : '#9333ea'} strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="pointer-events-none" />
                        )}
                    </svg>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-500">
                    <span className="font-semibold text-slate-400">Desenhar:</span> clique nos cantos da chapa em ordem; a chapa fecha só ao clicar de volta no 1º canto (verde). <span className="text-slate-300">Botão direito</span> desfaz o último canto; Esc cancela a chapa toda.{' '}
                    <span className="font-semibold text-slate-400">Editar:</span> clique na chapa, arraste os cantos; botão direito num canto o remove; Delete apaga a chapa. Ctrl+Z desfaz a última alteração.{' '}
                    Com o <span className="font-semibold text-slate-400">ímã</span>, o círculo vermelho indica que vai grudar num canto e o roxo, numa borda.{' '}
                    <span className="font-semibold text-slate-400">Zoom:</span> roda do mouse ou + / − (0 ajusta); Espaço + arrastar move a vista.{' '}
                    <span className="font-semibold text-slate-400">Imagem:</span> sobe um desenho novo só para esta região; arraste para posicionar e use o "desenho antigo" por cima para alinhar.
                </p>

                <ImageHistory
                    desenho={desenho}
                    regiao={regiao}
                    historico={historicoImagens[regiao] ?? []}
                    imagemAtual={imagens[regiao]}
                    onReutilizar={reutilizarImagem}
                />
            </div>

            {/* Lateral: progresso, chapas, arquivo */}
            <aside className="space-y-4">
                {aviso && <p className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-200">{aviso}</p>}

                {sel && modo === 'editar' && (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Chapa selecionada</p>
                        <div className="mt-2 flex items-center gap-2">
                            <label className="text-xs text-slate-300">Nº</label>
                            <input key={selecionada} type="number" min="1" defaultValue={sel.numero} onBlur={(e) => renumerar(e.target.value)}
                                   onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                   className="w-20 rounded-md border-slate-700 bg-slate-900 py-1 text-sm text-white" />
                            <span className="text-xs text-slate-500">{sel.pontos.length} cantos</span>
                            <button type="button" onClick={apagarSelecionada} className="ml-auto rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-500/30 hover:bg-red-500/20">Apagar</button>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
                    <div className="mb-2 flex items-baseline justify-between">
                        <h4 className="text-sm font-semibold text-white">{regioes[regiao].nome}</h4>
                        <span className="text-xs text-slate-400"><span className="font-bold text-white">{mapeados.size}</span> de {total}</span>
                    </div>
                    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${(mapeados.size / total) * 100}%` }} />
                    </div>
                    {imagemDaRegiao && (
                        <p className="mb-2 rounded bg-blue-500/10 px-2 py-1 text-[11px] text-blue-200" title={imagemDaRegiao.nome}>Imagem própria: {imagemDaRegiao.nome || 'enviada'}</p>
                    )}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
                            const c = daRegiao.find((k) => k.numero === n);
                            return (
                                <button key={n} type="button"
                                        onClick={() => { if (c) { setModo('editar'); setSelecionada(c.indice); } else { setModo('desenhar'); setSelecionada(null); setNumero(String(n)); } }}
                                        title={c ? `Chapa ${n} mapeada — clique para editar` : `Chapa ${n} sem contorno — clique para desenhar`}
                                        className={`rounded py-1 text-[11px] font-semibold tabular-nums transition ${c ? (c.indice === selecionada ? 'bg-blue-600 text-white' : 'bg-sky-500/20 text-sky-200 hover:bg-sky-500/30') : String(n) === numero && modo === 'desenhar' ? 'bg-amber-500/30 text-amber-100 ring-1 ring-amber-400' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
                                    {n}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-white">Todas as regiões · {embarcacao}</h4>
                    <ul className="space-y-1">
                        {Object.entries(regioes).map(([sigla, r]) => {
                            const n = new Set(contornos.filter((c) => c.regiao === sigla).map((c) => c.numero)).size;
                            return (
                                <li key={sigla}>
                                    <button type="button" onClick={() => onRegiao(sigla)} className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition ${sigla === regiao ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`}>
                                        <span className="flex-1">{r.nome}</span>
                                        <span className={`tabular-nums ${n === r.chapas ? 'text-emerald-300' : 'text-slate-500'}`}>{n}/{r.chapas}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-2 border-t border-slate-800 pt-2 text-xs text-slate-400"><span className="font-bold text-white">{totalMapeadas}</span> de {totalChapas} chapas mapeadas</p>
                    {daRegiao.length > 0 && (
                        <button type="button" onClick={apagarChapasDaRegiao} className="mt-2 w-full rounded-lg px-3 py-1.5 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-red-300">
                            Apagar as {daRegiao.length} chapas de {regioes[regiao].nome}
                        </button>
                    )}
                </div>

                <div className="space-y-2 rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
                    <h4 className="text-sm font-semibold text-white">Arquivo</h4>
                    <p className="text-[11px] leading-relaxed text-slate-500">O mapeamento fica salvo neste navegador. Exporte o JSON para incluí-lo no sistema (depois ele vai para o banco).</p>
                    <button type="button" onClick={() => exportarJson(embarcacao, contornos, imagens)} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">Exportar JSON</button>
                    <button type="button" onClick={() => arquivoRef.current?.click()} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700">Importar JSON</button>
                    <input ref={arquivoRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { if (e.target.files[0]) importar(e.target.files[0]); e.target.value = ''; }} />
                    {desenho.editadoNoNavegador && (
                        <button type="button" onClick={restaurarPadrao} className="w-full rounded-lg px-3 py-1.5 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-red-300">Descartar o mapeamento deste navegador</button>
                    )}
                </div>
            </aside>
        </div>
    );
}
