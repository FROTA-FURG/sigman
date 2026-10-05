import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ATRASO_MS = 120;
const MARGEM = 8;

/**
 * Troca a dica nativa do navegador (atributo `title`) por uma estilizada,
 * em qualquer elemento da página -- inclusive dentro de modais em portal e
 * de componentes compartilhados (calendário, campo de data).
 *
 * Basta montar uma vez na página: <StyledTooltips />. Os componentes seguem
 * usando `title` normalmente; enquanto o cursor está em cima, o atributo é
 * guardado em data-dica-original (pra o navegador não mostrar a dele junto)
 * e volta ao sair. Textos com \n quebram linha.
 */
export default function StyledTooltips() {
    const [dica, setDica] = useState(null); // { texto, rect }
    const [pos, setPos] = useState(null);
    const caixaRef = useRef(null);

    useEffect(() => {
        let alvo = null;
        let timer = null;

        const restaurar = () => {
            clearTimeout(timer);
            if (alvo) {
                const original = alvo.getAttribute('data-dica-original');
                if (original !== null && !alvo.hasAttribute('title')) alvo.setAttribute('title', original);
                alvo.removeAttribute('data-dica-original');
                alvo = null;
            }
            setDica(null);
        };

        const aoEntrar = (e) => {
            const el = e.target instanceof Element ? e.target : null;
            if (!el) return;
            // Ainda dentro do mesmo alvo (filho dele): mantém.
            if (alvo && el.closest('[data-dica-original]') === alvo) return;

            const novo = el.closest('[title]');
            if (!novo || novo.tagName === 'IFRAME' || !novo.getAttribute('title')?.trim()) {
                restaurar();
                return;
            }
            restaurar();
            alvo = novo;
            const texto = novo.getAttribute('title');
            novo.setAttribute('data-dica-original', texto);
            novo.removeAttribute('title');
            timer = setTimeout(() => {
                if (alvo === novo) setDica({ texto, rect: novo.getBoundingClientRect() });
            }, ATRASO_MS);
        };

        const aoSair = (e) => {
            if (!alvo) return;
            if (e.relatedTarget instanceof Node && alvo.contains(e.relatedTarget)) return;
            restaurar();
        };

        document.addEventListener('mouseover', aoEntrar, true);
        document.addEventListener('mouseout', aoSair, true);
        window.addEventListener('scroll', restaurar, true);
        window.addEventListener('mousedown', restaurar, true);
        return () => {
            document.removeEventListener('mouseover', aoEntrar, true);
            document.removeEventListener('mouseout', aoSair, true);
            window.removeEventListener('scroll', restaurar, true);
            window.removeEventListener('mousedown', restaurar, true);
            restaurar();
        };
    }, []);

    // Posiciona depois de medir a caixa: acima do elemento, ou abaixo se não couber.
    useEffect(() => {
        if (!dica || !caixaRef.current) { setPos(null); return; }
        const { width, height } = caixaRef.current.getBoundingClientRect();
        const r = dica.rect;
        const acima = r.top - height - MARGEM >= MARGEM;
        const top = acima ? r.top - height - MARGEM : r.bottom + MARGEM;
        const centro = r.left + r.width / 2;
        const left = Math.max(MARGEM, Math.min(centro - width / 2, window.innerWidth - width - MARGEM));
        setPos({ top, left, acima, seta: Math.max(12, Math.min(centro - left, width - 12)) });
    }, [dica]);

    if (!dica) return null;

    return createPortal(
        <div
            ref={caixaRef}
            role="tooltip"
            style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? 'visible' : 'hidden' }}
            className="pointer-events-none z-[10001] max-w-xs rounded-lg border border-slate-600/80 bg-slate-950/95 px-3 py-2 text-xs leading-relaxed text-slate-100 shadow-xl shadow-black/40 ring-1 ring-blue-500/20 backdrop-blur-sm"
        >
            <span className="whitespace-pre-line">{dica.texto}</span>
            {pos && (
                <span
                    className={`absolute h-2 w-2 rotate-45 border-slate-600/80 bg-slate-950 ${pos.acima ? '-bottom-1 border-b border-r' : '-top-1 border-l border-t'}`}
                    style={{ left: pos.seta - 4 }}
                />
            )}
        </div>,
        document.body,
    );
}
