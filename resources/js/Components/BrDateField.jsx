import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const pad = (n) => String(n).padStart(2, '0');
const hojeIso = () => { const h = new Date(); return `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(h.getDate())}`; };
const isoParaBr = (iso) => { const [a, m, d] = (iso || '').split('-'); return a && m && d ? `${d}/${m}/${a}` : ''; };

const LARGURA = 288;
const ALTURA = 360;

/**
 * Campo só de data, em dd/mm/aaaa, com calendário estilizado.
 *
 * Contrato: `value`/`onChange` em 'aaaa-mm-dd' (data sem hora, sem fuso --
 * serve pra data-alvo de OS, prazo, data de coleta). Aceita digitar com
 * máscara ou escolher no calendário.
 *
 * O calendário vai pro body via portal pra não ser cortado por modais com
 * overflow (mesmo motivo do BrDateTimeFields).
 */
export default function BrDateField({ value, onChange, disabled, placeholder = 'dd/mm/aaaa', className = '' }) {
    const [texto, setTexto] = useState(isoParaBr(value));
    const [aberto, setAberto] = useState(false);
    const [posicao, setPosicao] = useState(null);
    const [mesVisto, setMesVisto] = useState(() => {
        const base = value ? new Date(`${value}T12:00:00`) : new Date();
        return { ano: base.getFullYear(), mes: base.getMonth() };
    });
    const campoRef = useRef(null);
    const painelRef = useRef(null);

    useEffect(() => { setTexto(isoParaBr(value)); }, [value]);

    useEffect(() => {
        if (!aberto) return;
        const fechaFora = (e) => {
            if (!campoRef.current?.contains(e.target) && !painelRef.current?.contains(e.target)) setAberto(false);
        };
        const fechaEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setAberto(false); } };
        const fechaAoRolar = (e) => { if (!painelRef.current?.contains(e.target)) setAberto(false); };
        document.addEventListener('mousedown', fechaFora);
        document.addEventListener('keydown', fechaEsc, true);
        window.addEventListener('scroll', fechaAoRolar, true);
        window.addEventListener('resize', fechaAoRolar);
        return () => {
            document.removeEventListener('mousedown', fechaFora);
            document.removeEventListener('keydown', fechaEsc, true);
            window.removeEventListener('scroll', fechaAoRolar, true);
            window.removeEventListener('resize', fechaAoRolar);
        };
    }, [aberto]);

    const abrir = () => {
        if (aberto) { setAberto(false); return; }
        const rect = campoRef.current?.getBoundingClientRect();
        if (!rect) return;
        const espacoAbaixo = window.innerHeight - rect.bottom;
        const paraCima = espacoAbaixo < ALTURA && rect.top > espacoAbaixo;
        setPosicao({
            left: Math.max(8, Math.min(rect.left, window.innerWidth - LARGURA - 8)),
            top: paraCima ? rect.top - 6 : rect.bottom + 6,
            paraCima,
        });
        const base = value ? new Date(`${value}T12:00:00`) : new Date();
        setMesVisto({ ano: base.getFullYear(), mes: base.getMonth() });
        setAberto(true);
    };

    const digitar = (e) => {
        const dig = e.target.value.replace(/\D/g, '').slice(0, 8);
        let m = dig;
        if (dig.length > 4) m = `${dig.slice(0, 2)}/${dig.slice(2, 4)}/${dig.slice(4)}`;
        else if (dig.length > 2) m = `${dig.slice(0, 2)}/${dig.slice(2)}`;
        setTexto(m);
        if (dig.length === 8) {
            const iso = `${dig.slice(4, 8)}-${dig.slice(2, 4)}-${dig.slice(0, 2)}`;
            const d = new Date(`${iso}T12:00:00`);
            // Só aceita data que existe (evita 31/02).
            if (!Number.isNaN(d.getTime()) && isoParaBr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`) === m) onChange(iso);
        } else if (dig.length === 0) {
            onChange('');
        }
    };

    const escolher = (iso) => { onChange(iso); setAberto(false); };
    const irMes = (delta) => setMesVisto((a) => {
        const d = new Date(a.ano, a.mes + delta, 1);
        return { ano: d.getFullYear(), mes: d.getMonth() };
    });

    const hoje = hojeIso();
    const primeiro = new Date(mesVisto.ano, mesVisto.mes, 1).getDay();
    const total = new Date(mesVisto.ano, mesVisto.mes + 1, 0).getDate();
    const celulas = [...Array(primeiro).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

    return (
        <div ref={campoRef} className="relative">
            <button
                type="button"
                onClick={abrir}
                disabled={disabled}
                title="Escolher no calendário"
                className={`absolute left-2 top-1/2 z-10 -translate-y-1/2 transition-colors disabled:cursor-not-allowed ${aberto ? 'text-blue-400' : 'text-slate-500 hover:text-blue-400'}`}
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
            <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={placeholder}
                maxLength={10}
                value={texto}
                onChange={digitar}
                onFocus={() => !aberto && !texto && abrir()}
                disabled={disabled}
                className={`w-full rounded-md border-slate-700 bg-slate-900 py-2 pl-8 pr-2 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className}`}
            />

            {aberto && posicao && createPortal(
                <div
                    ref={painelRef}
                    style={{ position: 'fixed', top: posicao.top, left: posicao.left, width: LARGURA, transform: posicao.paraCima ? 'translateY(-100%)' : undefined }}
                    className="z-[10000] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 ring-1 ring-blue-500/20"
                >
                    {/* Cabeçalho: data escolhida em destaque + navegação de mês */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-4 pb-3 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">
                            {value ? 'Data selecionada' : 'Selecione uma data'}
                        </p>
                        <p className="text-lg font-bold text-white">{value ? isoParaBr(value) : '—'}</p>
                        <div className="mt-2 flex items-center justify-between">
                            <button type="button" onClick={() => irMes(-1)} className="rounded-md p-1 text-blue-100 transition hover:bg-white/15 hover:text-white" aria-label="Mês anterior">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="text-sm font-semibold text-white">{MESES[mesVisto.mes]} {mesVisto.ano}</span>
                            <button type="button" onClick={() => irMes(1)} className="rounded-md p-1 text-blue-100 transition hover:bg-white/15 hover:text-white" aria-label="Próximo mês">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-3">
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-500">
                            {DIAS_SEMANA.map((d, i) => <span key={i} className={i === 0 || i === 6 ? 'text-slate-600' : ''}>{d}</span>)}
                        </div>
                        <div className="mt-1.5 grid grid-cols-7 gap-1">
                            {celulas.map((dia, i) => {
                                if (dia === null) return <span key={`v-${i}`} />;
                                const iso = `${mesVisto.ano}-${pad(mesVisto.mes + 1)}-${pad(dia)}`;
                                const sel = iso === value;
                                const ehHoje = iso === hoje;
                                const fimDeSemana = i % 7 === 0 || i % 7 === 6;
                                return (
                                    <button
                                        key={iso}
                                        type="button"
                                        onClick={() => escolher(iso)}
                                        className={`flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition ${
                                            sel
                                                ? 'bg-blue-600 font-bold text-white shadow-md shadow-blue-900/60'
                                                : ehHoje
                                                    ? 'text-blue-300 ring-1 ring-inset ring-blue-500/70 hover:bg-blue-500/15'
                                                    : `${fimDeSemana ? 'text-slate-500' : 'text-slate-200'} hover:bg-slate-800 hover:text-white`
                                        }`}
                                    >
                                        {dia}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2.5">
                            <button type="button" onClick={() => { onChange(''); setAberto(false); }} className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white">
                                Limpar
                            </button>
                            <button type="button" onClick={() => escolher(hoje)} className="rounded-md bg-slate-800 px-3 py-1 text-[11px] font-semibold text-blue-300 transition hover:bg-blue-600 hover:text-white">
                                Hoje
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
