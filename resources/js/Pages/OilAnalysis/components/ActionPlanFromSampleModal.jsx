import React, { useEffect, useState } from 'react';
import BrDateField from '@/Components/BrDateField';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import BadgeCondicao from './BadgeCondicao';
import { formatarData, parametrosEmAlerta } from '../lib/classificacao';
import { somarMeses } from '../lib/plano';

/*
 * Novo item do Plano de Ação a partir da última amostra do equipamento.
 *
 * Segue o fluxo da planilha: o item vigente vai pro histórico (as abas
 * ARMAZ.) e o novo assume o lugar dele. Frequência e responsáveis vêm do
 * item atual; condição e data vêm da amostra; a ação parte da ação da
 * equipe registrada na amostra.
 */

const inputCls = 'w-full rounded-md border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400';

const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

export default function ActionPlanFromSampleModal({ aberto, onClose, onSalvo, equipamento, familia, amostra, condicao, itemAtual }) {
    const [enviando, setEnviando] = useState(false);
    const [erros, setErros] = useState({});
    const [form, setForm] = useState(null);

    useEffect(() => {
        if (!aberto || !equipamento || !amostra) return;
        setErros({});
        const alertas = parametrosEmAlerta(amostra, familia, equipamento.limites);
        setForm({
            frequenciaMeses: itemAtual?.frequenciaMeses ?? '',
            frequenciaHoras: itemAtual?.frequenciaHoras ?? '',
            horimetroAtual: itemAtual?.horimetroAtual ?? '',
            acao: amostra.acaoEquipe || '',
            observacoes: alertas.length ? `Fora do limite: ${alertas.join('; ')}.` : '',
            responsaveis: itemAtual?.responsaveis || '',
            prazo: '',
        });
    }, [aberto, equipamento?.id, amostra]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!aberto) return;
        const onKey = (e) => e.key === 'Escape' && !enviando && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [aberto, enviando, onClose]);

    if (!aberto || !form || !amostra) return null;

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
    const meses = num(form.frequenciaMeses);
    const horas = num(form.frequenciaHoras);
    const horimetro = num(form.horimetroAtual);
    const proximaData = meses && amostra.dataColeta ? somarMeses(amostra.dataColeta, meses) : null;

    // O servidor arquiva o item vigente do ponto e cria este (condição, data,
    // parecer e próxima coleta saem da amostra).
    const salvar = () => {
        setEnviando(true);
        router.post(route('oil-analysis.action-plan.store', equipamento.id), {
            amostraId: amostra.id,
            frequenciaMeses: meses,
            frequenciaHoras: horas,
            horimetroAtual: horimetro,
            acao: form.acao.trim(),
            observacoes: form.observacoes.trim() || null,
            responsaveis: form.responsaveis.trim() || null,
            prazo: form.prazo || null,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => onSalvo(),
            onError: (e) => setErros(e),
            onFinish: () => setEnviando(false),
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => !enviando && onClose()}>
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b203c] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex shrink-0 items-start justify-between border-b border-slate-800 px-5 py-3">
                    <div>
                        <h3 className="text-base font-bold text-white">Gerar Plano de Ação da última amostra</h3>
                        <p className="text-xs text-slate-400">
                            {equipamento.nome} · <span className="font-mono text-slate-300">{equipamento.tag}</span> · Amostra nº {amostra.numero} de {formatarData(amostra.dataColeta)}
                        </p>
                    </div>
                    <BadgeCondicao condicao={condicao} />
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {amostra.parecerLaboratorio && (
                        <div className="rounded-lg bg-slate-900/60 px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parecer do laboratório (referência)</p>
                            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-300">{amostra.parecerLaboratorio}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <label className="block">
                            <span className={labelCls}>Frequência (meses)</span>
                            <input inputMode="decimal" value={form.frequenciaMeses} onChange={set('frequenciaMeses')} className={inputCls} />
                        </label>
                        <label className="block">
                            <span className={labelCls}>Frequência (horas)</span>
                            <input inputMode="decimal" value={form.frequenciaHoras} onChange={set('frequenciaHoras')} className={inputCls} />
                        </label>
                        <label className="block">
                            <span className={labelCls}>Horímetro atual (h)</span>
                            <input inputMode="decimal" value={form.horimetroAtual} onChange={set('horimetroAtual')} className={inputCls} />
                        </label>
                        <div>
                            <span className={labelCls}>Próxima coleta</span>
                            <p className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-2 text-sm text-slate-200">
                                {proximaData ? formatarData(proximaData) : horas && horimetro != null ? `${horimetro + horas} h` : '—'}
                            </p>
                        </div>
                    </div>

                    <label className="block">
                        <span className={labelCls}>Ação *</span>
                        <textarea rows={4} value={form.acao} onChange={set('acao')} className={`${inputCls} resize-y`}
                                  placeholder="Ação específica da equipe (ex.: trocar a carga de óleo usando a unidade móvel de filtragem)" />
                    </label>
                    <label className="block">
                        <span className={labelCls}>Observações</span>
                        <textarea rows={3} value={form.observacoes} onChange={set('observacoes')} className={`${inputCls} resize-y`} />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className={labelCls}>Responsáveis</span>
                            <input value={form.responsaveis} onChange={set('responsaveis')} className={inputCls} placeholder="Ex.: Alexandre e Letícia" />
                        </label>
                        <label className="block">
                            <span className={labelCls}>Prazo</span>
                            <BrDateField value={form.prazo} onChange={(v) => setForm((f) => ({ ...f, prazo: v }))} />
                        </label>
                    </div>

                    {itemAtual && (
                        <p className="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-400">
                            O item atual deste equipamento (coleta de {formatarData(itemAtual.dataColeta)}) vai para o <span className="text-slate-200">Histórico de planos de ação</span>, como na planilha.
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 bg-slate-900/40 px-5 py-3">
                    <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800">Cancelar</button>
                    {Object.keys(erros).length > 0 && (
                        <p className="mr-auto self-center text-xs font-semibold text-red-400">Não foi possível salvar: {Object.values(erros).join(' ')}</p>
                    )}
                    <button onClick={salvar} disabled={!form.acao.trim() || enviando}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                        {enviando ? 'Gerando...' : 'Gerar plano de ação'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
