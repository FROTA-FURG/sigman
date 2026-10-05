import React, { useMemo, useState } from 'react';
import BadgeCondicao from './BadgeCondicao';
import { formatarData, formatarNumero, hojeIso } from '../lib/classificacao';
import { contarCondicoes, montarLinhaPlano } from '../lib/plano';
import { useCursorTooltip } from './CursorTooltip';

/*
 * Plano de Ação da embarcação, espelhando a aba "PLANO DE AÇÃO" da planilha:
 * frequência de coleta (meses ou horas), próxima coleta, condição, ação,
 * observações, responsáveis e prazo. O histórico vem das abas "ARMAZ.".
 *
 * Duas coisas são recalculadas aqui em vez de copiadas da planilha:
 *  - Visão global: o painel da planilha está com erro de fórmula, então a
 *    contagem sai da última amostra de cada equipamento.
 *  - Condição e última coleta: a coluna do plano quase sempre está vazia ou
 *    defasada; usamos a mais recente entre o plano e as amostras.
 */

const SITUACAO = {
    vencida: { rot: 'Vencida', cls: 'bg-red-500/10 text-red-400 ring-red-500/30' },
    proxima: { rot: 'Vence em breve', cls: 'bg-amber-500/10 text-amber-400 ring-amber-500/30' },
    emDia: { rot: 'Em dia', cls: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' },
    horas: { rot: 'Por horímetro', cls: 'bg-sky-500/10 text-sky-300 ring-sky-500/30' },
    semData: { rot: 'Sem programação', cls: 'bg-slate-500/10 text-slate-400 ring-slate-500/30' },
};

// Ícones dos indicadores da visão global (paths heroicons outline).
const ICONE = {
    normal: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    atencao: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    intervir: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    sem: 'M20 12H4',
    vencida: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    breve: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

const TOM = {
    emerald: { caixa: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30', valor: 'text-emerald-400' },
    amber: { caixa: 'bg-amber-500/15 text-amber-400 ring-amber-500/30', valor: 'text-amber-400' },
    red: { caixa: 'bg-red-500/15 text-red-400 ring-red-500/30', valor: 'text-red-400' },
    slate: { caixa: 'bg-slate-500/15 text-slate-400 ring-slate-500/30', valor: 'text-slate-300' },
};

function Contador({ rotulo, valor, icone, tom }) {
    const t = TOM[tom];
    // Zero fica apagado: o olho vai direto pro que tem ocorrência.
    const zerado = valor === 0;
    return (
        <div className={`flex items-center gap-2.5 whitespace-nowrap px-3 py-3 transition ${zerado ? 'opacity-50' : ''}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${t.caixa}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICONE[icone]} />
                </svg>
            </span>
            <span className={`text-2xl font-bold leading-none tabular-nums ${zerado ? 'text-slate-400' : t.valor}`}>{valor}</span>
            <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-400">{rotulo}</span>
        </div>
    );
}

function TituloSecao({ icone, titulo, contagem, subtitulo, tom = 'blue' }) {
    const cor = tom === 'blue'
        ? 'bg-blue-500/20 text-blue-300 ring-blue-500/40'
        : 'bg-slate-500/20 text-slate-300 ring-slate-500/40';
    return (
        <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${cor}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={icone} /></svg>
            </span>
            <div>
                <h4 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-white">
                    {titulo}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${cor}`}>{contagem}</span>
                </h4>
                <p className="text-[11px] text-slate-400">{subtitulo}</p>
            </div>
        </div>
    );
}

export default function ActionPlanTab({ plano, historico, equipamentosPorId, equipamentosDaEmbarcacao, onAbrirEquipamento }) {
    const hoje = hojeIso();
    const dica = useCursorTooltip();
    const [filtro, setFiltro] = useState('todos');
    const [historicoAberto, setHistoricoAberto] = useState(false);

    const linhas = useMemo(
        () => plano.map((item) => montarLinhaPlano(item, equipamentosPorId[item.equipamentoId], hoje)),
        [plano, equipamentosPorId, hoje],
    );

    const visaoGlobal = useMemo(() => contarCondicoes(equipamentosDaEmbarcacao), [equipamentosDaEmbarcacao]);

    const vencidas = linhas.filter((l) => l.situacao === 'vencida').length;
    const emBreve = linhas.filter((l) => l.situacao === 'proxima').length;

    const filtradas = linhas.filter((l) => {
        if (filtro === 'vencidas') return l.situacao === 'vencida' || l.situacao === 'proxima';
        if (filtro === 'criticas') return l.condicaoAtual === 'Intervir' || l.condicaoAtual === 'Atenção';
        return true;
    });

    const historicoOrdenado = useMemo(
        () => [...historico].sort((a, b) => (b.dataColeta || '').localeCompare(a.dataColeta || '')),
        [historico],
    );

    return (
        <div className="space-y-5">
            {dica.elemento}
            <p className="text-xs text-slate-400">Programação de coletas e ações corretivas por equipamento. Clique em uma linha para abrir as análises do equipamento.</p>

            {/* Visão global */}
            <div className="flex flex-wrap items-center justify-around gap-y-1 rounded-xl border border-slate-800 bg-[#0b203c]/90 px-2 shadow-sm">
                <Contador rotulo="Normal" valor={visaoGlobal.Normal} icone="normal" tom="emerald" />
                <Contador rotulo="Atenção" valor={visaoGlobal['Atenção']} icone="atencao" tom="amber" />
                <Contador rotulo="Intervir" valor={visaoGlobal.Intervir} icone="intervir" tom="red" />
                <Contador rotulo="Sem análise" valor={visaoGlobal.sem} icone="sem" tom="slate" />
                <Contador rotulo="Coletas vencidas" valor={vencidas} icone="vencida" tom="red" />
                <Contador rotulo="Vencem em 30 dias" valor={emBreve} icone="breve" tom="amber" />
            </div>

            {/* Plano vigente */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-r from-blue-600/15 to-transparent px-4 py-3.5">
                    <TituloSecao
                        icone="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        titulo="Plano vigente"
                        contagem={`${linhas.length} ${linhas.length === 1 ? 'item' : 'itens'}`}
                        subtitulo="Situação atual de cada equipamento: próxima coleta e ação em aberto"
                    />
                    <div className="flex rounded-lg bg-slate-900 p-0.5 text-xs">
                        {[['todos', 'Todos'], ['vencidas', 'Coletas vencidas / próximas'], ['criticas', 'Atenção / Intervir']].map(([k, rot]) => (
                            <button key={k} onClick={() => setFiltro(k)}
                                    className={`rounded-md px-3 py-1 font-medium transition ${filtro === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                {rot}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-3 py-2 text-left">Equipamento</th>
                                <th className="px-3 py-2 text-left">Frequência</th>
                                <th className="px-3 py-2 text-left">Última coleta</th>
                                <th className="px-3 py-2 text-left">Próxima coleta</th>
                                <th className="px-3 py-2 text-left">Situação</th>
                                <th className="px-3 py-2 text-left">Condição</th>
                                <th className="min-w-[220px] px-3 py-2 text-left">Ação</th>
                                <th className="min-w-[220px] px-3 py-2 text-left">Observações</th>
                                <th className="px-3 py-2 text-left">Responsáveis</th>
                                <th className="px-3 py-2 text-left">Prazo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                            {filtradas.map((l, i) => {
                                const s = SITUACAO[l.situacao];
                                // Hover na linha inteira: todas as células crescem (mais altura e
                                // fonte) e mudam de cor juntas. Feito na <td> e não com transform
                                // na <tr>, que os navegadores não aplicam de forma confiável.
                                const hover = l.temAnalise;
                                const cel = `px-3 py-2.5 transition-all duration-200 ease-out ${hover ? 'group-hover:bg-[#1a4480] group-hover:py-5 group-hover:text-[15px] group-hover:text-white' : ''}`;
                                const mini = `text-[10px] transition-all duration-200 ${hover ? 'group-hover:text-xs group-hover:text-blue-100' : ''}`;
                                // Badges (situação/condição) crescem junto com o texto da linha.
                                const badge = `inline-block origin-left transition-transform duration-200 ${hover ? 'group-hover:scale-[1.3]' : ''}`;
                                return (
                                    <tr key={`${l.tag}-${i}`}
                                        onClick={() => l.temAnalise && onAbrirEquipamento(l.equipamentoId)}
                                        className={`align-top ${l.temAnalise ? 'group cursor-pointer' : ''}`}
                                        {...(l.temAnalise
                                            ? dica.alvo('Clique para abrir análise do equipamento')
                                            : dica.alvo('Equipamento sem planilha de análise', 'cinza'))}>
                                        <td className={`${cel} ${l.temAnalise ? 'group-hover:shadow-[inset_5px_0_0_#60a5fa]' : ''}`}>
                                            <p className="font-semibold text-white group-hover:text-blue-200">{l.equipamento}</p>
                                            <p className={`font-mono text-slate-400 ${mini}`}>{l.tag}</p>
                                        </td>
                                        <td className={`whitespace-nowrap ${cel} text-slate-300`}>
                                            {l.frequenciaMeses ? `${formatarNumero(l.frequenciaMeses)} ${l.frequenciaMeses === 1 ? 'mês' : 'meses'}` : ''}
                                            {l.frequenciaMeses && l.frequenciaHoras ? ' · ' : ''}
                                            {l.frequenciaHoras ? `${formatarNumero(l.frequenciaHoras)} h` : ''}
                                            {!l.frequenciaMeses && !l.frequenciaHoras && '—'}
                                        </td>
                                        <td className={`whitespace-nowrap ${cel} text-slate-300`}>
                                            {formatarData(l.ultimaColeta)}
                                            {l.atualizadaPelaAmostra && (
                                                <span className="ml-1 text-[9px] text-blue-300" title={`No plano da planilha: ${formatarData(l.dataColeta)}. Atualizada pela amostra mais recente.`}>●</span>
                                            )}
                                        </td>
                                        <td className={`whitespace-nowrap ${cel} text-slate-300`}>
                                            {l.proxima ? (
                                                <>
                                                    {formatarData(l.proxima)}
                                                    <p className={`text-slate-500 ${mini}`}>
                                                        {l.dias < 0 ? `há ${-l.dias} dias` : l.dias === 0 ? 'hoje' : `em ${l.dias} dias`}
                                                    </p>
                                                </>
                                            ) : l.horimetroProximaColeta ? (
                                                <>
                                                    {formatarNumero(l.horimetroProximaColeta)} h
                                                    <p className={`text-slate-500 ${mini}`}>horímetro atual {formatarNumero(l.horimetroAtual)} h</p>
                                                </>
                                            ) : '—'}
                                        </td>
                                        <td className={`whitespace-nowrap ${cel}`}>
                                            <span className={badge}><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.cls}`}>{s.rot}</span></span>
                                        </td>
                                        <td className={`whitespace-nowrap ${cel}`}><span className={badge}><BadgeCondicao condicao={l.condicaoAtual} /></span></td>
                                        <td className={`${cel} leading-relaxed text-slate-300`}>
                                            {l.acao || <span className="text-slate-600">—</span>}
                                            {l.origem === 'amostra' && (
                                                <span className="ml-1.5 rounded bg-blue-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-blue-300" title="Gerado no sistema a partir de uma amostra (não veio da planilha)">da amostra</span>
                                            )}
                                            {l.parecerLaboratorio && (
                                                <p className={`mt-1.5 border-l-2 border-slate-600 pl-2 italic text-slate-400 ${mini}`} title={l.parecerLaboratorio}>
                                                    <span className="not-italic font-semibold text-slate-500">Laudo: </span>
                                                    <span className="line-clamp-2">{l.parecerLaboratorio}</span>
                                                </p>
                                            )}
                                        </td>
                                        <td className={`${cel} leading-relaxed text-slate-300`}>{l.observacoes || <span className="text-slate-600">—</span>}</td>
                                        <td className={`${cel} text-slate-300`}>{l.responsaveis || <span className="text-slate-600">—</span>}</td>
                                        <td className={`whitespace-nowrap ${cel} text-slate-300`}>{formatarData(l.prazo)}</td>
                                    </tr>
                                );
                            })}
                            {filtradas.length === 0 && (
                                <tr><td colSpan={10} className="px-3 py-10 text-center text-slate-500">Nenhum item neste filtro.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Histórico (abas ARMAZ. da planilha) */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-sm">
                <button onClick={() => setHistoricoAberto((v) => !v)} className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-slate-500/15 to-transparent px-4 py-3.5 text-left transition hover:from-slate-500/25">
                    <TituloSecao
                        icone="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        titulo="Histórico de planos de ação"
                        contagem={`${historicoOrdenado.length} ${historicoOrdenado.length === 1 ? 'registro' : 'registros'}`}
                        subtitulo="Planos anteriores arquivados: o que foi feito em cada coleta passada"
                        tom="slate"
                    />
                    <svg className={`h-5 w-5 shrink-0 text-slate-400 transition ${historicoAberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {historicoAberto && (
                    historicoOrdenado.length === 0 ? (
                        <p className="border-t border-slate-800 px-4 py-8 text-center text-sm text-slate-500">Sem histórico arquivado para esta embarcação.</p>
                    ) : (
                        <div className="overflow-x-auto border-t border-slate-800">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Coleta</th>
                                        <th className="px-3 py-2 text-left">Equipamento</th>
                                        <th className="px-3 py-2 text-left">Condição</th>
                                        <th className="min-w-[240px] px-3 py-2 text-left">Ação</th>
                                        <th className="min-w-[240px] px-3 py-2 text-left">Observações</th>
                                        <th className="px-3 py-2 text-left">Responsáveis</th>
                                        <th className="px-3 py-2 text-left">Prazo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/70">
                                    {historicoOrdenado.map((h, i) => (
                                        <tr key={`${h.tag}-${h.dataColeta}-${i}`} className="align-top hover:bg-slate-800/40">
                                            <td className="whitespace-nowrap px-3 py-2 text-slate-300">{formatarData(h.dataColeta)}</td>
                                            <td className="px-3 py-2">
                                                <p className="font-medium text-white">{h.equipamento}</p>
                                                <p className="font-mono text-[10px] text-slate-400">{h.tag}</p>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2">{h.condicao ? <BadgeCondicao condicao={h.condicao} /> : <span className="text-slate-600">—</span>}</td>
                                            <td className="px-3 py-2 leading-relaxed text-slate-300">{h.acao || '—'}</td>
                                            <td className="px-3 py-2 leading-relaxed text-slate-300">{h.observacoes || '—'}</td>
                                            <td className="px-3 py-2 text-slate-300">{h.responsaveis || '—'}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-slate-300">{formatarData(h.prazo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
