import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { diasEntre, formatarData, hojeIso } from '../lib/classificacao';
import { STATUS_OS, TIPO_OS, dataAlvoOs, osPendente } from '../lib/vinculoSistema';

/*
 * Manutenções (OS) do equipamento no sistema. As pendentes vêm primeiro e
 * com a distância em dias: antes de abrir uma OS nova pela análise de óleo,
 * a equipe vê se já existe uma próxima que dá pra adiantar.
 */

function LinhaOs({ os, hoje, destaque = false, urlRetorno }) {
    const s = STATUS_OS[os.status] || STATUS_OS.open;
    const data = dataAlvoOs(os);
    const dias = data ? diasEntre(hoje, data) : null;
    return (
        <Link
            href={route('work-orders.show', { work_order: os.id, back: urlRetorno })}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition hover:border-blue-500/60 hover:bg-[#12305a] ${destaque ? 'border-purple-500/30 bg-purple-500/5' : 'border-slate-800 bg-slate-900/40'}`}
        >
            <div className="w-24 shrink-0">
                <p className="font-mono text-xs font-bold text-white">{os.os_number}</p>
                <p className="text-[11px] text-slate-400">{formatarData(data)}</p>
                {destaque && dias !== null && (
                    <p className={`text-[10px] font-semibold ${dias < 0 ? 'text-red-400' : 'text-purple-300'}`}>
                        {dias < 0 ? `atrasada ${-dias} d` : dias === 0 ? 'hoje' : `em ${dias} dias`}
                    </p>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs leading-snug text-slate-200">{os.description}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                    <span className={`rounded-full px-1.5 py-0.5 font-semibold ring-1 ring-inset ${s.cls}`}>{s.rot}</span>
                    <span>{TIPO_OS[os.maintenance_type] || os.maintenance_type}</span>
                    {os.periodicity && <span>· {os.periodicity}</span>}
                    {os.in_52_week_plan && <span className="text-sky-300">· Plano 52 sem.</span>}
                </p>
            </div>
        </Link>
    );
}

export default function EquipmentWorkOrders({ vinculo, ordens, onGerarOs, urlRetorno }) {
    const hoje = hojeIso();
    const [verTodas, setVerTodas] = useState(false);
    const [verTodasPendentes, setVerTodasPendentes] = useState(false);

    const pendentes = ordens.filter(osPendente).sort((a, b) => dataAlvoOs(a).localeCompare(dataAlvoOs(b)));
    const realizadas = ordens.filter((o) => o.status === 'completed').sort((a, b) => dataAlvoOs(b).localeCompare(dataAlvoOs(a)));
    // Só as 5 mais próximas; o resto abre em "Ver todas".
    const pendentesVisiveis = verTodasPendentes ? pendentes : pendentes.slice(0, 5);
    const realizadasVisiveis = verTodas ? realizadas : realizadas.slice(0, 5);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5">
                <div>
                    <h4 className="text-sm font-semibold text-white">Manutenções do equipamento (OS)</h4>
                    <p className="text-[11px] text-slate-400">
                        {vinculo
                            ? <>No sistema: <span className="font-mono text-slate-300">{vinculo.tag_number}</span> — {vinculo.name}</>
                            : 'Equipamento não encontrado no cadastro do sistema'}
                    </p>
                </div>
                <button
                    onClick={onGerarOs}
                    disabled={!vinculo}
                    title={vinculo ? 'Abrir uma OS a partir desta análise' : 'Cadastre o equipamento no sistema para gerar OS'}
                    className="flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Gerar OS
                </button>
            </div>

            {!vinculo ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">
                    A TAG da planilha não corresponde a nenhum equipamento cadastrado nesta embarcação, então não há OS para mostrar.
                </p>
            ) : (
                <div className="space-y-4 p-4">
                    <section>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                            Pendentes / futuras ({pendentes.length})
                        </p>
                        {pendentes.length ? (
                            <div className="space-y-2">
                                {pendentesVisiveis.map((os) => <LinhaOs key={os.id} os={os} hoje={hoje} destaque urlRetorno={urlRetorno} />)}
                                {pendentes.length > 5 && (
                                    <button onClick={() => setVerTodasPendentes((v) => !v)} className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                                        {verTodasPendentes ? 'Mostrar menos' : `Ver todas (${pendentes.length})`}
                                    </button>
                                )}
                                <p className="text-[10px] leading-relaxed text-slate-500">
                                    Antes de gerar uma OS nova, avalie adiantar uma destas — clique para abrir a OS e alterar a data.
                                </p>
                            </div>
                        ) : (
                            <p className="rounded-lg border border-dashed border-slate-700 px-3 py-2.5 text-xs text-slate-500">Nenhuma OS pendente para este equipamento.</p>
                        )}
                    </section>

                    <section>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                            Realizadas ({realizadas.length})
                        </p>
                        {realizadas.length ? (
                            <div className="space-y-2">
                                {realizadasVisiveis.map((os) => <LinhaOs key={os.id} os={os} hoje={hoje} urlRetorno={urlRetorno} />)}
                                {realizadas.length > 5 && (
                                    <button onClick={() => setVerTodas((v) => !v)} className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                                        {verTodas ? 'Mostrar menos' : `Ver todas (${realizadas.length})`}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="rounded-lg border border-dashed border-slate-700 px-3 py-2.5 text-xs text-slate-500">Nenhuma OS concluída registrada.</p>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
