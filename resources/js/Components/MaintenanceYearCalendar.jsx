import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { getMonday, getISOWeek } from '@/utils/weeks';

const STATUS_LABEL = {
    open: { label: 'Aberta', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    in_progress: { label: 'Em Andamento', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    scheduled: { label: 'Agendada', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    completed: { label: 'Concluída', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    cancelled: { label: 'Cancelada', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

// Ordem fixa de cor por classe de manutenção -- azul/vermelho/verde, como pedido.
const COR_POR_TIPO = {
    preventive: { dot: 'bg-blue-500', label: 'Preventiva' },
    corrective: { dot: 'bg-red-500', label: 'Corretiva' },
    predictive: { dot: 'bg-emerald-500', label: 'Preditiva' },
};

// Hachura diagonal pros dias de cruzeiro -- visual de "bloqueado/indisponível",
// deliberadamente diferente do quadrado sólido verde de "concluída".
const HACHURA_CRUZEIRO = {
    backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.35) 0px, rgba(148,163,184,0.35) 2px, transparent 2px, transparent 6px)',
};

function IconeOlho({ oculto, pequeno = false }) {
    const tam = pequeno ? 'h-3 w-3' : 'h-3.5 w-3.5';
    if (oculto) {
        return (
            <svg className={tam} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
        );
    }
    return (
        <svg className={tam} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

/** Monta a grade de um mês (linhas de 7 células, com null pra padding), semana começando na segunda. */
function buildMonthGrid(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // 0=segunda

    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

function MiniMonth({ year, month, marcasPorDia, diasEmCruzeiro, onDiaClick, diaDestacado, compacto = false }) {
    const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
    // Versão compacta (modal): células e fontes menores pra caber o ano inteiro.
    const altura = compacto ? 'h-[18px]' : 'h-6';

    return (
        <div data-mes={month} className={`rounded-lg border border-slate-800 bg-slate-900/40 ${compacto ? 'p-1.5' : 'p-2.5'}`}>
            <h5 className={`text-center font-bold uppercase tracking-wide text-slate-300 ${compacto ? 'mb-1 text-[10px]' : 'mb-1.5 text-xs'}`}>{MESES[month]}</h5>
            {/* 8 colunas: a 1ª é o nº da semana do ano, as outras 7 são os dias -- mesmo padrão do WeekPickerModal. */}
            <div className="grid grid-cols-8 gap-y-0.5 text-center">
                <span className="text-[9px] font-bold text-blue-400">Sem</span>
                {DIAS_SEMANA.map((d, i) => (
                    <span key={i} className="text-[9px] font-semibold text-slate-600">{d}</span>
                ))}
                {weeks.map((semana, weekIndex) => {
                    const diaValido = semana.find(d => d !== null);
                    const numeroSemana = diaValido ? getISOWeek(getMonday(new Date(year, month, diaValido))) : null;

                    return (
                        <React.Fragment key={weekIndex}>
                            <div className={`flex ${altura} items-center justify-center font-bold tabular-nums text-slate-600 ${compacto ? 'text-[8px]' : 'text-[9px]'}`}>
                                {numeroSemana ?? ''}
                            </div>
                            {semana.map((day, i) => {
                                const chave = day ? `${month}-${day}` : null;
                                const info = chave ? marcasPorDia[chave] : null;
                                const emCruzeiro = chave ? diasEmCruzeiro.has(chave) : false;
                                const temOS = info && info.items.length > 0;
                                const destacado = chave !== null && chave === diaDestacado;
                                return (
                                    <div key={i} className={`flex ${altura} items-center justify-center`}>
                                        {day && (
                                            <div
                                                onClick={temOS ? () => onDiaClick(info.items, `${day}/${month + 1}/${year}`) : undefined}
                                                className={`relative flex h-full w-full flex-col items-center justify-center rounded ${destacado ? 'z-10 bg-amber-400/30 ring-2 ring-amber-400' : info?.completed ? 'bg-emerald-500/15 ring-1 ring-emerald-500/70' : ''} ${temOS ? 'cursor-pointer hover:ring-1 hover:ring-blue-400' : ''}`}
                                                style={emCruzeiro ? HACHURA_CRUZEIRO : undefined}
                                                title={emCruzeiro ? ['Embarcação em cruzeiro', diasEmCruzeiro.get(chave), temOS && 'Clique para ver as OS deste dia'].filter(Boolean).join('\n') : (temOS ? 'Ver OS deste dia' : undefined)}
                                            >
                                                {/* Dia apontado de fora (ex.: hover numa linha de tabela): pisca. */}
                                                {destacado && <span className="pointer-events-none absolute -inset-1 animate-ping rounded bg-amber-400/50" />}
                                                <span className={`leading-none ${compacto ? 'text-[9px]' : 'text-[10px]'} ${destacado ? 'font-bold text-amber-100' : 'text-slate-400'}`}>{day}</span>
                                                <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                                                    {info && Object.keys(COR_POR_TIPO).filter(t => info.types.has(t)).map(t => (
                                                        <span key={t} className={`h-1.5 w-1.5 rounded-full ${COR_POR_TIPO[t].dot}`} />
                                                    ))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Calendário anual: 6 meses em cima, 6 embaixo, com uma bolinha por classe
 * de manutenção (preventiva/corretiva/preditiva) marcada no dia da OS
 * (created_at -- a data-alvo da OS em todo o SIGMAN). OS canceladas ficam
 * de fora (não "ocorreram"); as demais entram independente do status,
 * então também mostra o que está agendado à frente, não só o que já foi
 * concluído. Dia com pelo menos uma OS concluída ganha um quadrado verde
 * atrás da data + bolinha. A legenda funciona como filtro: clicar no olho
 * de um tipo (ou de "Concluída") tira aquela categoria do calendário.
 *
 * `cruisePeriods` (opcional) sobrepõe o planejamento de cruzeiro da
 * embarcação como uma hachura nos dias em que ela está no mar --
 * indisponível pra manutenção. Formato: [{ inicio: 'YYYY-MM-DD', fim:
 * 'YYYY-MM-DD', descricao?: string }]. Só aparece o botão de liga/desliga
 * quando existem períodos pra mostrar.
 *
 * Agnóstico de equipamento/embarcação -- só recebe a lista de OS já
 * filtrada pelo chamador (usado tanto na página de um equipamento quanto
 * no calendário por embarcação em Ordens de Serviço).
 *
 * Opcionais:
 * - `destaque` ('YYYY-MM-DD'): faz o dia piscar e pula pro ano dele --
 *   usado pra ligar uma tabela de OS ao calendário (hover na linha).
 * - `compacto`: 3 meses por linha, pra caber ao lado de outra coluna (modal).
 * - `backUrl`: os links das OS levam ?back= pra tela da OS voltar pra cá.
 */
export default function MaintenanceYearCalendar({ workOrders = [], emptyLabel = 'Nenhuma OS registrada', cruisePeriods = [], destaque = null, compacto = false, backUrl = null }) {
    const anoAtual = new Date().getFullYear();
    const [year, setYear] = useState(anoAtual);

    const [anoDestaque, mesDestaque, diaDestaque] = destaque ? destaque.split('-').map(Number) : [];
    useEffect(() => {
        if (anoDestaque && anoDestaque !== year) setYear(anoDestaque);
    }, [anoDestaque]); // eslint-disable-line react-hooks/exhaustive-deps
    const diaDestacado = anoDestaque === year ? `${mesDestaque - 1}-${diaDestaque}` : null;

    // Se o mês destacado estiver fora da área visível (tela baixa), rola até ele.
    const gradeRef = useRef(null);
    useEffect(() => {
        if (!diaDestacado || !gradeRef.current) return;
        const mes = gradeRef.current.querySelector(`[data-mes="${mesDestaque - 1}"]`);
        mes?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [diaDestacado]); // eslint-disable-line react-hooks/exhaustive-deps
    const [tiposOcultos, setTiposOcultos] = useState(() => new Set());
    const [ocultarConcluidas, setOcultarConcluidas] = useState(false);
    const [mostrarCruzeiro, setMostrarCruzeiro] = useState(true);
    const [diaSelecionado, setDiaSelecionado] = useState(null); // { items, dataLabel } | null

    const toggleTipo = (tipo) => {
        setTiposOcultos(prev => {
            const novo = new Set(prev);
            if (novo.has(tipo)) novo.delete(tipo); else novo.add(tipo);
            return novo;
        });
    };

    const marcasPorDia = useMemo(() => {
        const mapa = {};
        for (const os of workOrders) {
            if (!os.created_at || os.status === 'cancelled') continue;
            if (ocultarConcluidas && os.status === 'completed') continue;
            if (tiposOcultos.has(os.maintenance_type)) continue;

            // Mesma extração por string do FutureOS.jsx (formatBr) -- nada de
            // `new Date(iso)` aqui. O created_at vem com "Z" (UTC) mas
            // representa a data-alvo em si, não um instante; passar pelo
            // construtor Date + fuso do navegador é o que causava a OS
            // prevista pra um dia aparecer marcada no dia seguinte no calendário.
            const [datePart] = os.created_at.split('T');
            const [yStr, mStr, dStr] = datePart.split('-');
            if (Number(yStr) !== year) continue;

            const chave = `${Number(mStr) - 1}-${Number(dStr)}`;
            if (!mapa[chave]) mapa[chave] = { types: new Set(), completed: false, items: [] };
            if (COR_POR_TIPO[os.maintenance_type]) mapa[chave].types.add(os.maintenance_type);
            if (os.status === 'completed') mapa[chave].completed = true;
            mapa[chave].items.push(os);
        }
        return mapa;
    }, [workOrders, year, tiposOcultos, ocultarConcluidas]);

    // dia -> descrição da etapa (ex.: "Etapa 01 · Oceânico Sul"), pro balão do dia.
    const diasEmCruzeiro = useMemo(() => {
        const set = new Map();
        if (!mostrarCruzeiro) return set;

        for (const periodo of cruisePeriods) {
            if (!periodo?.inicio || !periodo?.fim) continue;
            const [ys, ms, ds] = periodo.inicio.split('-').map(Number);
            const [ye, me, de] = periodo.fim.split('-').map(Number);
            const cursor = new Date(ys, ms - 1, ds);
            const fim = new Date(ye, me - 1, de);
            while (cursor <= fim) {
                if (cursor.getFullYear() === year) {
                    set.set(`${cursor.getMonth()}-${cursor.getDate()}`, periodo.descricao || '');
                }
                cursor.setDate(cursor.getDate() + 1);
            }
        }
        return set;
    }, [cruisePeriods, mostrarCruzeiro, year]);

    const temNoAno = Object.keys(marcasPorDia).length > 0;

    const abrirDia = (items, dataLabel) => setDiaSelecionado({ items, dataLabel });

    return (
        <div className={`rounded-xl border border-slate-800 bg-[#0b203c]/90 shadow-lg backdrop-blur-md ${compacto ? 'p-3' : 'p-6'}`}>
            <div className={`flex flex-wrap items-center justify-between ${compacto ? 'mb-2 gap-2' : 'mb-4 gap-3'}`}>
                <h4 className={`font-semibold text-white ${compacto ? 'text-xs' : 'text-sm'}`}>Calendário Anual de Manutenção</h4>

                {/* No compacto (modal), legenda e ano numa linha só: fonte e espaçamentos menores. */}
                <div className={`flex items-center ${compacto ? 'flex-nowrap gap-1.5' : 'flex-wrap gap-3'}`}>
                    <div className={`flex items-center whitespace-nowrap font-medium text-slate-400 ${compacto ? 'flex-nowrap gap-0.5 text-[10px]' : 'flex-wrap gap-3 text-xs'}`}>
                        {Object.entries(COR_POR_TIPO).map(([tipo, { dot, label }]) => {
                            const oculto = tiposOcultos.has(tipo);
                            return (
                                <button
                                    key={tipo}
                                    onClick={() => toggleTipo(tipo)}
                                    title={oculto ? `Mostrar ${label}` : `Ocultar ${label}`}
                                    className={`flex items-center rounded transition hover:bg-slate-800 ${compacto ? 'gap-1 px-1 py-0.5' : 'gap-1.5 px-1.5 py-1'} ${oculto ? 'opacity-40' : ''}`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                                    {label}
                                    <IconeOlho oculto={oculto} pequeno={compacto} />
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setOcultarConcluidas(v => !v)}
                            title={ocultarConcluidas ? 'Mostrar Concluídas' : 'Ocultar Concluídas'}
                            className={`flex items-center rounded transition hover:bg-slate-800 ${compacto ? 'gap-1 px-1 py-0.5' : 'gap-1.5 px-1.5 py-1'} ${ocultarConcluidas ? 'opacity-40' : ''}`}
                        >
                            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/15 ring-1 ring-emerald-500/70" />
                            Concluída
                            <IconeOlho oculto={ocultarConcluidas} pequeno={compacto} />
                        </button>

                        {cruisePeriods.length > 0 && (
                            <button
                                onClick={() => setMostrarCruzeiro(v => !v)}
                                title={mostrarCruzeiro ? 'Ocultar plano de cruzeiro' : 'Mostrar plano de cruzeiro'}
                                className={`flex items-center rounded border border-slate-700 transition hover:bg-slate-800 ${compacto ? 'gap-1 px-1 py-0.5' : 'gap-1.5 px-2 py-1'} ${!mostrarCruzeiro ? 'opacity-40' : ''}`}
                            >
                                <span className="h-2.5 w-2.5 rounded-sm" style={HACHURA_CRUZEIRO} />
                                Cruzeiro
                                <IconeOlho oculto={!mostrarCruzeiro} pequeno={compacto} />
                            </button>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-1">
                        <button onClick={() => setYear(y => y - 1)} className={`rounded text-slate-400 hover:bg-slate-700 hover:text-white ${compacto ? 'p-1' : 'p-1.5'}`} title="Ano anterior">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className={`text-center font-bold text-white ${compacto ? 'w-10 text-xs' : 'w-14 text-sm'}`}>{year}</span>
                        <button onClick={() => setYear(y => y + 1)} className={`rounded text-slate-400 hover:bg-slate-700 hover:text-white ${compacto ? 'p-1' : 'p-1.5'}`} title="Próximo ano">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {!temNoAno && (
                <p className="mb-3 text-xs text-slate-500">{emptyLabel} em {year}.</p>
            )}

            {compacto ? (
                <div ref={gradeRef} className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 12 }, (_, m) => <MiniMonth key={m} year={year} month={m} marcasPorDia={marcasPorDia} diasEmCruzeiro={diasEmCruzeiro} onDiaClick={abrirDia} diaDestacado={diaDestacado} compacto />)}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {Array.from({ length: 6 }, (_, m) => <MiniMonth key={m} year={year} month={m} marcasPorDia={marcasPorDia} diasEmCruzeiro={diasEmCruzeiro} onDiaClick={abrirDia} diaDestacado={diaDestacado} />)}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {Array.from({ length: 6 }, (_, m) => <MiniMonth key={m + 6} year={year} month={m + 6} marcasPorDia={marcasPorDia} diasEmCruzeiro={diasEmCruzeiro} onDiaClick={abrirDia} diaDestacado={diaDestacado} />)}
                    </div>
                </>
            )}

            {diaSelecionado && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={() => setDiaSelecionado(null)}>
                    <div className="relative w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-5 py-4">
                            <div>
                                <h4 className="text-sm font-bold text-white">OS de {diaSelecionado.dataLabel}</h4>
                                <p className="text-xs text-slate-500">{diaSelecionado.items.length} OS neste dia</p>
                            </div>
                            <button onClick={() => setDiaSelecionado(null)} type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="custom-scrollbar flex-1 overflow-y-auto p-3 space-y-1.5">
                            {diaSelecionado.items.map(os => {
                                const status = STATUS_LABEL[os.status];
                                const tipo = COR_POR_TIPO[os.maintenance_type];
                                return (
                                    <Link
                                        key={os.id}
                                        href={backUrl ? route('work-orders.show', { work_order: os.id, back: backUrl }) : route('work-orders.show', os.id)}
                                        className="block rounded-lg border border-slate-700 bg-slate-800/30 p-3 transition hover:border-blue-500/50 hover:bg-blue-600/10"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-slate-300">#{os.os_number}</span>
                                            {tipo && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                    <span className={`h-1.5 w-1.5 rounded-full ${tipo.dot}`} />
                                                    {tipo.label}
                                                </span>
                                            )}
                                            {status && (
                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.classes}`}>{status.label}</span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-xs text-slate-400">{os.description}</p>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
