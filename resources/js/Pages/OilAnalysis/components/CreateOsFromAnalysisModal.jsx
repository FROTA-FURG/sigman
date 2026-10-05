import React, { useEffect, useState } from 'react';
import BrDateField from '@/Components/BrDateField';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import MaintenanceYearCalendar from '@/Components/MaintenanceYearCalendar';
import BadgeCondicao from './BadgeCondicao';
import { diasEntre, formatarData, hojeIso, parametrosEmAlerta } from '../lib/classificacao';
import { STATUS_OS, TIPO_OS, dataAlvoOs, osPendente } from '../lib/vinculoSistema';

/*
 * Abre uma OS a partir da análise do equipamento, pelo mesmo endpoint da
 * tela de OS (work-orders.store). A descrição já sai montada com a amostra,
 * os parâmetros fora do limite e a ação da equipe.
 *
 * No topo, o calendário anual de OS do equipamento (com o plano de cruzeiro
 * da embarcação) e, ao lado, a tabela das OS pendentes/futuras: às vezes vale
 * mais adiantar a próxima do que abrir outra. Passar o cursor numa linha faz
 * o dia dela piscar no calendário.
 */

const COR_TIPO = { preventive: 'bg-blue-500', corrective: 'bg-red-500', predictive: 'bg-emerald-500' };

const PRIORIDADE_POR_CONDICAO = { Intervir: 'high', 'Atenção': 'medium', Normal: 'low' };

function descricaoInicial(equipamento, amostra, condicao, familia) {
    if (!amostra) return `Análise de óleo — ${equipamento.nome}.`;
    const alertas = parametrosEmAlerta(amostra, familia, equipamento.limites);
    const linhas = [
        `Análise de óleo — amostra nº ${amostra.numero} de ${formatarData(amostra.dataColeta)}${amostra.laboratorio ? ` (${amostra.laboratorio})` : ''}: condição ${condicao || 'não informada'}.`,
    ];
    if (alertas.length) linhas.push(`Fora do limite: ${alertas.join('; ')}.`);
    if (amostra.acaoEquipe) linhas.push(`Ação: ${amostra.acaoEquipe}`);
    else if (amostra.parecerLaboratorio) linhas.push(`Parecer do laboratório: ${amostra.parecerLaboratorio}`);
    return linhas.join('\n');
}

const inputCls = 'w-full rounded-md border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400';

