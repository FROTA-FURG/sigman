import { useEffect, useRef, useState } from 'react';
import BrDateInput from '@/Components/BrDateInput';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const hojeIso = () => new Date().toISOString().split('T')[0];

/**
 * BrDateInput (digitação mascarada dd/mm/aaaa) + um botão de calendário que
 * abre um mini-calendário pra escolher o dia clicando, sem depender do
 * `<input type="date">` nativo (que muda de formato conforme o idioma do
 * navegador -- o motivo do BrDateInput existir). Mesmo contrato de
 * value/onChange em yyyy-mm-dd.
 */
export default function DateInputWithCalendar({ value, onChange, disabled, className = '', ...props }) {
    const [aberto, setAberto] = useState(false);
    const [mesVisto, setMesVisto] = useState(() => {
        const base = value ? new Date(`${value}T12:00:00`) : new Date();
        return { ano: base.getFullYear(), mes: base.getMonth() };
    });
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!aberto) return;
        const base = value ? new Date(`${value}T12:00:00`) : new Date();
        setMesVisto({ ano: base.getFullYear(), mes: base.getMonth() });
    }, [aberto]);

    useEffect(() => {
        if (!aberto) return;
        const fechaFora = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAberto(false);
        };
        const fechaEsc = (e) => { if (e.key === 'Escape') setAberto(false); };
        document.addEventListener('mousedown', fechaFora);
        document.addEventListener('keydown', fechaEsc);
        return () => {
            document.removeEventListener('mousedown', fechaFora);
            document.removeEventListener('keydown', fechaEsc);
        };
    }, [aberto]);

    const irMes = (delta) => {
        setMesVisto((atual) => {
            const d = new Date(atual.ano, atual.mes + delta, 1);
            return { ano: d.getFullYear(), mes: d.getMonth() };
        });
    };

    const escolherDia = (dia) => {
        const mm = String(mesVisto.mes + 1).padStart(2, '0');
        const dd = String(dia).padStart(2, '0');
        onChange(`${mesVisto.ano}-${mm}-${dd}`);
        setAberto(false);
    };

    const primeiroDiaSemana = new Date(mesVisto.ano, mesVisto.mes, 1).getDay();
    const totalDias = new Date(mesVisto.ano, mesVisto.mes + 1, 0).getDate();
    const celulas = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)];
    const hoje = hojeIso();

    return (
        <div ref={wrapperRef} className="relative">
            <div className="flex items-stretch gap-1">
                <BrDateInput
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`${className} flex-1`}
                    {...props}
                />
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setAberto((v) => !v)}
                    title="Escolher no calendário"
                    className="shrink-0 rounded-md border border-slate-700 bg-slate-950 px-2 text-slate-400 transition-colors hover:border-blue-500 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>

            {aberto && (
                <div className="absolute z-[10000] mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between">
                        <button type="button" onClick={() => irMes(-1)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-xs font-semibold text-slate-200">{MESES[mesVisto.mes]} {mesVisto.ano}</span>
                        <button type="button" onClick={() => irMes(1)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500">
                        {DIAS_SEMANA.map((d, i) => <span key={i}>{d}</span>)}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-1">
                        {celulas.map((dia, i) => {
                            if (dia === null) return <span key={`vazio-${i}`} />;
                            const iso = `${mesVisto.ano}-${String(mesVisto.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                            const selecionado = iso === value;
                            const ehHoje = iso === hoje;
                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    onClick={() => escolherDia(dia)}
                                    className={`aspect-square rounded text-xs transition-colors ${
                                        selecionado
                                            ? 'bg-blue-600 font-bold text-white'
                                            : ehHoje
                                                ? 'border border-blue-500/60 text-blue-300 hover:bg-slate-800'
                                                : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    {dia}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => escolherDia(new Date().getDate())}
                        className="mt-2 w-full rounded-md border border-slate-700 py-1 text-[11px] font-medium text-slate-400 hover:border-blue-500 hover:text-blue-400"
                        style={{ display: mesVisto.ano === new Date().getFullYear() && mesVisto.mes === new Date().getMonth() ? 'block' : 'none' }}
                    >
                        Hoje
                    </button>
                </div>
            )}
        </div>
    );
}
