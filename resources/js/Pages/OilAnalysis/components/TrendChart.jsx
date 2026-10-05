import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ESTILO_CONDICAO, NIVEL_ROTULO, formatarData, formatarDataCurta, formatarNumero, nivelDoParametro } from '../lib/classificacao';

/*
 * Tendência de um parâmetro ao longo das coletas, com as linhas de limite
 * de Atenção (âmbar) e Intervir (vermelho). Uma série só -- o título nomeia
 * o parâmetro, então dispensa legenda; os limites têm rótulo próprio.
 */

const COR_LINHA = '#60a5fa';
const COR_ATENCAO = '#f59e0b';
const COR_INTERVIR = '#ef4444';

function linhasDeLimite(parametro, limites) {
    const k = parametro.chave;
    const a = limites?.amarelo || {};
    const v = limites?.vermelho || {};
    if (parametro.sentido === 'faixa') {
        return [
            { y: a[`${k}_inf`], cor: COR_ATENCAO, rotulo: 'Atenção (mín.)' },
            { y: a[`${k}_sup`], cor: COR_ATENCAO, rotulo: 'Atenção (máx.)' },
            { y: v[`${k}_inf`], cor: COR_INTERVIR, rotulo: 'Intervir (mín.)' },
            { y: v[`${k}_sup`], cor: COR_INTERVIR, rotulo: 'Intervir (máx.)' },
        ].filter((l) => l.y != null);
    }
    const linhas = [
        { y: a[k], cor: COR_ATENCAO, rotulo: 'Atenção' },
        { y: v[k], cor: COR_INTERVIR, rotulo: 'Intervir' },
    ];
    if (k === 'nas' && limites?.verde?.nas != null) {
        linhas[0] = { y: limites.verde.nas, cor: COR_ATENCAO, rotulo: 'Atenção (acima de)' };
    }
    return linhas.filter((l) => l.y != null);
}

function Dica({ active, payload, parametro, limites }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const nivel = nivelDoParametro(parametro, p.valor, limites);
    const rot = nivel === null ? null : NIVEL_ROTULO[nivel];
    return (
        <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold text-white">Amostra {p.numero} · {formatarData(p.data)}</p>
            <p className="mt-1 text-slate-300">
                {parametro.rotulo}: <span className="font-bold text-white">{formatarNumero(p.valor)}</span> {parametro.unidade}
            </p>
            {rot && (
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${ESTILO_CONDICAO[rot].badge}`}>{rot}</span>
            )}
        </div>
    );
}

export default function TrendChart({ amostras, parametro, limites }) {
    const dados = useMemo(
        () => amostras
            .filter((a) => a.resultados?.[parametro.chave] != null)
            .map((a) => ({ id: `${a.numero}-${a.dataColeta}`, numero: a.numero, data: a.dataColeta, rotulo: formatarDataCurta(a.dataColeta), valor: a.resultados[parametro.chave] })),
        [amostras, parametro],
    );
    const linhas = linhasDeLimite(parametro, limites);

    if (dados.length === 0) {
        return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Sem resultados de {parametro.rotulo} nas coletas.</div>;
    }

    // Domínio inclui os limites, pra linha de referência nunca ficar fora da área.
    const valores = [...dados.map((d) => d.valor), ...linhas.map((l) => l.y)];
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const folga = (max - min) * 0.08 || Math.abs(max) * 0.1 || 1;
    const dominio = [Math.max(0, min - folga), max + folga];

    return (
        <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dados} margin={{ top: 12, right: 88, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                <YAxis domain={dominio} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={56}
                       tickFormatter={(v) => formatarNumero(v, 1)} />
                <Tooltip content={<Dica parametro={parametro} limites={limites} />} cursor={{ stroke: '#475569', strokeDasharray: '3 3' }} />
                {linhas.map((l) => (
                    <ReferenceLine key={l.rotulo} y={l.y} stroke={l.cor} strokeDasharray="5 4" strokeWidth={1.5}
                                   label={{ value: `${l.rotulo} ${formatarNumero(l.y)}`, position: 'right', fill: l.cor, fontSize: 10 }} />
                ))}
                <Line type="monotone" dataKey="valor" stroke={COR_LINHA} strokeWidth={2} isAnimationActive={false}
                      dot={{ r: 4, fill: COR_LINHA, stroke: '#0b203c', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: COR_LINHA, stroke: '#0b203c', strokeWidth: 2 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}
