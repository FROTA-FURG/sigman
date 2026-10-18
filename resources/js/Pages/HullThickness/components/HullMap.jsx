import { useRef, useState } from 'react';
import { VISAO_GERAL, caixaDe, caminhoSvg } from '../lib/contornos';
import RegionBackground from './RegionBackground';
import { STATUS, PRAZO, fmt, fmtPct, fmtData } from '../lib/espessura';

/*
 * Uma região do casco (bombordo, boreste, convés...) recortada do desenho,
 * com cada chapa mapeada pintada pela condição. O desenho fica por baixo
 * (números e obstáculos como passadiço/laboratório vêm dele); a cor é
 * semitransparente para os números continuarem legíveis.
 * Na visão geral (GERAL), a folha inteira com as chapas de todas as regiões.
 */

export default function HullMap({ desenho, regiao, analises, corDe, selecionada, onSelecionar, tipos }) {
    const [x1, y1, x2, y2] = caixaDe(desenho, regiao);
    const geral = regiao === VISAO_GERAL;
    const contornos = geral ? desenho.contornos.filter((c) => desenho.regioes[c.regiao]) : desenho.contornos.filter((c) => c.regiao === regiao);
    const [dica, setDica] = useState(null);
    const caixaRef = useRef(null);

    const mostrarDica = (e, c) => {
        const r = caixaRef.current.getBoundingClientRect();
        setDica({ contorno: c, x: e.clientX - r.left, y: e.clientY - r.top, largura: r.width });
    };

    const chaveDica = dica ? `${dica.contorno.regiao}-${dica.contorno.numero}` : null;
    const a = dica ? analises[chaveDica] : null;

    return (
        <div ref={caixaRef} className="relative overflow-hidden rounded-lg bg-white ring-1 ring-slate-700">
            <svg viewBox={`${x1} ${y1} ${x2 - x1} ${y2 - y1}`} className="block h-auto w-full" style={{ maxHeight: '58vh' }}>
                <RegionBackground desenho={desenho} regiao={regiao} imagens={desenho.imagensRegiao} />
                {contornos.map((c) => {
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
                            onMouseMove={(e) => mostrarDica(e, c)}
                            onMouseLeave={() => setDica(null)}
                            onClick={() => onSelecionar(chave)}
                        />
                    );
                })}
            </svg>

            {contornos.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit rounded-md bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 shadow">
                    Nenhuma chapa mapeada nesta região ainda — use a aba <span className="font-semibold">Mapeamento</span>.
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
                        <p className="mt-1 text-slate-500">Sem medição até a campanha escolhida.</p>
                    )}
                </div>
            )}
        </div>
    );
}
