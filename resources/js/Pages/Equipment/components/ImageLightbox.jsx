import React from 'react';
import { createPortal } from 'react-dom';

/** Amplia a imagem em tela cheia. Fecha clicando fora dela ou no X. */
export default function ImageLightbox({ src, alt, onClose }) {
    if (!src) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                type="button"
                title="Fechar"
                className="absolute top-4 right-4 rounded-full bg-slate-800/80 p-2 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-white transition"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
        </div>,
        document.body
    );
}
