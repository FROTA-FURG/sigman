import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { getMonday, getISOWeek, formatBr } from '@/utils/weeks';

const HACHURA_CRUZEIRO = {
    backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.35) 0px, rgba(148,163,184,0.35) 2px, transparent 2px, transparent 6px)',
};

/** Chave "YYYY-M-D" (mês 0-indexado) pra bater com o Set de dias em cruzeiro. */
const chaveDia = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function buildMonthGrid(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

/**
 * Cria uma Janela de Execução: passo 1 escolhe o período (intervalo de
 * semanas, com o plano de cruzeiro sobreposto pra ver quando a embarcação
 * está disponível), passo 2 escolhe quais OS entram, com os cartões de
 * capacidade (mesmas contas da aba Andamento) atualizando ao vivo.
 */
export default function CreateExecutionWindowModal({ isOpen, onClose, vessel, workOrders = [], cruisePeriods = [] }) {
    const [step, setStep] = useState(1);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [hoveredWeek, setHoveredWeek] = useState(null);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [mostrarCruzeiro, setMostrarCruzeiro] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');

    const resetAndClose = () => {
        setStep(1);
        setRangeStart(null);
        setRangeEnd(null);
        setSelectedIds(new Set());
        setErro(null);
        onClose();
    };

    const diasEmCruzeiro = useMemo(() => {
        const set = new Set();
        if (!mostrarCruzeiro) return set;
        for (const periodo of cruisePeriods) {
            if (!periodo?.inicio || !periodo?.fim) continue;
            const [ys, ms, ds] = periodo.inicio.split('-').map(Number);
            const [ye, me, de] = periodo.fim.split('-').map(Number);
            const cursor = new Date(ys, ms - 1, ds);
            const fim = new Date(ye, me - 1, de);
            while (cursor <= fim) {
                set.add(chaveDia(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
        }
        return set;
    }, [cruisePeriods, mostrarCruzeiro]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
    const mondayOf = (dayNumber) => getMonday(new Date(year, month, dayNumber));

    const handleSelectWeek = (dayNumber) => {
        const monday = mondayOf(dayNumber);
        if (!rangeStart || rangeEnd || monday < rangeStart) {
            setRangeStart(monday);
            setRangeEnd(null);
            return;
        }
        setRangeEnd(monday);
    };

    // Fim real do período = domingo da última semana marcada.
    const endDate = useMemo(() => {
        const base = rangeEnd ?? rangeStart;
        if (!base) return null;
        const d = new Date(base);
        d.setDate(d.getDate() + 6);
        return d;
    }, [rangeStart, rangeEnd]);

    const weeksMultiplier = useMemo(() => {
        if (!rangeStart || !endDate) return 0;
        const diffDays = Math.round((endDate - rangeStart) / 86400000) + 1;
        return Math.max(1, Math.ceil(diffDays / 7));
    }, [rangeStart, endDate]);

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

    const candidatasFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return candidatas
            .map(os => ({ os, atrasada: os.created_at && os.created_at.split('T')[0] < hojeISO }))
            .filter(({ os }) => {
                if (!termo) return true;
                return (
                    os.os_number?.toLowerCase().includes(termo) ||
                    os.description?.toLowerCase().includes(termo) ||
                    os.tag_number?.toLowerCase().includes(termo)
                );
            });
    }, [candidatas, busca, hojeISO]);

    const toggleOs = (id) => {
        setSelectedIds(prev => {
            const novo = new Set(prev);
            if (novo.has(id)) novo.delete(id); else novo.add(id);
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

    const formatDate = (d) => (d ? formatBr(d) : '—');

    const irParaSelecaoDeOS = () => {
        if (!rangeStart) return;
        setStep(2);
    };

    const criar = () => {
        setProcessing(true);
        setErro(null);
        router.post(route('execution-windows.store'), {
            vessel_id: vessel.vesselId,
            start_date: rangeStart.toISOString().slice(0, 10),
            end_date: endDate.toISOString().slice(0, 10),
            work_order_ids: [...selectedIds],
        }, {
            onSuccess: () => resetAndClose(),
            onError: (errors) => setErro(Object.values(errors)[0] || 'Não foi possível criar a Janela de Execução.'),
            onFinish: () => setProcessing(false),
        });
    };

    if (!isOpen || !vessel) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">

                <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-white">Criar Janela de Execução</h3>
                        <p className="text-xs text-slate-500">{vessel.name} · {step === 1 ? 'Passo 1: período' : 'Passo 2: quais OS entram'}</p>
                    </div>
                    <button onClick={resetAndClose} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <>
                            {cruisePeriods.length > 0 && (
                                <label className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                                    <input type="checkbox" checked={mostrarCruzeiro} onChange={e => setMostrarCruzeiro(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500" />
                                    Mostrar plano de cruzeiro (dias hachurados = embarcação indisponível)
                                </label>
                            )}

                            <div className="flex items-center justify-between mb-3">
                                <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h4 className="text-sm font-bold text-white capitalize">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4>
                                <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-8 gap-1 text-center mb-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Sem</div>
                                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                                    <div key={day} className="text-xs font-semibold text-slate-500">{day}</div>
                                ))}
                            </div>

                            <div className="space-y-1">
                                {weeks.map((week, weekIndex) => {
                                    const validDay = week.find(d => d !== null);
                                    if (!validDay) return null;

                                    const monday = mondayOf(validDay);
                                    const weekKey = monday.getTime();
                                    const weekNumber = getISOWeek(monday);
                                    const isHovered = hoveredWeek === weekKey;
                                    const isRangeEdge = (rangeStart && weekKey === rangeStart.getTime()) || (rangeEnd && weekKey === rangeEnd.getTime());
                                    const isInRange = rangeStart && rangeEnd && monday >= rangeStart && monday <= rangeEnd;
                                    const highlight = isRangeEdge ? 'bg-blue-600/40 ring-1 ring-blue-400' : isInRange ? 'bg-blue-600/20 ring-1 ring-blue-500/40' : isHovered ? 'bg-blue-600/20 ring-1 ring-blue-500/50' : 'hover:bg-slate-800';

                                    return (
                                        <div
                                            key={weekIndex}
                                            className={`grid grid-cols-8 gap-1 rounded-lg cursor-pointer transition-colors ${highlight}`}
                                            onMouseEnter={() => setHoveredWeek(weekKey)}
                                            onMouseLeave={() => setHoveredWeek(null)}
                                            onClick={() => handleSelectWeek(validDay)}
                                        >
                                            <div className={`py-2 text-center text-xs font-bold tabular-nums ${isRangeEdge || isInRange || isHovered ? 'text-blue-300' : 'text-slate-500'}`}>
                                                {weekNumber}
                                            </div>
                                            {week.map((day, dayIndex) => {
                                                const emCruzeiro = day ? diasEmCruzeiro.has(chaveDia(new Date(year, month, day))) : false;
                                                return (
                                                    <div
                                                        key={dayIndex}
                                                        style={emCruzeiro ? HACHURA_CRUZEIRO : undefined}
                                                        title={emCruzeiro ? 'Embarcação em cruzeiro' : undefined}
                                                        className={`rounded py-2 text-sm font-medium text-center tabular-nums ${day ? (isRangeEdge || isInRange || isHovered ? 'text-blue-300' : 'text-slate-300') : ''}`}
                                                    >
                                                        {day || ''}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="mt-4 text-xs font-medium text-blue-400">
                                {rangeStart
                                    ? `Selecionado: ${formatDate(rangeStart)} à ${formatDate(endDate)} (${weeksMultiplier} semana${weeksMultiplier > 1 ? 's' : ''})`
                                    : 'Clique numa semana pra começar, depois na semana final.'}
                            </p>
                        </>
                    )}

                    {step === 2 && (
                        <>
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

                            <p className="mb-2 text-xs text-slate-500">{selectedIds.size} de {candidatas.length} OS selecionada(s) -- só mostra OS abertas ou agendadas dessa embarcação.</p>

                            {candidatas.length > 0 && (
                                <div className="relative mb-3">
                                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <input
                                        type="text"
                                        value={busca}
                                        onChange={(e) => setBusca(e.target.value)}
                                        placeholder="Buscar por número da OS, descrição ou TAG..."
                                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {candidatas.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Nenhuma OS aberta/agendada para {vessel.name} no momento.</p>
                            ) : candidatasFiltradas.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Nenhuma OS encontrada para "{busca}".</p>
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
                                        </label>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {erro && <p className="mt-4 text-xs font-medium text-red-400">{erro}</p>}
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-slate-700/50 px-6 py-4">
                    <button onClick={resetAndClose} type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800">Cancelar</button>
                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <button onClick={() => setStep(1)} type="button" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Voltar</button>
                        )}
                        {step === 1 ? (
                            <button onClick={irParaSelecaoDeOS} disabled={!rangeStart} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500">
                                Próximo
                            </button>
                        ) : (
                            <button onClick={criar} disabled={processing} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500">
                                {processing ? 'Criando...' : 'Criar Janela'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
