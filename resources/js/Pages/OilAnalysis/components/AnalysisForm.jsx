import React from 'react';
import BrDateField from '@/Components/BrDateField';
import {
    ESTILO_CONDICAO,
    condicaoCalculada,
    descreverLimite,
    formatarNumero,
    parametrosDaFamilia,
} from '../lib/classificacao';

/*
 * Formulário de uma análise de óleo, com os mesmos campos da planilha:
 * dados da amostra + resultados por grupo da família do equipamento.
 * Usado no lançamento manual e na importação de laudo em PDF (onde o
 * usuário transcreve o laudo ao lado do preview).
 */

export function formularioVazio(familia, ultimaAmostra) {
    const resultados = {};
    parametrosDaFamilia(familia).forEach((p) => { resultados[p.chave] = ''; });
    return {
        dataColeta: '',
        laboratorio: ultimaAmostra?.laboratorio || '',
        produto: ultimaAmostra?.produto || '',
        viscosidadeNominal: ultimaAmostra?.viscosidadeNominal ?? '',
        volume: ultimaAmostra?.volume ?? '',
        horasServico: '',
        reposicao: '',
        produtoTrocado: '',
        numeroLaudo: '',
        condicaoManual: '',
        parecerLaboratorio: '',
        acaoEquipe: '',
        resultados,
    };
}

const numero = (v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));

/** Converte o formulário no formato de amostra do JSON. */
export function formularioParaAmostra(form, familia, limites, numeroAmostra) {
    const resultados = {};
    Object.entries(form.resultados).forEach(([k, v]) => { resultados[k] = numero(v); });
    const calculada = condicaoCalculada(resultados, familia, limites);
    return {
        numero: numeroAmostra,
        laboratorio: form.laboratorio || null,
        produto: form.produto || null,
        viscosidadeNominal: numero(form.viscosidadeNominal),
        volume: numero(form.volume),
        horasServico: numero(form.horasServico),
        reposicao: numero(form.reposicao),
        produtoTrocado: form.produtoTrocado || null,
        dataColeta: form.dataColeta || null,
        numeroLaudo: form.numeroLaudo || null,
        parecerLaboratorio: form.parecerLaboratorio.trim() || null,
        acaoEquipe: form.acaoEquipe.trim() || null,
        resultados,
        condicao: form.condicaoManual || calculada,
    };
}

export function formularioValido(form) {
    const temResultado = Object.values(form.resultados).some((v) => v !== '' && v !== null);
    return !!form.dataColeta && temResultado;
}

const inputCls = 'w-full rounded-md border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400';

function Campo({ label, children, className = '' }) {
    return (
        <label className={`block ${className}`}>
            <span className={labelCls}>{label}</span>
            {children}
        </label>
    );
}

