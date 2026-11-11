import { useRef, useState } from 'react';

/*
 * Seleção de linhas das tabelas de OS (Andamento e Planejamento).
 * - clique marca/desmarca uma;
 * - Shift+clique aplica o mesmo estado ao trecho entre a última clicada e
 *   esta (como no gerenciador de arquivos), na ordem em que a tabela está;
 * - "todas" age só sobre o que está visível (busca/filtros aplicados).
 */
export default function useSelecaoOs(listaVisivel) {
    const [selecionados, setSelecionados] = useState([]);
    const ancora = useRef(null);
    const ids = listaVisivel.map(os => os.id);

    const todosMarcados = ids.length > 0 && ids.every(id => selecionados.includes(id));

    const alternarTodos = () => setSelecionados(prev => (todosMarcados
        ? prev.filter(id => !ids.includes(id))
        : [...new Set([...prev, ...ids])]));

    const alternar = (e, id) => {
        e.stopPropagation();
        const marcar = !selecionados.includes(id);
        const de = ids.indexOf(ancora.current);
        const ate = ids.indexOf(id);

        if (e.shiftKey && de !== -1 && ate !== -1) {
            const trecho = ids.slice(Math.min(de, ate), Math.max(de, ate) + 1);
            setSelecionados(prev => (marcar
                ? [...new Set([...prev, ...trecho])]
                : prev.filter(item => !trecho.includes(item))));
        } else {
            setSelecionados(prev => (marcar ? [...prev, id] : prev.filter(item => item !== id)));
        }
        ancora.current = id;
    };

    /** As OS selecionadas, na ordem da tabela (as escondidas pela busca vão ao fim). */
    const selecionadasEm = (todas) => {
        const visiveis = listaVisivel.filter(os => selecionados.includes(os.id));
        const ocultas = todas.filter(os => selecionados.includes(os.id) && !ids.includes(os.id));
        return [...visiveis, ...ocultas];
    };

    return { selecionados, setSelecionados, alternar, todosMarcados, alternarTodos, selecionadasEm };
}
