import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Dica estilizada que acompanha o cursor (substitui o `title` nativo).
 * Uso:
 *   const dica = useCursorTooltip();
 *   <tr {...dica.alvo('Clique para abrir')}>...</tr>
 *   {dica.elemento}
 * Renderizada em portal no body pra não ser cortada por overflow de tabela.
 */
export function useCursorTooltip() {
    const [estado, setEstado] = useState(null); // { x, y, texto, tom }

    const alvo = useCallback((texto, tom = 'azul') => ({
        onMouseMove: (e) => setEstado({ x: e.clientX, y: e.clientY, texto, tom }),
        onMouseLeave: () => setEstado(null),
    }), []);

    let elemento = null;
    if (estado && typeof document !== 'undefined') {
        // Vira pro lado esquerdo perto da borda direita da tela.
        const perto = estado.x > window.innerWidth - 300;
        const estilo = perto
            ? { right: window.innerWidth - estado.x + 14, top: estado.y + 18 }
            : { left: estado.x + 14, top: estado.y + 18 };
        const cor = estado.tom === 'cinza'
            ? 'border-slate-600 from-slate-800 to-slate-900 text-slate-300'
            : 'border-blue-500/50 from-blue-600 to-blue-800 text-white shadow-blue-900/50';

        elemento = createPortal(
            <div className="pointer-events-none fixed z-[60]" style={estilo}>
                <div className={`flex items-center gap-2 rounded-lg border bg-gradient-to-br px-3 py-2 text-xs font-semibold shadow-xl ${cor}`}>
                    {estado.tom === 'cinza' ? (
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    )}
                    {estado.texto}
                </div>
            </div>,
            document.body,
        );
    }

    return { alvo, elemento };
}
