import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getMonday, getSunday, getISOWeek, formatBr } from '@/utils/weeks';

export default function WeekPickerModal({ isOpen, onClose, onApply, onClear }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoveredWeek, setHoveredWeek] = useState(null);

    // Modo "várias semanas": em vez de aplicar no primeiro clique, o usuário
    // marca a semana inicial e a final, e o filtro pega o intervalo todo.
    const [multiMode, setMultiMode] = useState(false);
    const [rangeStart, setRangeStart] = useState(null); // segunda-feira da 1ª semana
    const [rangeEnd, setRangeEnd] = useState(null);     // segunda-feira da última semana

    useEffect(() => {
        if (isOpen) {
            setCurrentMonth(new Date());
            setHoveredWeek(null);
            setMultiMode(false);
            setRangeStart(null);
            setRangeEnd(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let firstDayOfMonth = new Date(year, month, 1).getDay();
    firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    const mondayOf = (dayNumber) => getMonday(new Date(year, month, dayNumber));

    const handleSelectWeek = (dayNumber) => {
        const monday = mondayOf(dayNumber);

        if (!multiMode) {
            onApply(monday, getSunday(monday));
            return;
        }

        // 1º clique (ou clique antes do início atual) começa um novo intervalo.
        if (!rangeStart || rangeEnd || monday < rangeStart) {
            setRangeStart(monday);
            setRangeEnd(null);
            return;
        }

        setRangeEnd(monday);
    };

    const applyRange = () => {
        if (!rangeStart) return;
        onApply(rangeStart, getSunday(rangeEnd ?? rangeStart));
    };

    const toggleMultiMode = () => {
        setMultiMode((prev) => !prev);
        setRangeStart(null);
        setRangeEnd(null);
    };

    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalCells = [...blanks, ...days];

    while (totalCells.length % 7 !== 0) {
        totalCells.push(null);
    }

    const weeks = [];
    for (let i = 0; i < totalCells.length; i += 7) {
        weeks.push(totalCells.slice(i, i + 7));
    }

    const rangeLabel = rangeStart
        ? rangeEnd
            ? `SEM ${getISOWeek(rangeStart)} a ${getISOWeek(rangeEnd)} · ${formatBr(rangeStart)} à ${formatBr(getSunday(rangeEnd))}`
            : `SEM ${getISOWeek(rangeStart)} · selecione a semana final`
        : 'Selecione a semana inicial';

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">

                <div className="flex items-center justify-between border-b border-slate-800 p-4">
                    <button onClick={handlePrevMonth} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-base font-bold text-white capitalize">
                        {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={handleNextMonth} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {/* Alterna entre escolher 1 semana (clique único) e um intervalo de semanas */}
                <div className="border-b border-slate-800 px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-3">
                        <input
                            type="checkbox"
                            checked={multiMode}
                            onChange={toggleMultiMode}
                            className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-200">Selecionar mais de uma semana</span>
                    </label>
                    {multiMode && (
                        <p className="mt-2 text-xs font-medium text-blue-400">{rangeLabel}</p>
                    )}
                </div>

                <div className="p-4">
                    {/* 8 colunas: a 1ª é o nº da semana do ano (SEM), as outras 7 são os dias */}
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
                            const isRangeEdge = (rangeStart && weekKey === rangeStart.getTime())
                                || (rangeEnd && weekKey === rangeEnd.getTime());
                            const isInRange = rangeStart && rangeEnd
                                && monday >= rangeStart && monday <= rangeEnd;

                            const highlight = isRangeEdge
                                ? 'bg-blue-600/40 ring-1 ring-blue-400'
                                : isInRange
                                    ? 'bg-blue-600/20 ring-1 ring-blue-500/40'
                                    : isHovered
                                        ? 'bg-blue-600/20 ring-1 ring-blue-500/50'
                                        : 'hover:bg-slate-800';

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
                                    {week.map((day, dayIndex) => (
                                        <div key={dayIndex} className={`py-2 text-sm font-medium text-center tabular-nums ${day ? (isRangeEdge || isInRange || isHovered ? 'text-blue-300' : 'text-slate-300') : ''}`}>
                                            {day || ''}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 p-4">
                    <button onClick={() => { onClear(); onClose(); }} className="text-sm font-medium text-red-400 hover:text-red-300">
                        Limpar Seleção
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                            Cancelar
                        </button>
                        {multiMode && (
                            <button
                                onClick={applyRange}
                                disabled={!rangeStart}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                            >
                                Aplicar
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}
