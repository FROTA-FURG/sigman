import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import WeekPickerModal from './WeekPickerModal';
import { formatWeekRange } from '@/utils/weeks';

const formatOsDate = (value) => {
    if (!value) return '—';
    const [datePart] = value.split('T');
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
};

/**
 * Cria uma Janela de Execução: passo 1 escolhe o período (reaproveita o
 * WeekPickerModal já usado no resto do sistema -- semana única ou
 * intervalo -- com o plano de cruzeiro sobreposto pra ver quando a
 * embarcação está disponível), passo 2 escolhe quais OS entram, com os
 * cartões de capacidade (mesmas contas da aba Andamento) atualizando ao vivo.
 */
export default function CreateExecutionWindowModal({ isOpen, onClose, vessel, workOrders = [], cruisePeriods = [] }) {
    const [step, setStep] = useState(1);
    const [rangeStart, setRangeStart] = useState(null); // segunda da 1ª semana
    const [rangeEnd, setRangeEnd] = useState(null);     // domingo da última semana
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [processing, setProcessing] = useState(false);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const [filtroPrazo, setFiltroPrazo] = useState('todas'); // 'todas' | 'atrasadas' | 'no_prazo'
    const [filtroDataInicio, setFiltroDataInicio] = useState(null); // filtra as candidatas por data prevista
    const [filtroDataFim, setFiltroDataFim] = useState(null);
    const [isFiltroCalendarioAberto, setIsFiltroCalendarioAberto] = useState(false);

    const resetAndClose = () => {
        setStep(1);
        setRangeStart(null);
        setRangeEnd(null);
        setSelectedIds(new Set());
        setErro(null);
        setBusca('');
        setFiltroPrazo('todas');
        setFiltroDataInicio(null);
        setFiltroDataFim(null);
        onClose();
    };

    const aplicarFiltroData = (start, end) => {
        setFiltroDataInicio(start);
        setFiltroDataFim(end);
        setIsFiltroCalendarioAberto(false);
    };

    const limparFiltroData = () => {
        setFiltroDataInicio(null);
        setFiltroDataFim(null);
    };

    const handleApplyRange = (start, end) => {
        setRangeStart(start);
        setRangeEnd(end);
        setStep(2);
    };

    const weeksMultiplier = useMemo(() => {
        if (!rangeStart || !rangeEnd) return 0;
        const diffDays = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
        return Math.max(1, Math.ceil(diffDays / 7));
    }, [rangeStart, rangeEnd]);

    // Candidatas: OS dessa embarcação ainda não iniciadas (aberta/agendada) --
    // são as que fazem sentido puxar pra uma janela de execução.
    const candidatas = useMemo(() => {
        if (!vessel) return [];
        return workOrders
            .filter(os => os.equipment?.vessel?.tag === vessel.tag)
            .filter(os => os.status === 'open' || os.status === 'scheduled')
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }, [workOrders, vessel]);

    // Hoje em yyyy-mm-dd no fuso local, sem passar por Date+conversão UTC
    // (mesmo cuidado do resto do sistema com created_at).
    const hojeISO = useMemo(() => {
        const agora = new Date();
        return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    }, []);

    // yyyy-mm-dd do filtro de período, pra comparar como string junto com o
    // resto da data (mesmo cuidado de sempre com created_at e fuso).
    const filtroDataInicioISO = useMemo(() => {
        if (!filtroDataInicio) return null;
        return `${filtroDataInicio.getFullYear()}-${String(filtroDataInicio.getMonth() + 1).padStart(2, '0')}-${String(filtroDataInicio.getDate()).padStart(2, '0')}`;
    }, [filtroDataInicio]);
    const filtroDataFimISO = useMemo(() => {
        if (!filtroDataFim) return null;
        return `${filtroDataFim.getFullYear()}-${String(filtroDataFim.getMonth() + 1).padStart(2, '0')}-${String(filtroDataFim.getDate()).padStart(2, '0')}`;
    }, [filtroDataFim]);

    const candidatasFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return candidatas
            .map(os => ({ os, atrasada: os.created_at && os.created_at.split('T')[0] < hojeISO }))
            .filter(({ atrasada }) => {
                if (filtroPrazo === 'atrasadas') return atrasada;
                if (filtroPrazo === 'no_prazo') return !atrasada;
                return true;
            })
            .filter(({ os }) => {
                if (!filtroDataInicioISO || !filtroDataFimISO || !os.created_at) return true;
                const dataOs = os.created_at.split('T')[0];
                return dataOs >= filtroDataInicioISO && dataOs <= filtroDataFimISO;
            })
            .filter(({ os }) => {
                if (!termo) return true;
                return (
                    os.os_number?.toLowerCase().includes(termo) ||
                    os.description?.toLowerCase().includes(termo) ||
                    os.tag_number?.toLowerCase().includes(termo)
                );
            });
    }, [candidatas, busca, hojeISO, filtroPrazo, filtroDataInicioISO, filtroDataFimISO]);

    const toggleOs = (id) => {
        setSelectedIds(prev => {
            const novo = new Set(prev);
            if (novo.has(id)) novo.delete(id); else novo.add(id);
            return novo;
        });
    };

    // "Selecionar todas" pega só o que está visível com os filtros atuais,
    // não a lista inteira de candidatas -- mesma ideia do checkbox de
    // cabeçalho da tabela de Andamento.
    const idsFiltradosVisiveis = candidatasFiltradas.map(({ os }) => os.id);
    const todasVisiveisSelecionadas = idsFiltradosVisiveis.length > 0 && idsFiltradosVisiveis.every(id => selectedIds.has(id));

    const toggleSelecionarTodas = () => {
        setSelectedIds(prev => {
            const novo = new Set(prev);
            if (todasVisiveisSelecionadas) {
                idsFiltradosVisiveis.forEach(id => novo.delete(id));
            } else {
                idsFiltradosVisiveis.forEach(id => novo.add(id));
            }
            return novo;
        });
    };

    const selecionadas = candidatas.filter(os => selectedIds.has(os.id));
    const necessarioTotal = selecionadas.reduce((sum, os) => sum + (Number(os.estimated_hours) || 0), 0);
    const disponivelEquipe = (44 * 0.75) * weeksMultiplier;
    const dispPreventiva = 0.6 * disponivelEquipe;
    const dispTripulacao = 30 * weeksMultiplier;
    const capacidadeSemanalEquipe = 44 * 0.75;
    const backlog = capacidadeSemanalEquipe > 0 ? (necessarioTotal / capacidadeSemanalEquipe) : 0;

    const criar = () => {
        setProcessing(true);
        setErro(null);
        router.post(route('execution-windows.store'), {
            vessel_id: vessel.vesselId,
            start_date: rangeStart.toISOString().slice(0, 10),
            end_date: rangeEnd.toISOString().slice(0, 10),
            work_order_ids: [...selectedIds],
        }, {
            onSuccess: () => resetAndClose(),
            onError: (errors) => setErro(Object.values(errors)[0] || 'Não foi possível criar a Janela de Execução.'),
            onFinish: () => setProcessing(false),
        });
    };

    if (!isOpen || !vessel) return null;

    // Passo 1: reaproveita o seletor de semana já usado no resto do sistema
    // (semana única ou intervalo), com o plano de cruzeiro sobreposto.
    if (step === 1) {
        return (
            <WeekPickerModal
                isOpen={true}
                onClose={resetAndClose}
                onApply={handleApplyRange}
                onClear={() => { setRangeStart(null); setRangeEnd(null); }}
                cruisePeriods={cruisePeriods}
            />
        );
    }

    const FILTROS_PRAZO = [
        { value: 'todas', label: 'Todas' },
        { value: 'atrasadas', label: 'Atrasadas' },
        { value: 'no_prazo', label: 'No Prazo' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">

                <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-white">Criar Janela de Execução</h3>
                        <p className="text-xs text-slate-500">{vessel.name} · Passo 2: quais OS entram</p>
                    </div>
                    <button onClick={resetAndClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                        {[
                            { title: 'Necessário Total', value: necessarioTotal.toFixed(1), highlight: true },
                            { title: `Disponível Equipe`, value: disponivelEquipe.toFixed(1) },
                            { title: `Disp. Preventiva`, value: dispPreventiva.toFixed(1) },
                            { title: `Disp. Tripulação`, value: dispTripulacao.toFixed(1) },
                        ].map(c => (
                            <div key={c.title} className="flex flex-col justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 p-3">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate" title={c.title}>{c.title}</span>
                                <div className="mt-1 flex items-baseline gap-1">
                                    <span className={`text-lg font-bold leading-none ${c.highlight ? 'text-blue-400' : 'text-white'}`}>{c.value}</span>
                                    <span className="text-[10px] font-medium text-slate-500">Hh</span>
                                </div>
                            </div>
                        ))}
                        <div className="flex flex-col justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 p-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Em Backlog</span>
                            <div className="mt-1 flex items-baseline gap-1">
                                <span className={`text-lg font-bold leading-none ${backlog > 1 ? 'text-orange-400' : 'text-white'}`}>{backlog.toFixed(2)}</span>
                                <span className="text-[10px] font-medium text-slate-500">Semanas</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500">{selectedIds.size} de {candidatas.length} OS selecionada(s) -- só mostra OS abertas ou agendadas dessa embarcação.</p>
                        {candidatasFiltradas.length > 0 && (
                            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={todasVisiveisSelecionadas}
                                    onChange={toggleSelecionarTodas}
                                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                                />
                                Selecionar todas ({candidatasFiltradas.length})
                            </label>
                        )}
                    </div>

                    {candidatas.length > 0 && (
                        <div className="mb-3 space-y-2">
                            <div className="relative">
                                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input
                                    type="text"
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    placeholder="Buscar por número da OS, descrição ou TAG..."
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    {FILTROS_PRAZO.map(f => (
                                        <button
                                            key={f.value}
                                            type="button"
                                            onClick={() => setFiltroPrazo(f.value)}
                                            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${filtroPrazo === f.value ? 'border-blue-500/50 bg-blue-600/20 text-blue-300' : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsFiltroCalendarioAberto(true)}
                                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11px] font-bold transition ${filtroDataInicio ? 'border-blue-500/50 bg-blue-600/20 text-blue-300' : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'}`}
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {filtroDataInicio ? formatWeekRange(filtroDataInicio, filtroDataFim) : 'Filtrar por período'}
                                    </button>
                                    {filtroDataInicio && (
                                        <button type="button" onClick={limparFiltroData} title="Limpar período" className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-white">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <WeekPickerModal
                        isOpen={isFiltroCalendarioAberto}
                        onClose={() => setIsFiltroCalendarioAberto(false)}
                        onApply={aplicarFiltroData}
                        onClear={limparFiltroData}
                    />

                    {candidatas.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Nenhuma OS aberta/agendada para {vessel.name} no momento.</p>
                    ) : candidatasFiltradas.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Nenhuma OS encontrada com esse filtro.</p>
                    ) : (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                            {candidatasFiltradas.map(({ os, atrasada }) => (
                                <label key={os.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selectedIds.has(os.id) ? 'border-blue-500/50 bg-blue-600/10' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'}`}>
                                    <input type="checkbox" checked={selectedIds.has(os.id)} onChange={() => toggleOs(os.id)} className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500" />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-slate-300">#{os.os_number}</span>
                                            {os.tag_number && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">{os.tag_number}</span>}
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${atrasada ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
                                                {atrasada ? 'Atrasada' : 'No Prazo'}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{os.estimated_hours ? `${os.estimated_hours}h` : 'sem estimativa'}</span>
                                        </span>
                                        <span className="block truncate text-xs text-slate-400">{os.description}</span>
                                    </span>
                                    <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">{formatOsDate(os.created_at)}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {erro && <p className="mt-4 text-xs font-medium text-red-400">{erro}</p>}
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 px-6 py-4">
                    <button onClick={resetAndClose} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800">Cancelar</button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setStep(1)} type="button" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Voltar</button>
                        <button onClick={criar} disabled={processing} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500">
                            {processing ? 'Criando...' : 'Criar Janela'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
