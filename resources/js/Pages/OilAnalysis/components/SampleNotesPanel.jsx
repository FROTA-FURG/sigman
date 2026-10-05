import React, { useEffect, useState } from 'react';
import BadgeCondicao from './BadgeCondicao';
import { formatarData } from '../lib/classificacao';

/*
 * Parecer do laboratório x ação da equipe, por amostra.
 *
 * O parecer do laudo costuma ser genérico ("encontra-se em condições de
 * uso..."), então a equipe registra ao lado a ação específica que vai tomar.
 * A planilha não guarda o parecer -- ele vem do laudo (PDF) ou é colado aqui.
 */
export default function SampleNotesPanel({ amostra, condicao, onSalvar, onFechar }) {
    const [parecer, setParecer] = useState('');
    const [acao, setAcao] = useState('');
    const [editando, setEditando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState(null);

    // Por valor, não pela identidade do objeto: as props recarregam depois de
    // qualquer gravação na página e isso não deve fechar uma edição em curso.
    useEffect(() => {
        setParecer(amostra?.parecerLaboratorio || '');
        setAcao(amostra?.acaoEquipe || '');
        setEditando(false);
        setErro(null);
    }, [amostra?.id, amostra?.parecerLaboratorio, amostra?.acaoEquipe]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!amostra) return null;

    const alterado = parecer !== (amostra.parecerLaboratorio || '') || acao !== (amostra.acaoEquipe || '');
    const salvar = () => {
        setSalvando(true);
        setErro(null);
        onSalvar(
            { parecerLaboratorio: parecer.trim() || null, acaoEquipe: acao.trim() || null },
            {
                onSuccess: () => { setSalvando(false); setEditando(false); },
                onError: (e) => { setSalvando(false); setErro(Object.values(e).join(' ') || 'Erro ao salvar.'); },
            },
        );
    };

    const txt = 'w-full resize-y rounded-md border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

    return (
        <div className="overflow-hidden rounded-xl border border-blue-500/30 bg-[#0b203c]/90 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-gradient-to-r from-blue-600/15 to-transparent px-4 py-2.5">
                <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-white">Amostra nº {amostra.numero} · {formatarData(amostra.dataColeta)}</h4>
                    <BadgeCondicao condicao={condicao} />
                    {amostra.numeroLaudo && <span className="text-[11px] text-slate-400">Laudo {amostra.numeroLaudo}</span>}
                </div>
                <div className="flex items-center gap-2">
                    {!editando ? (
                        <button onClick={() => setEditando(true)} className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-blue-500 hover:text-white">
                            Editar parecer / ação
                        </button>
                    ) : (
                        <>
                            <button onClick={() => { setParecer(amostra.parecerLaboratorio || ''); setAcao(amostra.acaoEquipe || ''); setEditando(false); }} className="rounded-md px-3 py-1 text-xs text-slate-400 hover:text-white">Cancelar</button>
                            {erro && <span className="text-[11px] font-semibold text-red-400">{erro}</span>}
                            <button onClick={salvar} disabled={!alterado || salvando} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40">{salvando ? 'Salvando...' : 'Salvar'}</button>
                        </>
                    )}
                    <button onClick={onFechar} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Parecer do laboratório
                    </p>
                    {editando ? (
                        <textarea rows={5} value={parecer} onChange={(e) => setParecer(e.target.value)} className={txt}
                                  placeholder="Cole aqui o parecer do laudo" />
                    ) : amostra.parecerLaboratorio ? (
                        <p className="whitespace-pre-line rounded-lg bg-slate-900/60 px-3 py-2.5 text-sm leading-relaxed text-slate-300">{amostra.parecerLaboratorio}</p>
                    ) : (
                        <p className="rounded-lg border border-dashed border-slate-700 px-3 py-2.5 text-xs text-slate-500">
                            Parecer não registrado. A planilha não guarda o texto do laudo — ele vem do PDF ou pode ser colado em "Editar".
                        </p>
                    )}
                </div>
                <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Ação da equipe
                    </p>
                    {editando ? (
                        <textarea rows={5} value={acao} onChange={(e) => setAcao(e.target.value)} className={txt}
                                  placeholder="Ação específica da equipe para esta amostra" />
                    ) : amostra.acaoEquipe ? (
                        <p className="whitespace-pre-line rounded-lg bg-blue-500/10 px-3 py-2.5 text-sm leading-relaxed text-blue-100">{amostra.acaoEquipe}</p>
                    ) : (
                        <p className="rounded-lg border border-dashed border-slate-700 px-3 py-2.5 text-xs text-slate-500">Nenhuma ação registrada pela equipe.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
