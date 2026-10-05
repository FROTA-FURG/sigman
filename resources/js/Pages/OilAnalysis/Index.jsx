import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import StyledTooltips from '@/Components/StyledTooltips';
import StaticVesselViewer from '../Vessels/components/StaticVesselViewer';
import { montarEquipamentos } from './lib/dados';
import { formatarData, hojeIso } from './lib/classificacao';
import { contarCondicoes, montarLinhaPlano } from './lib/plano';

/*
 * Tela inicial da Análise de Óleo: o que a ferramenta faz e um card por
 * embarcação. Clicar leva à página da embarcação (Plano de Ação + Análises).
 */

const RECURSOS = [
    { titulo: 'Plano de Ação', texto: 'Programação de coletas por equipamento, coletas vencidas e ações corretivas com responsáveis e prazo.' },
    { titulo: 'Análises', texto: 'Histórico de cada coleta com físico-químicos, espectrometria e infravermelho, limites de condenação e tendência.' },
    { titulo: 'Laudos', texto: 'Submissão de laudos em PDF e lançamento manual dos resultados de laboratório.' },
];

function Indicador({ valor, rotulo, cor }) {
    return (
        <div className="flex flex-col items-center rounded-lg bg-slate-900/60 px-2 py-2">
            <span className={`text-lg font-bold leading-none ${cor}`}>{valor}</span>
            <span className="mt-1 text-center text-[10px] uppercase tracking-wide text-slate-400">{rotulo}</span>
        </div>
    );
}

export default function Index({ familias = {}, embarcacoes = [], pontos = [], planos = {}, ultimaColeta = null }) {
    const hoje = hojeIso();

    const resumo = useMemo(() => {
        const equipamentos = montarEquipamentos(pontos, familias);
        const porId = Object.fromEntries(equipamentos.map((e) => [e.id, e]));
        return Object.fromEntries(embarcacoes.map((v) => {
            const daEmbarcacao = equipamentos.filter((e) => e.embarcacao === v.tag);
            const plano = (planos[v.tag] || []).map((i) => montarLinhaPlano(i, porId[i.equipamentoId], hoje));
            const ultimaColeta = daEmbarcacao.map((e) => e.ultima?.dataColeta).filter(Boolean).sort().pop();
            return [v.tag, {
                equipamentos: daEmbarcacao.length,
                condicoes: contarCondicoes(daEmbarcacao),
                vencidas: plano.filter((l) => l.situacao === 'vencida').length,
                ultimaColeta,
            }];
        }));
    }, [pontos, familias, embarcacoes, planos, hoje]);

    return (
        <SIGMANLayout>
            <Head title="Análise de Óleo | SIGMAN" />
            <StyledTooltips />

            <div className="space-y-6 pb-6">
                {/* Capa */}
                <section className="relative overflow-hidden rounded-xl ring-1 ring-slate-800">
                    <img
                        src="/images/oil-analysis/capa-atlantico-sul.png"
                        alt="Navio de Pesquisa Hidroceanográfico Atlântico Sul"
                        className="absolute inset-0 h-full w-full object-cover object-right"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#020d1c] via-[#020d1c]/85 to-[#020d1c]/10" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#020d1c]/80 to-transparent" />

                    <div className="relative max-w-2xl px-6 py-10 sm:px-8 sm:py-14">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">Manutenção preditiva</p>
                        <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Análise de Óleo</h1>
                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                            Acompanha a condição dos lubrificantes dos motores, caixas redutoras e unidades hidráulicas da frota.
                            Cada laudo de laboratório é comparado aos limites de condenação do equipamento, e o resultado
                            orienta o plano de ação: quando coletar de novo, o que corrigir e quem é o responsável.
                        </p>
                        {ultimaColeta && (
                            <p className="mt-4 text-[11px] text-slate-400">
                                Última coleta registrada: {formatarData(ultimaColeta)}
                            </p>
                        )}
                    </div>
                </section>

                {/* O que dá pra fazer aqui */}
                <section className="grid grid-cols-3 gap-3">
                    {RECURSOS.map((r) => (
                        <div key={r.titulo} className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
                            <p className="text-sm font-semibold text-white">{r.titulo}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">{r.texto}</p>
                        </div>
                    ))}
                </section>

                {/* Embarcações */}
                <section>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Selecione a embarcação</h2>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {embarcacoes.map((v) => {
                            const r = resumo[v.tag];
                            return (
                                <Link
                                    key={v.tag}
                                    href={route('oil-analysis.show', v.tag)}
                                    className="group flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 transition-all hover:-translate-y-1 hover:shadow-blue-900/20 hover:ring-blue-500/50"
                                >
                                    <div className="flex items-center justify-between px-5 pb-3 pt-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white transition group-hover:text-blue-300">{v.nome}</h3>
                                            <p className="text-[11px] text-slate-400">
                                                Última coleta: <span className="text-slate-300">{formatarData(r.ultimaColeta)}</span>
                                            </p>
                                        </div>
                                        <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs font-bold text-slate-300 ring-1 ring-slate-700">{v.tag}</span>
                                    </div>

                                    {/* Modelo 3D, abaixo do nome */}
                                    <div className="relative h-48 w-full border-y border-slate-700/50 bg-[#051326]">
                                        {v.modelo3d && <StaticVesselViewer modelPath={v.modelo3d} name={v.nome} />}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 p-4">
                                        <Indicador valor={r.equipamentos} rotulo="Equip." cor="text-white" />
                                        <Indicador valor={r.condicoes['Atenção']} rotulo="Atenção" cor="text-amber-400" />
                                        <Indicador valor={r.condicoes.Intervir} rotulo="Intervir" cor="text-red-400" />
                                        <Indicador valor={r.vencidas} rotulo="Coletas vencidas" cor={r.vencidas ? 'text-red-400' : 'text-emerald-400'} />
                                    </div>

                                    <div className="mt-auto flex items-center justify-end border-t border-slate-800 px-5 py-2.5 text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                                        Abrir plano de ação e análises
                                        <svg className="ml-1.5 h-3.5 w-3.5 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        </SIGMANLayout>
    );
}
