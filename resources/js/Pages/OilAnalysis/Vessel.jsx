import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import StyledTooltips from '@/Components/StyledTooltips';
import AnalysesTab from './components/AnalysesTab';
import ActionPlanTab from './components/ActionPlanTab';
import NewAnalysisModal from './components/NewAnalysisModal';
import SubmitReportsModal from './components/SubmitReportsModal';
import ActionPlanFromSampleModal from './components/ActionPlanFromSampleModal';
import CreateOsFromAnalysisModal from './components/CreateOsFromAnalysisModal';
import { montarEquipamentos } from './lib/dados';
import { condicaoDaAmostra } from './lib/classificacao';

/*
 * Análise de Óleo de uma embarcação: Plano de Ação (aba inicial) e Análises.
 *
 * Tudo vem do OilAnalysisController e é gravado no banco: análises (manual ou
 * com PDF), parecer/ação da equipe, itens do plano de ação, laudos submetidos
 * e OS (pelo endpoint da tela de OS). Depois de cada gravação o Inertia
 * recarrega as props, preservando aba, equipamento e rolagem.
 */

/*
 * Aba, equipamento e modal de OS ficam espelhados na URL (?aba=&equipamento=&acao=).
 * Assim, ao abrir uma OS a partir daqui e voltar (botão Voltar da OS ou do
 * navegador), a tela reabre exatamente onde estava -- inclusive com o modal.
 */
function lerUrl() {
    if (typeof window === 'undefined') return {};
    const q = new URLSearchParams(window.location.search);
    return { aba: q.get('aba'), equipamento: q.get('equipamento'), acao: q.get('acao') };
}

const selectCls = 'w-full rounded-md border-slate-700 bg-slate-900 py-2 pl-3 pr-8 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

