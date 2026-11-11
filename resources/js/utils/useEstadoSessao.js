import { useEffect, useState } from 'react';

/*
 * useState que sobrevive à troca de aba e à ida/volta de outra página na
 * mesma sessão do navegador (sessionStorage). Para filtros e buscas: quem
 * filtrou e foi olhar outra coisa encontra o filtro como deixou.
 *
 * `reviver` converte o valor salvo de volta (ex.: string ISO -> Date).
 */
export default function useEstadoSessao(chave, inicial, reviver = (v) => v) {
    const [valor, setValor] = useState(() => {
        try {
            const salvo = window.sessionStorage.getItem(chave);
            if (salvo !== null) return reviver(JSON.parse(salvo));
        } catch { /* sem storage: usa o inicial */ }
        return typeof inicial === 'function' ? inicial() : inicial;
    });

    useEffect(() => {
        try {
            window.sessionStorage.setItem(chave, JSON.stringify(valor));
        } catch { /* sem storage: só não persiste */ }
    }, [chave, valor]);

    return [valor, setValor];
}

/** Reviver para datas guardadas como ISO (null continua null). */
export const comoData = (v) => (v ? new Date(v) : null);
