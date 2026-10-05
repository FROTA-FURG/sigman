import React, { useMemo, useState } from 'react';
import CruiseLegModal from './CruiseLegModal';
import { autoria } from './autoriaEtapa';

/*
 * Plano de cruzeiro da embarcação: calendário anual (padrão) ou lista, no
 * mesmo card. Cor = área de operação (a mesma área tem sempre a mesma cor no
 * ano); o nº da etapa e os portos aparecem ao passar o cursor e na lista.
 */

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

// Ordem fixa por ordem de aparição da área; a partir da 6ª, cinza ("outras").
const CORES_AREA = ['#38bdf8', '#fbbf24', '#a78bfa', '#34d399', '#fb7185'];
const COR_OUTRAS = '#94a3b8';

const pad = (n) => String(n).padStart(2, '0');
const iso = (a, m, d) => `${a}-${pad(m + 1)}-${pad(d)}`;
const hoje = () => { const h = new Date(); return iso(h.getFullYear(), h.getMonth(), h.getDate()); };
const br = (s) => { const [a, m, d] = s.split('-'); return `${d}/${m}/${a}`; };
const brCurto = (s) => { const [, m, d] = s.split('-'); return `${d}/${MESES[Number(m) - 1].toLowerCase()}`; };
const nomeEtapa = (e) => `Etapa ${pad(e.legNumber)}`;
const dias = (e) => Math.round((new Date(`${e.endsAt}T12:00:00`) - new Date(`${e.startsAt}T12:00:00`)) / 86400000) + 1;

function situacao(e, dia) {
    if (e.endsAt < dia) return { rot: 'Concluída', cls: 'text-slate-500' };
    if (e.startsAt <= dia) return { rot: 'Em curso', cls: 'bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30' };
    return null;
}

