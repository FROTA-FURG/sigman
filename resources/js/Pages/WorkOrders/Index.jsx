import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useState, useMemo } from 'react';
import useEstadoSessao, { comoData } from '@/utils/useEstadoSessao';
import StyledTooltips from '@/Components/StyledTooltips';
import { FILTROS_VAZIOS, OPCOES_CLASSE, OPCOES_ORIGEM, OPCOES_STATUS, ROTULO_PERIODICIDADE, quantosFiltros } from './lib/os';

import WeeklyProgress from './components/WeeklyProgress';
import FullPlan from './components/FullPlan';
import FutureOS from './components/FutureOS';
import FleetCalendar from './components/FleetCalendar';
import WorkOrdersTabBar from './components/WorkOrdersTabBar';
import CreateWorkOrderModal from '@/Pages/WorkOrders/components/CreateOSModal';
import WeekPickerModal from './components/WeekPickerModal';
import { getMonday, getSunday, formatWeekRange } from '@/utils/weeks';

const TABS_VALIDAS = ['planning', 'future', 'weekly', 'calendar'];
// Abas em que a barra de Filtros vale. Métricas e Planejamento têm os
// próprios controles -- o botão some lá para não confundir.
const ABAS_COM_FILTRO = ['weekly', 'calendar'];
const SEM_FILTRO = { vesselFilter: '', statusFilter: '', periodFilter: '', typeFilter: '', planFilter: '' };

