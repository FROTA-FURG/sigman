import React from 'react';
import { ESTILO_CONDICAO } from '../lib/classificacao';

export default function BadgeCondicao({ condicao, grande = false }) {
    const e = ESTILO_CONDICAO[condicao] || ESTILO_CONDICAO.default;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${e.badge} ${grande ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${e.dot}`} />
            {condicao || 'Sem análise'}
        </span>
    );
}