function gradeDoMes(ano, mes) {
    const total = new Date(ano, mes + 1, 0).getDate();
    const inicio = (new Date(ano, mes, 1).getDay() + 6) % 7; // semana começa na segunda
    const celulas = [...Array(inicio).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
    while (celulas.length % 7) celulas.push(null);
    return celulas;
}

function Mes({ ano, mes, etapaDoDia, corDaArea, etapaSobCursor, setEtapaSobCursor, onAbrir, diaDeHoje }) {
    const celulas = useMemo(() => gradeDoMes(ano, mes), [ano, mes]);
    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2">
            <h5 className="mb-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-300">{MESES[mes]}</h5>
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
                {DIAS_SEMANA.map((d, i) => <span key={i} className="text-[9px] font-semibold text-slate-600">{d}</span>)}
                {celulas.map((dia, i) => {
                    if (!dia) return <span key={i} />;
                    const chave = iso(ano, mes, dia);
                    const etapa = etapaDoDia.get(chave);
                    const ehHoje = chave === diaDeHoje;
                    if (!etapa) {
                        return (
                            <span key={i} className={`flex h-5 items-center justify-center text-[10px] ${ehHoje ? 'rounded font-bold text-white ring-1 ring-white/60' : 'text-slate-500'}`}>{dia}</span>
                        );
                    }
                    const cor = corDaArea(etapa.area);
                    const ponta = `${chave === etapa.startsAt ? 'rounded-l-md' : ''} ${chave === etapa.endsAt ? 'rounded-r-md' : ''}`;
                    const emFoco = etapaSobCursor === etapa.id;
                    return (
                        <button
                            key={i}
                            type="button"
                            onMouseEnter={() => setEtapaSobCursor(etapa.id)}
                            onMouseLeave={() => setEtapaSobCursor(null)}
                            onClick={() => onAbrir(etapa)}
                            title={[`${nomeEtapa(etapa)} · ${etapa.area}`, `${br(etapa.startsAt)} a ${br(etapa.endsAt)} (${dias(etapa)} dias)`, `${etapa.embarkPort} → ${etapa.disembarkPort}`, ...autoria(etapa)].join('\n')}
                            className={`flex h-5 items-center justify-center text-[10px] font-semibold text-slate-950 transition ${ponta} ${ehHoje ? 'ring-2 ring-inset ring-white' : ''}`}
                            style={{ backgroundColor: cor, opacity: etapaSobCursor && !emFoco ? 0.35 : 1 }}
                        >
                            {dia}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function CruisePlanCard({ vessel, etapas = [], podeEditar = false }) {
    const diaDeHoje = hoje();
    const [visao, setVisao] = useState('calendario');
    const [ano, setAno] = useState(() => new Date().getFullYear());
    const [etapaSobCursor, setEtapaSobCursor] = useState(null);
    const [modal, setModal] = useState({ aberto: false, etapa: null });

    const abrir = (etapa = null) => podeEditar && setModal({ aberto: true, etapa });

    // Área -> cor, pela ordem em que aparece no plano (estável entre anos).
    const corDaArea = useMemo(() => {
        const ordem = [...new Set(etapas.map((e) => e.area))];
        return (area) => CORES_AREA[ordem.indexOf(area)] ?? COR_OUTRAS;
    }, [etapas]);

    const etapaDoDia = useMemo(() => {
        const mapa = new Map();
        for (const e of etapas) {
            const d = new Date(`${e.startsAt}T12:00:00`);
            const fim = new Date(`${e.endsAt}T12:00:00`);
            for (; d <= fim; d.setDate(d.getDate() + 1)) mapa.set(iso(d.getFullYear(), d.getMonth(), d.getDate()), e);
        }
        return mapa;
    }, [etapas]);

    const doAno = etapas.filter((e) => e.startsAt.startsWith(String(ano)) || e.endsAt.startsWith(String(ano)));
    const diasDeMarNoAno = [...etapaDoDia.keys()].filter((k) => k.startsWith(String(ano))).length;
    const areasDoAno = [...new Set(doAno.map((e) => e.area))];
    const lista = visao === 'lista' ? doAno : [];

    const botaoVisao = (chave, rotulo) => (
        <button
            type="button"
            onClick={() => setVisao(chave)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${visao === chave ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
            {rotulo}
        </button>
    );

    return (
        <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-6 shadow-lg backdrop-blur-md">
            <CruiseLegModal
                aberto={modal.aberto}
                onClose={() => setModal({ aberto: false, etapa: null })}
                vessel={vessel}
                etapa={modal.etapa}
                etapas={etapas}
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-bold text-white">Plano de Cruzeiro</h3>
                <div className="flex rounded-lg border border-slate-700 bg-slate-900/60 p-0.5">
                    {botaoVisao('calendario', 'Calendário')}
                    {botaoVisao('lista', 'Lista')}
                </div>
                {podeEditar && (
                    <button
                        type="button"
                        onClick={() => abrir()}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Nova etapa
                    </button>
                )}
            </div>

            {/* Ano + resumo */}
            <div className="mb-3 flex items-center gap-2">
                <button type="button" onClick={() => setAno((a) => a - 1)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Ano anterior">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="w-12 text-center text-sm font-bold tabular-nums text-white">{ano}</span>
                <button type="button" onClick={() => setAno((a) => a + 1)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Próximo ano">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
                <span className="ml-2 text-xs text-slate-400">
                    {doAno.length} etapa{doAno.length === 1 ? '' : 's'} · <span className="font-semibold text-slate-200">{diasDeMarNoAno}</span> dia{diasDeMarNoAno === 1 ? '' : 's'} de cruzeiro
                </span>
            </div>

            {visao === 'calendario' ? (
                <>
                    {areasDoAno.length > 0 && (
                        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                            {areasDoAno.map((a) => (
                                <span key={a} className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: corDaArea(a) }} />
                                    {a}
                                </span>
                            ))}
                            {podeEditar && <span className="ml-auto text-[11px] text-slate-500">Clique num dia da etapa para editar</span>}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {MESES.map((_, m) => (
                            <Mes key={m} ano={ano} mes={m} etapaDoDia={etapaDoDia} corDaArea={corDaArea}
                                 etapaSobCursor={etapaSobCursor} setEtapaSobCursor={setEtapaSobCursor}
                                 onAbrir={abrir} diaDeHoje={diaDeHoje} />
                        ))}
                    </div>
                </>
            ) : lista.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                    Nenhuma etapa de cruzeiro em {ano}.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/70 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-3 py-2">Etapa</th>
                                <th className="px-3 py-2">Área</th>
                                <th className="px-3 py-2">Início</th>
                                <th className="px-3 py-2">Fim</th>
                                <th className="px-3 py-2">Embarque</th>
                                <th className="px-3 py-2">Desembarque</th>
                                {podeEditar && <th className="px-2 py-2"><span className="sr-only">Ações</span></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {lista.map((e) => {
                                const sit = situacao(e, diaDeHoje);
                                return (
                                    <tr key={e.id} className={`transition hover:bg-slate-800/50 ${sit?.rot === 'Concluída' ? 'opacity-60' : ''}`} title={[e.notes, ...autoria(e)].filter(Boolean).join('\n')}>
                                        <td className="whitespace-nowrap px-3 py-2">
                                            <span className="font-bold text-white">{nomeEtapa(e)}</span>
                                            {sit?.rot === 'Em curso' && <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${sit.cls}`}>{sit.rot}</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                                            <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ backgroundColor: corDaArea(e.area) }} />
                                            {e.area}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-300" title={br(e.startsAt)}>{brCurto(e.startsAt)}</td>
                                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-300" title={`${br(e.endsAt)} · ${dias(e)} dias`}>{brCurto(e.endsAt)}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">{e.embarkPort}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">{e.disembarkPort}</td>
                                        {podeEditar && (
                                            <td className="px-2 py-2 text-right">
                                                <button type="button" onClick={() => abrir(e)} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white" title="Editar ou excluir etapa">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