export default function CreateOsFromAnalysisModal({ aberto, onClose, onCriada, equipamento, familia, vinculo, amostra, condicao, ordens, urlRetorno, planoCruzeiro = [] }) {
    const [form, setForm] = useState(null);
    // OS sob o cursor: a linha destaca só ela (várias OS podem cair no mesmo
    // dia), e o calendário pisca o dia dela.
    const [osSobCursor, setOsSobCursor] = useState(null);
    const destaque = osSobCursor ? dataAlvoOs(osSobCursor) : null;
    const [enviando, setEnviando] = useState(false);
    const [erros, setErros] = useState({});

    useEffect(() => {
        if (!aberto || !equipamento) return;
        setForm({
            description: descricaoInicial(equipamento, amostra, condicao, familia),
            maintenance_type: 'predictive',
            priority: PRIORIDADE_POR_CONDICAO[condicao] || 'medium',
            created_at: hojeIso(),
        });
        setErros({});
    }, [aberto, equipamento?.id, amostra]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!aberto) return;
        const onKey = (e) => e.key === 'Escape' && !enviando && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [aberto, enviando, onClose]);

    if (!aberto || !form || !vinculo) return null;

    const hoje = hojeIso();
    const pendentes = ordens.filter(osPendente).sort((a, b) => dataAlvoOs(a).localeCompare(dataAlvoOs(b)));
    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

    const enviar = () => {
        setEnviando(true);
        router.post(route('work-orders.store'), {
            equipment_id: vinculo.id,
            description: form.description,
            maintenance_type: form.maintenance_type,
            priority: form.priority,
            status: 'open',
            in_52_week_plan: false,
            created_at: form.created_at,
            voltar: true,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => onCriada(),
            onError: (e) => setErros(e),
            onFinish: () => setEnviando(false),
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => !enviando && onClose()}>
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b203c] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex shrink-0 items-start justify-between border-b border-slate-800 px-5 py-3">
                    <div>
                        <h3 className="text-base font-bold text-white">Gerar OS a partir da análise</h3>
                        <p className="text-xs text-slate-400">
                            <span className="font-mono text-slate-300">{vinculo.tag_number}</span> — {vinculo.name}
                        </p>
                    </div>
                    <BadgeCondicao condicao={condicao} />
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {/* Calendário do equipamento (esq.) x OS pendentes/futuras (dir.) */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                        <MaintenanceYearCalendar
                            workOrders={ordens}
                            cruisePeriods={planoCruzeiro}
                            destaque={destaque}
                            backUrl={urlRetorno}
                            compacto
                            emptyLabel="Nenhuma OS deste equipamento"
                        />

                        {/* No xl a coluna é posicionada sobre a célula do grid: a altura da linha
                            vem só do calendário, e a tabela rola dentro dessa altura. */}
                        <div className="relative min-h-[320px]">
                        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0b203c]/90 xl:absolute xl:inset-0">
                            <div className="border-b border-slate-800 px-4 py-3">
                                <h4 className="text-sm font-semibold text-white">
                                    OS pendentes e futuras
                                    <span className="ml-2 rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-200">{pendentes.length}</span>
                                </h4>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    {pendentes.length
                                        ? 'Vale adiantar uma destas em vez de abrir outra? Passe o cursor para ver o dia no calendário; clique para abrir a OS.'
                                        : 'Nenhuma OS pendente para este equipamento.'}
                                </p>
                            </div>
                            {pendentes.length > 0 && (
                                <div className="max-h-[460px] min-h-0 flex-1 overflow-auto xl:max-h-none" onMouseLeave={() => setOsSobCursor(null)}>
                                    <table className="min-w-full text-xs">
                                        <thead className="sticky top-0 z-10 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="px-3 py-2 text-left">OS</th>
                                                <th className="px-3 py-2 text-left">Data prevista</th>
                                                <th className="px-3 py-2 text-left">Tipo</th>
                                                <th className="px-3 py-2 text-left">Status</th>
                                                <th className="px-3 py-2 text-left">Descrição</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/70">
                                            {pendentes.map((os) => {
                                                const data = dataAlvoOs(os);
                                                const dias = data ? diasEntre(hoje, data) : null;
                                                const st = STATUS_OS[os.status] || STATUS_OS.open;
                                                const ativa = osSobCursor?.id === os.id;
                                                return (
                                                    <tr
                                                        key={os.id}
                                                        onMouseEnter={() => setOsSobCursor(os)}
                                                        onClick={() => router.visit(route('work-orders.show', { work_order: os.id, back: urlRetorno }))}
                                                        className={`cursor-pointer align-top transition-colors ${ativa ? 'bg-amber-400/10' : 'hover:bg-slate-800/50'}`}
                                                    >
                                                        <td className={`whitespace-nowrap px-3 py-2 font-mono font-bold text-white ${ativa ? 'shadow-[inset_3px_0_0_#fbbf24]' : ''}`}>{os.os_number}</td>
                                                        <td className="whitespace-nowrap px-3 py-2">
                                                            <p className="text-slate-200">{formatarData(data)}</p>
                                                            {dias !== null && (
                                                                <p className={`text-[10px] font-semibold ${dias < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                                    {dias < 0 ? `atrasada ${-dias} d` : dias === 0 ? 'hoje' : `em ${dias} d`}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className={`h-1.5 w-1.5 rounded-full ${COR_TIPO[os.maintenance_type] || 'bg-slate-500'}`} />
                                                                {TIPO_OS[os.maintenance_type] || os.maintenance_type}
                                                            </span>
                                                            {os.in_52_week_plan && <span className="text-[10px] text-sky-300">Plano 52 sem.</span>}
                                                        </td>
                                                        <td className="whitespace-nowrap px-3 py-2">
                                                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${st.cls}`}>{st.rot}</span>
                                                        </td>
                                                        <td className="max-w-[220px] px-3 py-2 text-slate-400">
                                                            <span className="line-clamp-2" title={os.description}>{os.description}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>

                    <label className="block">
                        <span className={labelCls}>Descrição *</span>
                        <textarea rows={7} value={form.description} onChange={set('description')} className={`${inputCls} resize-y leading-relaxed`} />
                        {erros.description && <span className="mt-1 block text-xs text-red-400">{erros.description}</span>}
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="block">
                            <span className={labelCls}>Tipo</span>
                            <select value={form.maintenance_type} onChange={set('maintenance_type')} className={inputCls}>
                                <option value="predictive">Preditiva</option>
                                <option value="corrective">Corretiva</option>
                                <option value="preventive">Preventiva</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className={labelCls}>Prioridade</span>
                            <select value={form.priority} onChange={set('priority')} className={inputCls}>
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className={labelCls}>Data prevista *</span>
                            <BrDateField value={form.created_at} onChange={(v) => setForm((f) => ({ ...f, created_at: v }))} />
                            {erros.created_at && <span className="mt-1 block text-xs text-red-400">{erros.created_at}</span>}
                        </label>
                    </div>

                    {Object.keys(erros).length > 0 && !erros.description && !erros.created_at && (
                        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                            Não foi possível criar a OS: {Object.values(erros).join(' ')}
                        </p>
                    )}
                    {/* Ações no fim do conteúdo (não num rodapé fixo): sobra mais altura pro calendário e a tabela. */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                        <p className="text-[11px] text-slate-500">A OS entra como <span className="text-slate-300">Aberta</span> e segue o fluxo normal de aprovação e disparo da tela de Ordens de Serviço.</p>
                        <div className="flex gap-2">
                            <button onClick={onClose} disabled={enviando} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800">Cancelar</button>
                            <button onClick={enviar} disabled={enviando || !form.description.trim() || !form.created_at}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
                                {enviando ? 'Gerando...' : 'Gerar OS'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
