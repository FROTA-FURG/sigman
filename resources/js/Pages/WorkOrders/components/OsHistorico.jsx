import { useState } from 'react';
import { descreverEvento, quemFez } from '../lib/os';

/*
 * Histórico da OS: checagem do estagiário, observações de cada um (o texto
 * de cada pessoa fica guardado, não sobrescrito), comentário do engenheiro,
 * disparo e reprogramação -- sempre com quem fez, o cargo e quando.
 */
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function OsHistorico({ eventos = [], inicialAberto = false }) {
    const [aberto, setAberto] = useState(inicialAberto);
    // Mais recente primeiro.
    const lista = [...eventos].reverse();

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/30">
            <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Histórico da OS <span className="ml-1 font-normal normal-case text-slate-500">({eventos.length})</span>
                </h4>
                <svg className={`h-4 w-4 text-slate-500 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {aberto && (
                <div className="border-t border-slate-700/60 px-4 py-3">
                    {lista.length === 0 ? (
                        <p className="text-xs text-slate-500">Nada registrado ainda. Checagem, observações, disparo e reprogramação passam a aparecer aqui.</p>
                    ) : (
                        <ol className="relative space-y-3 border-l border-slate-700 pl-4">
                            {lista.map((ev) => {
                                const { texto, cor } = descreverEvento(ev);
                                return (
                                    <li key={ev.id} className="relative">
                                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-slate-500" />
                                        <p className={`text-xs font-semibold ${cor}`}>{texto}</p>
                                        {ev.note && (
                                            <p className="mt-1 whitespace-pre-wrap rounded border border-slate-700/60 bg-slate-900/60 px-2 py-1 text-xs text-slate-300">“{ev.note}”</p>
                                        )}
                                        <p className="mt-0.5 text-[10px] text-slate-500">{quemFez(ev)} · {quando(ev.created_at)}</p>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            )}
        </div>
    );
}
