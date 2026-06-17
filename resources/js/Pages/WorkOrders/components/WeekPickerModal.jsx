import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

const getSunday = (monday) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + 6);
    date.setHours(23, 59, 59, 999);
    return date;
};

export default function WeekPickerModal({ isOpen, onClose, onApply, onClear }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoveredWeek, setHoveredWeek] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentMonth(new Date());
            setHoveredWeek(null);
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

    const handleSelectWeek = (dayNumber) => {
        const selectedDate = new Date(year, month, dayNumber);
        const monday = getMonday(selectedDate);
        const sunday = getSunday(monday);
        onApply(monday, sunday);
    };

    const getWeekKey = (dayNumber) => {
        const date = new Date(year, month, dayNumber);
        return getMonday(date).getTime();
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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">
                
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

                <div className="p-4">
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                            <div key={day} className="text-xs font-semibold text-slate-500">{day}</div>
                        ))}
                    </div>

                    <div className="space-y-1">
                        {weeks.map((week, weekIndex) => {
                            const validDay = week.find(d => d !== null);
                            const weekKey = validDay ? getWeekKey(validDay) : `empty-${weekIndex}`;
                            const isHovered = hoveredWeek === weekKey;

                            return (
                                <div 
                                    key={weekIndex} 
                                    className={`grid grid-cols-7 gap-1 rounded-lg cursor-pointer transition-colors ${isHovered ? 'bg-blue-600/20 ring-1 ring-blue-500/50' : 'hover:bg-slate-800'}`}
                                    onMouseEnter={() => validDay && setHoveredWeek(weekKey)}
                                    onMouseLeave={() => setHoveredWeek(null)}
                                    onClick={() => validDay && handleSelectWeek(validDay)}
                                >
                                    {week.map((day, dayIndex) => (
                                        <div key={dayIndex} className={`py-2 text-sm font-medium text-center ${day ? (isHovered ? 'text-blue-300' : 'text-slate-300') : ''}`}>
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
                    <button onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                        Cancelar
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}