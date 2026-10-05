import React, { useEffect, useMemo, useState } from 'react';
import TrendChart from './TrendChart';
import BadgeCondicao from './BadgeCondicao';
import { useCursorTooltip } from './CursorTooltip';
import SampleNotesPanel from './SampleNotesPanel';
import EquipmentWorkOrders from './EquipmentWorkOrders';
import { chaveDaAmostra } from '../lib/dados';
import {
    ESTILO_CONDICAO,
    NIVEL_ROTULO,
    condicaoDaAmostra,
    descreverLimite,
    formatarData,
    formatarNumero,
    nivelDoParametro,
    parametrosDaFamilia,
} from '../lib/classificacao';

export { BadgeCondicao };

function CabecalhoOrdenavel({ rotulo, ativo, dir, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={`Ordenar por ${rotulo === 'Nº' ? 'nº da amostra' : 'data da coleta'}`}
            className={`flex w-full items-center gap-1 px-3 py-2 text-[10px] font-semibold transition hover:text-blue-300 ${ativo ? 'text-blue-300' : 'text-slate-300'}`}
        >
            {rotulo}
            <svg className={`h-3 w-3 transition ${ativo ? 'opacity-100' : 'opacity-30'} ${ativo && dir === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    );
}

function Cartao({ titulo, children, dica }) {
    return (
        <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4 shadow-sm" title={dica}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{titulo}</p>
            <div className="mt-1.5">{children}</div>
        </div>
    );
}

/* Visão geral da embarcação: um cartão por equipamento com a última condição. */
function VisaoEmbarcacao({ equipamentos, familias, onSelecionar }) {
    const dica = useCursorTooltip();
    const porFamilia = Object.keys(familias).map((k) => ({ chave: k, rotulo: familias[k].rotulo, itens: equipamentos.filter((e) => e.familia === k) }))
        .filter((g) => g.itens.length);

    if (!equipamentos.length) {
        return <p className="py-16 text-center text-sm text-slate-500">Nenhum equipamento com análise de óleo cadastrado para esta embarcação.</p>;
    }

    return (
        <div className="space-y-6">
            {dica.elemento}
            {porFamilia.map((g) => (
                <section key={g.chave}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{g.rotulo}</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {g.itens.map((e) => (
                            <button
                                key={e.id}
                                onClick={() => onSelecionar(e.id)}
                                {...dica.alvo('Clique para abrir análise do equipamento')}
                                className="group relative flex flex-col rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4 text-left shadow-sm transition duration-200 ease-out hover:z-10 hover:scale-110 hover:border-blue-500/60 hover:bg-[#12305a] hover:shadow-2xl hover:shadow-blue-950/60"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white group-hover:text-blue-300">{e.nome}</p>
                                        <p className="font-mono text-[11px] text-slate-400">TAG (antiga): {e.tag}</p>
                                    </div>
                                    <BadgeCondicao condicao={e.condicaoAtual} />
                                </div>
                                <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
                                    <span>Última coleta: <span className="text-slate-200">{formatarData(e.ultima?.dataColeta)}</span></span>
                                    <span>{e.amostras.length} amostra{e.amostras.length === 1 ? '' : 's'}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

export default function AnalysesTab({
    equipamento, equipamentosDaEmbarcacao, familias, onSelecionar, onNovaManual, onNovaPdf,
    vinculo, ordens = [], onAnotar, onGerarPlano, onGerarOs, urlRetorno,
}) {
    const familia = equipamento ? familias[equipamento.familia] : null;
    const parametros = useMemo(() => parametrosDaFamilia(familia), [familia]);
    const [chaveTendencia, setChaveTendencia] = useState(null);
    // Ordenação da tabela de coletas: por nº da amostra ou data, asc/desc.
    const [ordem, setOrdem] = useState({ campo: 'data', dir: 'desc' });
    const alternarOrdem = (campo) => setOrdem((o) => (
        o.campo === campo ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir: 'desc' }
    ));

    // Amostra aberta no painel de parecer/ação (null = a última).
    const [chaveSelecionada, setChaveSelecionada] = useState(null);
    const [painelAberto, setPainelAberto] = useState(true);

    useEffect(() => { setChaveTendencia(null); setChaveSelecionada(null); setPainelAberto(true); }, [equipamento?.id]);

    if (!equipamento) {
        return <VisaoEmbarcacao equipamentos={equipamentosDaEmbarcacao} familias={familias} onSelecionar={onSelecionar} />;
    }

    const { amostras, limites, ultima } = equipamento;
    // `amostras` já vem em ordem cronológica; por nº, empata pela data.
    const recentes = (() => {
        const base = ordem.campo === 'numero'
            ? [...amostras].sort((a, b) => ((a.numero || 0) - (b.numero || 0)) || (a.dataColeta || '').localeCompare(b.dataColeta || ''))
            : [...amostras];
        return ordem.dir === 'desc' ? base.reverse() : base;
    })();

    // Por padrão a tendência abre no parâmetro que pior está na última coleta.
    const piorDaUltima = parametros.reduce((pior, p) => {
        const n = nivelDoParametro(p, ultima?.resultados?.[p.chave], limites) ?? -1;
        return n > pior.n ? { p, n } : pior;
    }, { p: parametros[0], n: -1 }).p;
    const paramTendencia = parametros.find((p) => p.chave === chaveTendencia) || piorDaUltima;

    const alertasUltima = parametros
        .map((p) => ({ p, n: nivelDoParametro(p, ultima?.resultados?.[p.chave], limites) }))
        .filter((x) => x.n >= 1);

    const selecionada = amostras.find((a) => chaveDaAmostra(a) === chaveSelecionada) || ultima;
    const condicaoSelecionada = selecionada ? condicaoDaAmostra(selecionada, familia, limites) : null;

    const colunasDados = [
        { k: 'laboratorio', rot: 'Laboratório' },
        { k: 'produto', rot: 'Produto' },
        { k: 'viscosidadeNominal', rot: 'Visc. nominal', un: 'cSt', num: true },
        { k: 'volume', rot: 'Volume', un: 'L', num: true },
        { k: 'horasServico', rot: 'Horas serviço', un: 'h', num: true },
        { k: 'reposicao', rot: 'Reposição', un: 'L', num: true },
        { k: 'produtoTrocado', rot: 'Óleo trocado' },
    ];

    return (
        <div className="space-y-5">
            {/* Cabeçalho do equipamento, no mesmo título da aba da planilha */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Informações das coletas e análises</p>
                    <h3 className="text-lg font-bold uppercase text-white">{equipamento.nome}</h3>
                    <p className="font-mono text-xs text-slate-400">TAG: {equipamento.tag} · {familia.rotulo}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onGerarPlano}
                        disabled={!ultima}
                        title="Novo item do Plano de Ação com base na última amostra"
                        className="flex items-center rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 hover:text-white disabled:opacity-40"
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        Gerar plano de ação
                    </button>
                    <button
                        onClick={onGerarOs}
                        disabled={!vinculo}
                        title={vinculo ? 'Abrir uma OS a partir desta análise' : 'Equipamento não cadastrado no sistema'}
                        className="flex items-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Gerar OS
                    </button>
                    <span className="mx-1 hidden w-px self-stretch bg-slate-700 sm:block" />
                    <button onClick={onNovaPdf} className="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar laudo (PDF)
                    </button>
                    <button onClick={onNovaManual} className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500">
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Nova análise
                    </button>
                </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Cartao titulo="Condição atual">
                    <BadgeCondicao condicao={equipamento.condicaoAtual} grande />
                    {alertasUltima.length > 0 && (
                        <p className="mt-2 text-[11px] leading-snug text-slate-400">
                            {alertasUltima.map((x) => x.p.rotulo).join(', ')}
                        </p>
                    )}
                </Cartao>
                <Cartao titulo="Última coleta">
                    <p className="text-xl font-bold text-white">{formatarData(ultima?.dataColeta)}</p>
                    <p className="text-[11px] text-slate-400">Amostra nº {ultima?.numero ?? '—'} · {ultima?.laboratorio || '—'}</p>
                </Cartao>
                <Cartao titulo="Óleo em uso">
                    <p className="truncate text-sm font-semibold text-white" title={ultima?.produto}>{ultima?.produto || '—'}</p>
                    <p className="text-[11px] text-slate-400">
                        Visc. nominal {formatarNumero(ultima?.viscosidadeNominal)} cSt · {formatarNumero(ultima?.volume)} L
                    </p>
                </Cartao>
                <Cartao titulo="Histórico">
                    <p className="text-xl font-bold text-white">{amostras.length}</p>
                    <p className="text-[11px] text-slate-400">
                        amostras desde {formatarData(amostras[0]?.dataColeta)}
                    </p>
                </Cartao>
            </div>

            {/* Tabela das coletas -- mesmas colunas da planilha */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                    <h4 className="text-sm font-semibold text-white">Coletas e resultados</h4>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/40" />Atenção</span>
                        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/50" />Intervir</span>
                        <span className="hidden sm:inline">· clique na linha para ver parecer e ação · no cabeçalho, para ver a tendência</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
                                <th colSpan={2 + colunasDados.length} className="sticky left-0 z-10 border-b border-r border-slate-800 bg-slate-900 px-3 py-1.5 text-left">Dados da amostra</th>
                                {familia.grupos.map((g) => (
                                    <th key={g.nome} colSpan={g.parametros.length} className="border-b border-r border-slate-800 px-3 py-1.5 text-center text-blue-300">{g.nome}</th>
                                ))}
                                <th colSpan={3} className="border-b border-slate-800 px-3 py-1.5" />
                            </tr>
                            <tr className="bg-slate-900/60 text-[10px] font-semibold text-slate-300">
                                <th className="sticky left-0 z-10 w-14 min-w-[3.5rem] bg-slate-900 p-0 text-left">
                                    <CabecalhoOrdenavel rotulo="Nº" ativo={ordem.campo === 'numero'} dir={ordem.dir} onClick={() => alternarOrdem('numero')} />
                                </th>
                                <th className="sticky left-14 z-10 border-r border-slate-800 bg-slate-900 p-0 text-left">
                                    <CabecalhoOrdenavel rotulo="Coleta" ativo={ordem.campo === 'data'} dir={ordem.dir} onClick={() => alternarOrdem('data')} />
                                </th>
                                {colunasDados.map((c) => (
                                    <th key={c.k} className={`whitespace-nowrap px-3 py-2 ${c.num ? 'text-right' : 'text-left'}`}>
                                        {c.rot}{c.un && <span className="ml-1 font-normal text-slate-500">{c.un}</span>}
                                    </th>
                                ))}
                                {familia.grupos.map((g) => g.parametros.map((p, i) => (
                                    <th
                                        key={p.chave}
                                        onClick={() => setChaveTendencia(p.chave)}
                                        className={`cursor-pointer whitespace-nowrap px-3 py-2 text-right transition hover:text-blue-300 ${i === g.parametros.length - 1 ? 'border-r border-slate-800' : ''} ${paramTendencia?.chave === p.chave ? 'text-blue-300 underline decoration-blue-500/60 underline-offset-4' : ''}`}
                                        title={`Ver tendência de ${p.rotulo}`}
                                    >
                                        {p.rotulo}{p.unidade && <span className="ml-1 font-normal text-slate-500">{p.unidade}</span>}
                                    </th>
                                )))}
                                <th className="px-3 py-2 text-left">Condição</th>
                                <th className="px-3 py-2 text-left" title="Parecer do laboratório / ação da equipe">Parecer · Ação</th>
                                <th className="px-3 py-2 text-left">Laudo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                            {recentes.map((a) => {
                                const cond = condicaoDaAmostra(a, familia, limites);
                                const ativa = selecionada && chaveDaAmostra(a) === chaveDaAmostra(selecionada) && painelAberto;
                                const fundoFixo = ativa ? 'bg-[#15386a]' : 'bg-[#0b203c]';
                                return (
                                    <tr
                                        key={chaveDaAmostra(a)}
                                        onClick={() => { setChaveSelecionada(chaveDaAmostra(a)); setPainelAberto(true); }}
                                        className={`cursor-pointer transition-colors ${ativa ? 'bg-[#15386a]' : `hover:bg-slate-800/40 ${a.origem && a.origem !== 'planilha' ? 'bg-blue-500/5' : ''}`}`}
                                    >
                                        <td className={`sticky left-0 z-[1] w-14 min-w-[3.5rem] ${fundoFixo} px-3 py-2 font-mono text-slate-300 ${ativa ? 'shadow-[inset_4px_0_0_#60a5fa]' : ''}`}>{a.numero ?? '—'}</td>
                                        <td className={`sticky left-14 z-[1] whitespace-nowrap border-r border-slate-800 ${fundoFixo} px-3 py-2 font-medium text-white`}>
                                            {formatarData(a.dataColeta)}
                                            {a.origem && a.origem !== 'planilha' && (
                                                <span className="ml-1.5 rounded bg-blue-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-blue-300"
                                                      title={a.origem === 'pdf' ? 'Lançada no sistema com o laudo em PDF' : 'Lançada no sistema manualmente'}>
                                                    {a.origem === 'pdf' ? 'PDF' : 'manual'}
                                                </span>
                                            )}
                                        </td>
                                        {colunasDados.map((c) => (
                                            <td key={c.k} className={`whitespace-nowrap px-3 py-2 text-slate-300 ${c.num ? 'text-right tabular-nums' : ''} ${c.k === 'produto' ? 'max-w-[180px] truncate' : ''}`} title={c.k === 'produto' ? a.produto : undefined}>
                                                {c.num ? formatarNumero(a[c.k]) : (a[c.k] || '—')}
                                            </td>
                                        ))}
                                        {familia.grupos.map((g) => g.parametros.map((p, i) => {
                                            const v = a.resultados?.[p.chave];
                                            const n = nivelDoParametro(p, v, limites);
                                            const rot = n === null ? null : NIVEL_ROTULO[n];
                                            const lim = [
                                                descreverLimite(p, limites, 'amarelo') && `Atenção ${descreverLimite(p, limites, 'amarelo')}`,
                                                descreverLimite(p, limites, 'vermelho') && `Intervir ${descreverLimite(p, limites, 'vermelho')}`,
                                            ].filter(Boolean).join(' · ') || 'Sem limite cadastrado';
                                            return (
                                                <td
                                                    key={p.chave}
                                                    title={`${p.rotulo}: ${formatarNumero(v)} ${p.unidade || ''}\n${lim}`}
                                                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${i === g.parametros.length - 1 ? 'border-r border-slate-800' : ''} ${rot && rot !== 'Normal' ? ESTILO_CONDICAO[rot].celula : 'text-slate-300'}`}
                                                >
                                                    {formatarNumero(v)}
                                                </td>
                                            );
                                        }))}
                                        <td className="whitespace-nowrap px-3 py-2"><BadgeCondicao condicao={cond} /></td>
                                        <td className="whitespace-nowrap px-3 py-2">
                                            <span className="flex items-center gap-1.5 text-[10px]">
                                                <span className={`rounded px-1.5 py-0.5 font-semibold ${a.parecerLaboratorio ? 'bg-slate-700 text-slate-200' : 'text-slate-600'}`} title={a.parecerLaboratorio || 'Sem parecer do laboratório'}>Lab</span>
                                                <span className={`rounded px-1.5 py-0.5 font-semibold ${a.acaoEquipe ? 'bg-blue-500/25 text-blue-200' : 'text-slate-600'}`} title={a.acaoEquipe || 'Sem ação da equipe'}>Equipe</span>
                                            </span>
                                        </td>
                                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                            {a.laudo?.url ? (
                                                <a href={a.laudo.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300" title={a.laudo.nome}>
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                </a>
                                            ) : <span className="text-slate-600">—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                            {recentes.length === 0 && (
                                <tr><td colSpan={99} className="px-3 py-10 text-center text-slate-500">Nenhuma coleta registrada para este equipamento.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {painelAberto && selecionada && (
                <SampleNotesPanel
                    amostra={selecionada}
                    condicao={condicaoSelecionada}
                    onSalvar={(dados, opcoes) => onAnotar(selecionada, dados, opcoes)}
                    onFechar={() => setPainelAberto(false)}
                />
            )}

            {/* Tendência + limites */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4 shadow-sm xl:col-span-2">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-white">
                            Tendência — {paramTendencia?.rotulo}{paramTendencia?.unidade && <span className="ml-1 text-xs font-normal text-slate-400">({paramTendencia.unidade})</span>}
                        </h4>
                        <select
                            value={paramTendencia?.chave || ''}
                            onChange={(e) => setChaveTendencia(e.target.value)}
                            className="rounded-md border-slate-700 bg-slate-900 py-1 pl-2 pr-8 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            {familia.grupos.map((g) => (
                                <optgroup key={g.nome} label={g.nome}>
                                    {g.parametros.map((p) => <option key={p.chave} value={p.chave}>{p.rotulo}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    {paramTendencia && <TrendChart amostras={amostras} parametro={paramTendencia} limites={limites} />}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-sm">
                    <div className="border-b border-slate-800 px-4 py-2.5">
                        <h4 className="text-sm font-semibold text-white">Limites de condenação</h4>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        <table className="min-w-full text-xs">
                            <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-3 py-1.5 text-left">Parâmetro</th>
                                    <th className="px-3 py-1.5 text-right text-amber-400">Atenção</th>
                                    <th className="px-3 py-1.5 text-right text-red-400">Intervir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/70">
                                {parametros.map((p) => {
                                    const a = p.chave === 'nas' && limites?.verde?.nas != null
                                        ? `> ${formatarNumero(limites.verde.nas)}`
                                        : descreverLimite(p, limites, 'amarelo');
                                    const v = descreverLimite(p, limites, 'vermelho');
                                    return (
                                        <tr key={p.chave} className="hover:bg-slate-800/40">
                                            <td className="px-3 py-1.5 text-slate-200">{p.rotulo}{p.unidade && <span className="ml-1 text-slate-500">{p.unidade}</span>}</td>
                                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-300">{a || <span className="text-slate-600">—</span>}</td>
                                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-300">{v || <span className="text-slate-600">—</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <EquipmentWorkOrders vinculo={vinculo} ordens={ordens} onGerarOs={onGerarOs} urlRetorno={urlRetorno} />
        </div>
    );
}
