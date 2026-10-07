/*
 * Busca da Árvore de Equipamentos.
 *
 * Cada palavra digitada precisa aparecer no item OU em algum nível acima
 * dele, então dá para combinar: "motor atlantico" acha os motores do
 * Atlântico Sul, "propulsao cm1" os itens do sistema de propulsão do CM1.
 * Sem diferença de acento nem de maiúscula.
 *
 * Campos: nome, TAG novo e antigo, sigla de seção/sistema, descrição,
 * fabricante, modelo, nº de série e tipo de componente.
 */

export const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CAMPOS = ['name', 'tag', 'tag_antigo', 'prefix', 'description', 'manufacturer', 'model', 'series_number', 'tipo_componente'];

const textoDoNo = (no) => normalizar(CAMPOS.map((c) => no[c]).filter(Boolean).join(' '));

export const termosDaBusca = (busca) => normalizar(busca).split(/\s+/).filter(Boolean);

/**
 * Devolve a árvore podada (só os caminhos até o que casou), os ids a abrir
 * (ancestrais de cada resultado) e os resultados em ordem de exibição.
 * Um item que casa traz o que está abaixo dele inteiro, recolhido.
 */
export function filtrarArvore(arvore, termos) {
    const expandir = new Set();
    const resultados = [];

    const visitar = (no, contexto, caminho) => {
        const texto = `${contexto} ${textoDoNo(no)}`;
        if (termos.every((t) => texto.includes(t))) {
            caminho.forEach((id) => expandir.add(id));
            resultados.push(no);
            return no;
        }
        const filhos = (no.children || [])
            .map((f) => visitar(f, texto, [...caminho, no.id]))
            .filter(Boolean);
        return filhos.length ? { ...no, children: filhos } : null;
    };

    const podada = arvore.map((no) => visitar(no, '', [])).filter(Boolean);
    return { arvore: podada, expandir, resultados };
}
