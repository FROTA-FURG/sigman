import { useRef, useState } from 'react';
import { VISAO_GERAL, caminhoSvg, layoutVisaoGeral } from '../lib/contornos';
import RegionBackground from './RegionBackground';
import { STATUS, PRAZO, fmt, fmtPct, fmtData } from '../lib/espessura';

/*
 * Mapa do Painel: uma região do casco com cada chapa mapeada pintada pela
 * condição, ou a visão geral com todas as regiões arrumadas juntas. A cor é
 * semitransparente para os números do desenho continuarem legíveis.
 */

function ChapasDaRegiao({ contornos, analises, corDe, selecionada, onSelecionar, onDica, onSairDica }) {
    return contornos.map((c) => {
        const chave = `${c.regiao}-${c.numero}`;
        const ativa = selecionada === chave;
        return (
            <path
                key={chave}
                d={caminhoSvg(c.pontos)}
                fill={corDe(analises[chave])}
                fillOpacity={ativa ? 0.85 : 0.55}
                stroke={ativa ? '#1d4ed8' : '#0f172a'}
                strokeOpacity={ativa ? 1 : 0.35}
                strokeWidth={ativa ? 2.2 : 0.6}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer transition-[fill-opacity] hover:fill-opacity-90"
                onMouseMove={(e) => onDica(e, c)}
                onMouseLeave={onSairDica}
                onClick={() => onSelecionar(chave)}
            />
        );
    });
}

export default function HullMap({ desenho, regiao, analises, corDe, selecionada, onSelecionar, tipos }) {
    const [dica, setDica] = useState(null);
    const caixaRef = useRef(null);
    const geral = regiao === VISAO_GERAL;

    const mostrarDica = (e, c) => {
        const r = caixaRef.current.getBoundingClientRect();
        setDica({ contorno: c, x: e.clientX - r.left, y: e.clientY - r.top, largura: r.width });
    };
    const chaveDica = dica ? `${dica.contorno.regiao}-${dica.contorno.numero}` : null;
    const a = dica ? analises[chaveDica] : null;
    const propsChapas = { analises, corDe, selecionada, onSelecionar, onDica: mostrarDica, onSairDica: () => setDica(null) };

    const r = geral ? null : desenho.regioes[regiao];
    if (!geral && !r?.quadro) {
        return (
            <div className="flex aspect-[3/1] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-6 text-center text-sm text-slate-500">
                {r?.nome} ainda não tem desenho — suba a imagem na aba Mapeamento.
            </div>
        );
    }

    let conteudo;
    let viewBox;
    if (geral) {
        const layout = layoutVisaoGeral(desenho);
        viewBox = `0 0 ${layout.largura} ${layout.altura}`;
        conteudo = Object.entries(layout.posicoes).map(([code, p]) => {
            const reg = desenho.regioes[code];
            if (!reg.quadro) {
                return (
                    <g key={code}>
                        <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                        <text x={p.x + p.w / 2} y={p.y + p.h / 2} fontSize={14} textAnchor="middle" fill="#94a3b8">{reg.nome} · sem desenho</text>
                    </g>
                );
            }
            return (
                <g key={code} transform={`translate(${p.x} ${p.y}) scale(${p.escala})`}>
                    <RegionBackground regiao={reg} imagem={reg.imagem} idRecorte={`geral-${reg.id}`} />
                    <ChapasDaRegiao contornos={desenho.contornos.filter((c) => c.regiao === code)} {...propsChapas} />
                </g>
            );
        });
    } else {
        viewBox = `0 0 ${r.quadro.largura} ${r.quadro.altura}`;
        conteudo = (
            <>
                <RegionBackground regiao={r} imagem={r.imagem} />
                <ChapasDaRegiao contornos={desenho.contornos.filter((c) => c.regiao === regiao)} {...propsChapas} />
            </>
        );
    }
    const algumaMapeada = geral ? desenho.contornos.length > 0 : desenho.contornos.some((c) => c.regiao === regiao);

    return (
        <div ref={caixaRef} className="relative overflow-hidden rounded-lg bg-white ring-1 ring-slate-700">
            <svg viewBox={viewBox} className="block h-auto w-full" style={{ maxHeight: geral ? '70vh' : '58vh' }}>
                {conteudo}
            </svg>

            {!algumaMapeada && (
                <div className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit rounded-md bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 shadow">
                    Nenhuma chapa mapeada {geral ? 'ainda' : 'nesta região ainda'} — use a aba <span className="font-semibold">Mapeamento</span>.
                </div>
            )}

            {dica && (
                <div
                    className="pointer-events-none absolute z-10 w-56 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-300 shadow-xl"
                    style={{ left: Math.min(dica.x + 14, dica.largura - 232), top: dica.y + 14 }}
                >
                    <p className="font-bold text-white">Chapa {dica.contorno.numero} · {desenho.regioes[dica.contorno.regiao].nome}</p>
                    {tipos?.[chaveDica] && <p className="text-[10px] uppercase tracking-wider text-slate-500">{tipos[chaveDica]}</p>}
                    {a?.atual ? (
                        <>
                            <p className="mt-1">Espessura: <span className="font-semibold text-white">{fmt(a.atual.y)} mm</span> <span className="text-slate-500">(projeto {fmt(a.ep)})</span></p>
                            <p>Perda: <span className="font-semibold text-white">{fmtPct(a.perda)}</span> · <span style={{ color: STATUS[a.status].cor }}>{STATUS[a.status].rot}</span></p>
                            <p>Vida residual: <span className="font-semibold text-white">{a.vidaResidual != null ? `${fmt(a.vidaResidual, 1)} anos` : '—'}</span></p>
                            {a.dataLimite && <p className="text-slate-400">Limite de 25% em {fmtData(a.dataLimite)}</p>}
                            <p className="mt-1 text-[10px]" style={{ color: PRAZO[a.prazo].cor }}>{PRAZO[a.prazo].rot}</p>
                        </>
                    ) : (
                        <p className="mt-1 text-slate-500">Sem medição até a inspeção escolhida.</p>
                    )}
                </div>
            )}
        </div>
    );
}