export default function Vessel({
    familias = {}, vesselTag, embarcacao, pontos = [], plano = [], historico = [], laudosSubmetidos = [],
    sistemaEquipamentos = [], ordensServico = [], planoCruzeiro = [],
}) {
    const inicial = useMemo(() => {
        const u = lerUrl();
        const valido = pontos.some((e) => e.id === u.equipamento);
        return {
            aba: u.aba === 'analises' || valido ? 'analises' : 'plano',
            equipamento: valido ? u.equipamento : '',
            acao: valido && u.acao === 'os' ? 'os' : null,
        };
    }, [vesselTag]);

    const [aba, setAba] = useState(inicial.aba);
    const [equipamentoId, setEquipamentoId] = useState(inicial.equipamento);
    const [modal, setModal] = useState(null); // 'manual' | 'pdf' | null
    const [submeterAberto, setSubmeterAberto] = useState(false);
    const [acao, setAcao] = useState(inicial.acao); // 'plano' | 'os' | null
    const [aviso, setAviso] = useState(null);

    const equipamentos = useMemo(() => montarEquipamentos(pontos, familias), [pontos, familias]);
    const equipamentosPorId = useMemo(() => Object.fromEntries(equipamentos.map((e) => [e.id, e])), [equipamentos]);
    const daEmbarcacao = equipamentos;
    const equipamento = equipamentoId ? equipamentosPorId[equipamentoId] : null;
    const familia = equipamento ? familias[equipamento.familia] : null;
    const condicaoUltima = equipamento?.ultima ? condicaoDaAmostra(equipamento.ultima, familia, equipamento.limites) : null;
    // Vínculo com o cadastro do sistema: gravado no ponto de coleta.
    const vinculo = useMemo(
        () => (equipamento?.equipmentId ? sistemaEquipamentos.find((e) => e.id === equipamento.equipmentId) || null : null),
        [equipamento, sistemaEquipamentos],
    );
    const ordensDoEquipamento = useMemo(
        () => (vinculo ? ordensServico.filter((o) => o.equipment_id === vinculo.id) : []),
        [vinculo, ordensServico],
    );
    const itemPlanoAtual = equipamento ? plano.find((i) => i.equipamentoId === equipamento.id) : null;

    // Espelha o estado na URL sem criar entrada no histórico. Mantém o
    // history.state do Inertia, só troca o endereço.
    const urlAtual = useMemo(() => {
        const q = new URLSearchParams();
        if (aba !== 'plano') q.set('aba', aba);
        if (equipamentoId) q.set('equipamento', equipamentoId);
        if (acao === 'os') q.set('acao', 'os');
        const busca = q.toString();
        return `/oil-analysis/${vesselTag}${busca ? `?${busca}` : ''}`;
    }, [aba, equipamentoId, acao, vesselTag]);

    useEffect(() => {
        if (`${window.location.pathname}${window.location.search}` !== urlAtual) {
            window.history.replaceState(window.history.state, '', urlAtual);
        }
    }, [urlAtual]);

    const mostrarAviso = (texto) => {
        setAviso(texto);
        setTimeout(() => setAviso(null), 5000);
    };

    const abrirEquipamento = (id) => {
        setEquipamentoId(id);
        setAba('analises');
    };

    const anotarAmostra = (amostra, campos, { onSuccess, onError } = {}) => {
        router.patch(route('oil-analysis.samples.notes', amostra.id), campos, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => { mostrarAviso('Parecer e ação da equipe salvos.'); onSuccess?.(); },
            onError,
        });
    };

    const proximoNumero = (equipamento?.amostras.reduce((m, a) => Math.max(m, a.numero || 0), 0) || 0) + 1;

    return (
        <SIGMANLayout>
            <Head title={`Análise de Óleo · ${embarcacao?.nome} | SIGMAN`} />
            <StyledTooltips />

            {equipamento && (
                <NewAnalysisModal
                    aberto={!!modal}
                    modo={modal}
                    onClose={() => setModal(null)}
                    onSalvo={() => { setModal(null); mostrarAviso('Análise registrada.'); }}
                    equipamento={equipamento}
                    familia={familias[equipamento.familia]}
                    embarcacao={embarcacao}
                    proximoNumero={proximoNumero}
                    ultimaAmostra={equipamento.ultima}
                />
            )}
            {equipamento && (
                <>
                    <ActionPlanFromSampleModal
                        aberto={acao === 'plano'}
                        onClose={() => setAcao(null)}
                        onSalvo={() => { setAcao(null); mostrarAviso('Plano de ação gerado. O item anterior foi para o histórico.'); }}
                        equipamento={equipamento}
                        familia={familia}
                        amostra={equipamento.ultima}
                        condicao={condicaoUltima}
                        itemAtual={itemPlanoAtual}
                    />
                    <CreateOsFromAnalysisModal
                        aberto={acao === 'os'}
                        onClose={() => setAcao(null)}
                        onCriada={() => { setAcao(null); mostrarAviso('Ordem de Serviço criada. Ela já aparece em Manutenções do equipamento.'); }}
                        equipamento={equipamento}
                        familia={familia}
                        vinculo={vinculo}
                        amostra={equipamento.ultima}
                        condicao={condicaoUltima}
                        ordens={ordensDoEquipamento}
                        urlRetorno={urlAtual}
                        planoCruzeiro={planoCruzeiro}
                    />
                </>
            )}
            <SubmitReportsModal aberto={submeterAberto} onClose={() => setSubmeterAberto(false)} embarcacao={embarcacao} laudos={laudosSubmetidos} />

            <div className="space-y-5 pb-6">
                <div className="border-b border-slate-800 pb-4">
                    <Link href={route('oil-analysis.index')} className="inline-flex items-center text-xs font-medium text-slate-400 transition hover:text-white">
                        <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Análise de Óleo
                    </Link>
                    <div className="mt-1 flex items-center gap-3">
                        <h2 className="text-xl font-bold leading-tight text-white">{embarcacao?.nome}</h2>
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-slate-300 ring-1 ring-slate-700">{vesselTag}</span>
                    </div>
                </div>

                {aviso && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {aviso}
                    </div>
                )}

                {/* Abas + Submeter Laudos na mesma linha */}
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800">
                    <div className="flex gap-1">
                        {[['plano', 'Plano de Ação', plano.length], ['analises', 'Análises', daEmbarcacao.length]].map(([k, rot, qtd]) => (
                            <button
                                key={k}
                                onClick={() => setAba(k)}
                                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${aba === k ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                            >
                                {rot}
                                <span className="ml-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">{qtd}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setSubmeterAberto(true)}
                        className="mb-2 flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Submeter Laudos
                    </button>
                </div>

                {aba === 'plano' ? (
                    <ActionPlanTab
                        plano={plano}
                        historico={historico}
                        equipamentosPorId={equipamentosPorId}
                        equipamentosDaEmbarcacao={daEmbarcacao}
                        onAbrirEquipamento={abrirEquipamento}
                    />
                ) : (
                    <div className="space-y-5">
                        <label className="block max-w-2xl">
                            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Setor / Equipamento</span>
                            <select value={equipamentoId} onChange={(e) => setEquipamentoId(e.target.value)} className={selectCls}>
                                <option value="">Visão geral da embarcação ({daEmbarcacao.length} equipamentos)</option>
                                {Object.entries(familias).map(([k, f]) => {
                                    const itens = daEmbarcacao.filter((e) => e.familia === k);
                                    if (!itens.length) return null;
                                    return (
                                        <optgroup key={k} label={f.rotulo}>
                                            {itens.map((e) => (
                                                <option key={e.id} value={e.id}>{vesselTag} {e.nome} — Tag(antiga): {e.tag}</option>
                                            ))}
                                        </optgroup>
                                    );
                                })}
                            </select>
                        </label>

                        <AnalysesTab
                            equipamento={equipamento}
                            equipamentosDaEmbarcacao={daEmbarcacao}
                            familias={familias}
                            onSelecionar={setEquipamentoId}
                            onNovaManual={() => setModal('manual')}
                            onNovaPdf={() => setModal('pdf')}
                            vinculo={vinculo}
                            ordens={ordensDoEquipamento}
                            onAnotar={anotarAmostra}
                            onGerarPlano={() => setAcao('plano')}
                            onGerarOs={() => setAcao('os')}
                            urlRetorno={urlAtual}
                        />
                    </div>
                )}
            </div>
        </SIGMANLayout>
    );
}