/** Um grupo do filtro: botões que ligam/desligam (dá para marcar vários). */
function GrupoFiltro({ titulo, opcoes, marcados = [], onChange }) {
    const alternar = (valor) => onChange(marcados.includes(valor) ? marcados.filter((v) => v !== valor) : [...marcados, valor]);
    return (
        <section>
            <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {titulo}
                    {marcados.length > 0 && <span className="ml-1.5 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">{marcados.length}</span>}
                </h4>
                {marcados.length > 0 && (
                    <button type="button" onClick={() => onChange([])} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-400">Limpar</button>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {opcoes.map(({ valor, rot, detalhe }) => {
                    const ativo = marcados.includes(valor);
                    return (
                        <button
                            key={valor}
                            type="button"
                            onClick={() => alternar(valor)}
                            aria-pressed={ativo}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${ativo ? 'bg-blue-600 text-white ring-blue-500 shadow-sm shadow-blue-900/50' : 'bg-slate-800/70 text-slate-300 ring-slate-700 hover:bg-slate-700 hover:text-white'}`}
                        >
                            {ativo && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            {rot}
                            {detalhe && <span className={ativo ? 'text-blue-200' : 'text-slate-500'}>{detalhe}</span>}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export default function Index({ auth, workOrders = [], equipments = [], users = [], cruisePlans = {} }) {
    // Ao chegar aqui vindo de outra página (ex.: Janela de Execução clicando
    // numa aba da barra), respeita qual aba foi pedida em vez de sempre cair
    // em Métricas -- ver WorkOrdersTabBar.jsx.
    const [abaSalva, setAbaSalva] = useEstadoSessao('sigman.os.aba', 'planning');
    const [activeTab, setActiveTabState] = useState(() => {
        const tabDaUrl = new URLSearchParams(window.location.search).get('tab');
        return TABS_VALIDAS.includes(tabDaUrl) ? tabDaUrl : (TABS_VALIDAS.includes(abaSalva) ? abaSalva : 'planning');
    });
    // Aba já aberta continua montada (só escondida): a busca e os controles
    // dela ficam como estavam ao voltar.
    const [abasVisitadas, setAbasVisitadas] = useState(() => new Set([activeTab]));
    const setActiveTab = (aba) => {
        setActiveTabState(aba);
        setAbaSalva(aba);
        setAbasVisitadas((v) => (v.has(aba) ? v : new Set([...v, aba])));
    };
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);

    // Filtros guardados na sessão: sobrevivem à troca de aba e à ida/volta de uma OS.
    // Cada um aceita vários valores (ex.: AS e CM1; Aberta e Agendada).
    const [filtros, setFiltros] = useEstadoSessao('sigman.os.filtros.v2', FILTROS_VAZIOS, (f) => ({ ...FILTROS_VAZIOS, ...f }));
    const mudarFiltro = (campo) => (lista) => setFiltros((f) => ({ ...f, [campo]: lista }));
    const totalFiltros = quantosFiltros(filtros);
    // Calendário de semanas hachura o cruzeiro quando uma única embarcação está marcada.
    const embarcacaoUnica = filtros.embarcacoes.length === 1 ? filtros.embarcacoes[0] : '';
    const [weekStart, setWeekStart] = useEstadoSessao('sigman.os.filtro.semanaInicio', () => getMonday(new Date()), comoData);
    const [weekEnd, setWeekEnd] = useEstadoSessao('sigman.os.filtro.semanaFim', () => getSunday(getMonday(new Date())), comoData);
    const filtroVale = ABAS_COM_FILTRO.includes(activeTab);
    useEffect(() => { if (!filtroVale) setIsSidebarOpen(false); }, [filtroVale]);

    // Esc fecha a barra de Filtros (se o calendário de semanas não estiver aberto por cima).
    useEffect(() => {
        if (!isSidebarOpen) return undefined;
        const aoTeclar = (e) => { if (e.key === 'Escape' && !isWeekPickerOpen) setIsSidebarOpen(false); };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [isSidebarOpen, isWeekPickerOpen]);

    const opcoesEmbarcacao = useMemo(() => {
        const mapa = new Map();
        workOrders.forEach(os => { const v = os.equipment?.vessel; if (v?.tag && !mapa.has(v.tag)) mapa.set(v.tag, v.name || v.tag); });
        return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tag, nome]) => ({ valor: tag, rot: tag, detalhe: nome !== tag ? nome : null }));
    }, [workOrders]);
    const opcoesPeriodicidade = useMemo(() => {
        const usadas = new Set(workOrders.map(os => os.periodicity || 'avulsa'));
        return [...Object.entries(ROTULO_PERIODICIDADE), ['avulsa', 'Avulsa (sem periodicidade)']]
            .filter(([valor]) => usadas.has(valor))
            .map(([valor, rot]) => ({ valor, rot }));
    }, [workOrders]);

    const displayWeekRange = formatWeekRange(weekStart, weekEnd);

    return (
        <SIGMANLayout>
            <Head title="Ordens de Serviço | SIGMAN" />
            <StyledTooltips />

            <CreateWorkOrderModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} equipments={equipments} />
            
            <WeekPickerModal 
                isOpen={isWeekPickerOpen} 
                onClose={() => setIsWeekPickerOpen(false)} 
                onApply={(start, end) => { setWeekStart(start); setWeekEnd(end); setIsWeekPickerOpen(false); }}
                onClear={() => { setWeekStart(null); setWeekEnd(null); setIsWeekPickerOpen(false); }}
                cruisePeriods={embarcacaoUnica ? (cruisePlans[embarcacaoUnica] || []) : []}
            />

            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
            )}

            <aside className={`fixed right-0 top-0 z-50 flex h-full w-96 max-w-[100vw] flex-col border-l border-slate-700 bg-[#0b1a30] shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filtros
                            {totalFiltros > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold">{totalFiltros}</span>}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">Marque quantos quiser em cada grupo · Esc fecha</p>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar filtros">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Período</h4>
                            {weekStart && (
                                <button onClick={() => { setWeekStart(null); setWeekEnd(null); }} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-400">Ver tudo</button>
                            )}
                        </div>
                        <button onClick={() => setIsWeekPickerOpen(true)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-slate-800">
                            <span className="flex min-w-0 items-center gap-2">
                                <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="truncate">{displayWeekRange}</span>
                            </span>
                            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </section>

                    <GrupoFiltro titulo="Embarcação" opcoes={opcoesEmbarcacao} marcados={filtros.embarcacoes} onChange={mudarFiltro('embarcacoes')} />
                    <GrupoFiltro titulo="Status da OS" opcoes={OPCOES_STATUS} marcados={filtros.status} onChange={mudarFiltro('status')} />
                    <GrupoFiltro titulo="Classe" opcoes={OPCOES_CLASSE} marcados={filtros.classes} onChange={mudarFiltro('classes')} />
                    <GrupoFiltro titulo="Origem da OS" opcoes={OPCOES_ORIGEM} marcados={filtros.origens} onChange={mudarFiltro('origens')} />
                    {opcoesPeriodicidade.length > 0 && (
                        <GrupoFiltro titulo="Periodicidade" opcoes={opcoesPeriodicidade} marcados={filtros.periodicidades} onChange={mudarFiltro('periodicidades')} />
                    )}
                </div>

                <div className="border-t border-slate-800 px-6 py-4">
                    <button
                        onClick={() => {
                            setFiltros(FILTROS_VAZIOS);
                            setWeekStart(getMonday(new Date()));
                            setWeekEnd(getSunday(getMonday(new Date())));
                        }}
                        className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                        Limpar todos os filtros
                    </button>
                </div>
            </aside>

            <div className="flex h-full flex-col space-y-4">
                <div>
                    <h2 className="text-xl font-bold leading-tight text-white">Ordens de Serviço</h2>
                    <p className="text-xs text-slate-400">Gerencie e visualize o histórico de todas as OS da frota.</p>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800">
                    <WorkOrdersTabBar activeTab={activeTab} onTabClick={setActiveTab} />

                    <div className="flex items-center gap-3 pb-1">
                        {filtroVale && (
                        <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-2 rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filtros
                            {totalFiltros > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{totalFiltros}</span>}
                        </button>
                        )}

                        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors">
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Nova OS
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 mt-0">
                    {/* Abas já visitadas ficam montadas e só escondidas: voltar a uma
                        aba mantém busca, controles e rolagem como estavam. */}
                    {abasVisitadas.has('planning') && (
                        <div className={activeTab === 'planning' ? 'h-full' : 'hidden'}>
                            <FullPlan workOrders={workOrders} equipments={equipments} users={users} {...SEM_FILTRO} />
                        </div>
                    )}
                    {abasVisitadas.has('future') && (
                        <div className={activeTab === 'future' ? 'h-full' : 'hidden'}>
                            <FutureOS currentUser={auth?.user} cruisePlans={cruisePlans} workOrders={workOrders} equipments={equipments} users={users} {...SEM_FILTRO} />
                        </div>
                    )}
                    {abasVisitadas.has('weekly') && (
                        <div className={activeTab === 'weekly' ? 'h-full' : 'hidden'}>
                            <WeeklyProgress currentUser={auth?.user} workOrders={workOrders} equipments={equipments} users={users} filtros={filtros} weekStart={weekStart} weekEnd={weekEnd} />
                        </div>
                    )}
                    {abasVisitadas.has('calendar') && (
                        <div className={activeTab === 'calendar' ? 'h-full' : 'hidden'}>
                            <FleetCalendar currentUser={auth?.user} workOrders={workOrders} equipments={equipments} cruisePlans={cruisePlans} filtros={filtros} />
                        </div>
                    )}
                </div>
            </div>
        </SIGMANLayout>
    );
}