export default function AnalysisForm({ form, setForm, familia, limites, compacto = false }) {
    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
    const setResultado = (chave) => (e) => setForm((f) => ({ ...f, resultados: { ...f.resultados, [chave]: e.target.value } }));

    const resultadosNum = {};
    Object.entries(form.resultados).forEach(([k, v]) => { resultadosNum[k] = numero(v); });
    const calculada = condicaoCalculada(resultadosNum, familia, limites);
    const final = form.condicaoManual || calculada;
    const estiloFinal = ESTILO_CONDICAO[final] || ESTILO_CONDICAO.default;

    const colsDados = compacto ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';
    const colsResult = compacto ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';

    return (
        <div className="space-y-5">
            <section>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-400">Dados da Amostra</h4>
                <div className={`grid gap-3 ${colsDados}`}>
                    <Campo label="Data da coleta *">
                        <BrDateField value={form.dataColeta} onChange={(v) => setForm((f) => ({ ...f, dataColeta: v }))} />
                    </Campo>
                    <Campo label="Nº do laudo">
                        <input value={form.numeroLaudo} onChange={set('numeroLaudo')} className={inputCls} placeholder="Ex.: 123456" />
                    </Campo>
                    <Campo label="Laboratório">
                        <input value={form.laboratorio} onChange={set('laboratorio')} className={inputCls} placeholder="Ex.: Labolmac" />
                    </Campo>
                    <Campo label="Produto (óleo)">
                        <input value={form.produto} onChange={set('produto')} className={inputCls} placeholder="Ex.: LUBRAX TOP TURBO 15W40" />
                    </Campo>
                    <Campo label="Viscosidade nominal (cSt)">
                        <input inputMode="decimal" value={form.viscosidadeNominal} onChange={set('viscosidadeNominal')} className={inputCls} />
                    </Campo>
                    <Campo label="Volume do cárter (L)">
                        <input inputMode="decimal" value={form.volume} onChange={set('volume')} className={inputCls} />
                    </Campo>
                    <Campo label="Horas de serviço do óleo">
                        <input inputMode="decimal" value={form.horasServico} onChange={set('horasServico')} className={inputCls} />
                    </Campo>
                    <Campo label="Reposição (L)">
                        <input inputMode="decimal" value={form.reposicao} onChange={set('reposicao')} className={inputCls} />
                    </Campo>
                    <Campo label="Óleo trocado?">
                        <select value={form.produtoTrocado} onChange={set('produtoTrocado')} className={inputCls}>
                            <option value="">—</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                        </select>
                    </Campo>
                </div>
            </section>

            {familia.grupos.map((grupo) => (
                <section key={grupo.nome}>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-400">{grupo.nome}</h4>
                    <div className={`grid gap-3 ${colsResult}`}>
                        {grupo.parametros.map((p) => {
                            const a = descreverLimite(p, limites, 'amarelo');
                            const v = descreverLimite(p, limites, 'vermelho');
                            return (
                                <Campo key={p.chave} label={`${p.rotulo}${p.unidade ? ` (${p.unidade})` : ''}`}>
                                    <input
                                        inputMode="decimal"
                                        value={form.resultados[p.chave] ?? ''}
                                        onChange={setResultado(p.chave)}
                                        className={inputCls}
                                    />
                                    {(a || v) && (
                                        <span className="mt-0.5 block text-[10px] text-slate-500">
                                            {a && <span className="text-amber-400/80">A {a}</span>}
                                            {a && v && ' · '}
                                            {v && <span className="text-red-400/80">I {v}</span>}
                                        </span>
                                    )}
                                </Campo>
                            );
                        })}
                    </div>
                </section>
            ))}

            <section className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div>
                    <span className={labelCls}>Condição calculada pelos limites</span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${(ESTILO_CONDICAO[calculada] || ESTILO_CONDICAO.default).badge}`}>
                        {calculada || 'Preencha os resultados'}
                    </span>
                </div>
                <Campo label="Condição do laudo (se diferente)" className="w-56">
                    <select value={form.condicaoManual} onChange={set('condicaoManual')} className={inputCls}>
                        <option value="">Usar a calculada</option>
                        <option value="Normal">Normal</option>
                        <option value="Atenção">Atenção</option>
                        <option value="Intervir">Intervir</option>
                    </select>
                </Campo>
                <div className="ml-auto text-right">
                    <span className={labelCls}>Será registrada como</span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${estiloFinal.badge}`}>
                        {final || '—'}
                    </span>
                </div>
            </section>
            <section className={`grid gap-3 ${compacto ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                <Campo label="Parecer do laboratório (texto do laudo)">
                    <textarea
                        rows={4}
                        value={form.parecerLaboratorio}
                        onChange={set('parecerLaboratorio')}
                        className={`${inputCls} resize-y`}
                        placeholder="Ex.: O produto representado pela amostra encontra-se em condições de uso..."
                    />
                </Campo>
                <Campo label="Ação da equipe">
                    <textarea
                        rows={4}
                        value={form.acaoEquipe}
                        onChange={set('acaoEquipe')}
                        className={`${inputCls} resize-y`}
                        placeholder="O que a equipe vai fazer, de forma específica. Ex.: trocar filtro de ar e antecipar a próxima coleta para 500 h."
                    />
                </Campo>
            </section>

            <p className="text-[10px] text-slate-500">
                A = limite de Atenção · I = limite de Intervir. Valores com vírgula ou ponto ({formatarNumero(1.5)}) são aceitos.
            </p>
        </div>
    );
}
