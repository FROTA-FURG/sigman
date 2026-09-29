import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const pad = (n) => String(n).padStart(2, '0');

// Tamanho aproximado de cada painel, usado só pra decidir se abre pra baixo
// ou pra cima e pra não deixar vazar da janela.
const PAINEL = {
    data: { largura: 256, altura: 310 },
    hora: { largura: 192, altura: 270 },
};

/**
 * Data e hora em campos separados, cada um com seu ícone: calendário pra
 * data e relógio pra hora (abre a lista de horários do dia).
 *
 * Mesmo contrato do BrDateTimeInput: `value`/`onChange` carregam um ISO UTC
 * de verdade (é um instante real -- quando a atividade começou/terminou);
 * o que aparece nos campos é sempre a hora local de quem está na tela.
 *
 * Os painéis vão pro body via portal porque este campo vive dentro de
 * modais com `overflow-hidden`, que cortavam o calendário na borda.
 */
export default function BrDateTimeFields({ value, onChange, disabled, className = '' }) {
    const [dataLocal, setDataLocal] = useState('');   // yyyy-mm-dd
    const [horaLocal, setHoraLocal] = useState('');   // HH:mm
    const [textoData, setTextoData] = useState('');   // dd/mm/aaaa digitado
    const [painelAberto, setPainelAberto] = useState(null); // 'data' | 'hora' | null
    const [posicao, setPosicao] = useState(null);
    const [mesVisto, setMesVisto] = useState(() => {
        const base = new Date();
        return { ano: base.getFullYear(), mes: base.getMonth() };
    });

    const dataWrapRef = useRef(null);
    const horaWrapRef = useRef(null);
    const painelRef = useRef(null);

    // Valor de fora -> campos locais.
    useEffect(() => {
        if (!value) {
            setDataLocal('');
            setHoraLocal('');
            setTextoData('');
            return;
        }
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return;

        setDataLocal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setHoraLocal(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        setTextoData(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`);
    }, [value]);

    useEffect(() => {
        if (!painelAberto) return;

        const fechaFora = (e) => {
            const dentroDoCampo = dataWrapRef.current?.contains(e.target) || horaWrapRef.current?.contains(e.target);
            const dentroDoPainel = painelRef.current?.contains(e.target);
            if (!dentroDoCampo && !dentroDoPainel) setPainelAberto(null);
        };
        const fechaEsc = (e) => { if (e.key === 'Escape') setPainelAberto(null); };
        // Painel posicionado em coordenada fixa: rolar a tela o deixaria
        // descolado do campo, então fecha.
        const fechaAoRolar = () => setPainelAberto(null);

        document.addEventListener('mousedown', fechaFora);
        document.addEventListener('keydown', fechaEsc);
        window.addEventListener('scroll', fechaAoRolar, true);
        window.addEventListener('resize', fechaAoRolar);
        return () => {
            document.removeEventListener('mousedown', fechaFora);
            document.removeEventListener('keydown', fechaEsc);
            window.removeEventListener('scroll', fechaAoRolar, true);
            window.removeEventListener('resize', fechaAoRolar);
        };
    }, [painelAberto]);

    /** Coordenadas do painel a partir do campo que o abriu. */
    const calcularPosicao = (ancoraRef, tipo) => {
        const rect = ancoraRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const { largura, altura } = PAINEL[tipo];
        const espacoAbaixo = window.innerHeight - rect.bottom;
        const paraCima = espacoAbaixo < altura && rect.top > espacoAbaixo;

        // Alinha pela esquerda do campo, mas sem deixar vazar da janela.
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - largura - 8));

        return {
            left,
            top: paraCima ? rect.top - 6 : rect.bottom + 6,
            paraCima,
            largura,
        };
    };

    const alternarPainel = (tipo, ancoraRef) => {
        if (painelAberto === tipo) {
            setPainelAberto(null);
            return;
        }
        if (tipo === 'data') {
            const base = dataLocal ? new Date(`${dataLocal}T12:00:00`) : new Date();
            setMesVisto({ ano: base.getFullYear(), mes: base.getMonth() });
        }
        setPosicao(calcularPosicao(ancoraRef, tipo));
        setPainelAberto(tipo);
    };

    /**
     * Monta o instante a partir dos dois campos. Sem data não há instante;
     * sem hora assume meia-noite, pra data sozinha já valer alguma coisa.
     */
    const emitir = (data, hora) => {
        if (!data) {
            onChange('');
            return;
        }
        const [ano, mes, dia] = data.split('-').map(Number);
        const [hh, mm] = (hora || '00:00').split(':').map(Number);
        const d = new Date(ano, mes - 1, dia, hh || 0, mm || 0, 0, 0);
        if (!Number.isNaN(d.getTime())) onChange(d.toISOString());
    };

    const handleDataDigitada = (e) => {
        const digitos = e.target.value.replace(/\D/g, '').slice(0, 8);

        let mascarado = digitos;
        if (digitos.length > 4) mascarado = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
        else if (digitos.length > 2) mascarado = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
        setTextoData(mascarado);

        if (digitos.length === 8) {
            const nova = `${digitos.slice(4, 8)}-${digitos.slice(2, 4)}-${digitos.slice(0, 2)}`;
            setDataLocal(nova);
            emitir(nova, horaLocal);
        } else if (digitos.length === 0) {
            setDataLocal('');
            onChange('');
        }
    };

    const handleHoraDigitada = (e) => {
        const digitos = e.target.value.replace(/\D/g, '').slice(0, 4);

        let mascarado = digitos;
        if (digitos.length > 2) mascarado = `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
        setHoraLocal(mascarado);

        if (digitos.length === 4) {
            const hh = Math.min(parseInt(digitos.slice(0, 2), 10), 23);
            const mm = Math.min(parseInt(digitos.slice(2, 4), 10), 59);
            const nova = `${pad(hh)}:${pad(mm)}`;
            setHoraLocal(nova);
            emitir(dataLocal, nova);
        }
    };

    /** Aplica uma hora escolhida no painel. Sem data ainda, assume hoje. */
    const aplicarHora = (novaHora) => {
        setHoraLocal(novaHora);

        let data = dataLocal;
        if (!data) {
            const hoje = new Date();
            data = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
            setDataLocal(data);
            setTextoData(`${pad(hoje.getDate())}/${pad(hoje.getMonth() + 1)}/${hoje.getFullYear()}`);
        }

        emitir(data, novaHora);
        setPainelAberto(null);
    };

    const usarHoraAtual = () => {
        const agora = new Date();
        aplicarHora(`${pad(agora.getHours())}:${pad(agora.getMinutes())}`);
    };

    const escolherDia = (dia) => {
        const nova = `${mesVisto.ano}-${pad(mesVisto.mes + 1)}-${pad(dia)}`;
        setDataLocal(nova);
        setTextoData(`${pad(dia)}/${pad(mesVisto.mes + 1)}/${mesVisto.ano}`);
        emitir(nova, horaLocal);
        setPainelAberto(null);
    };

    const irMes = (delta) => setMesVisto((atual) => {
        const d = new Date(atual.ano, atual.mes + delta, 1);
        return { ano: d.getFullYear(), mes: d.getMonth() };
    });

    const HORAS_DO_DIA = Array.from({ length: 24 }, (_, h) => `${pad(h)}:00`);

    const primeiroDiaSemana = new Date(mesVisto.ano, mesVisto.mes, 1).getDay();
    const totalDias = new Date(mesVisto.ano, mesVisto.mes + 1, 0).getDate();
    const celulas = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)];
    const hojeIso = (() => { const h = new Date(); return `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(h.getDate())}`; })();

    const campoBase = `w-full rounded-md border border-slate-700 bg-slate-950 py-2 pl-8 pr-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none ${className}`;
    const iconeBase = 'absolute left-2 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors hover:text-blue-400 disabled:cursor-not-allowed';

    const estiloPainel = posicao
        ? {
            position: 'fixed',
            top: posicao.top,
            left: posicao.left,
            width: posicao.largura,
            transform: posicao.paraCima ? 'translateY(-100%)' : undefined,
        }
        : { display: 'none' };

    return (
        <div className="flex gap-2">
            {/* DATA */}
            <div ref={dataWrapRef} className="relative flex-1">
                <button
                    type="button"
                    onClick={() => alternarPainel('data', dataWrapRef)}
                    disabled={disabled}
                    title="Escolher no calendário"
                    className={iconeBase}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    value={textoData}
                    onChange={handleDataDigitada}
                    disabled={disabled}
                    className={campoBase}
                />
            </div>

            {/* HORA */}
            <div ref={horaWrapRef} className="relative w-28 shrink-0">
                <button
                    type="button"
                    onClick={() => alternarPainel('hora', horaWrapRef)}
                    disabled={disabled}
                    title="Escolher o horário"
                    className={iconeBase}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="hh:mm"
                    maxLength={5}
                    value={horaLocal}
                    onChange={handleHoraDigitada}
                    disabled={disabled}
                    className={campoBase}
                />
            </div>

            {/* PAINÉIS (no body, pra não serem cortados pelo overflow do modal) */}
            {painelAberto && createPortal(
                <div
                    ref={painelRef}
                    style={estiloPainel}
                    className="z-[10000] rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-2xl"
                >
                    {painelAberto === 'data' ? (
                        <>
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
                                    const iso = `${mesVisto.ano}-${pad(mesVisto.mes + 1)}-${pad(dia)}`;
                                    const selecionado = iso === dataLocal;
                                    const ehHoje = iso === hojeIso;
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
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={usarHoraAtual}
                                className="mb-2 w-full rounded-md border border-slate-700 py-1 text-[11px] font-medium text-slate-400 hover:border-blue-500 hover:text-blue-400"
                            >
                                Agora
                            </button>

                            <div className="grid max-h-48 grid-cols-3 gap-1 overflow-y-auto custom-scrollbar">
                                {HORAS_DO_DIA.map((hora) => (
                                    <button
                                        key={hora}
                                        type="button"
                                        onClick={() => aplicarHora(hora)}
                                        className={`rounded py-1 text-xs transition-colors ${
                                            horaLocal === hora
                                                ? 'bg-blue-600 font-bold text-white'
                                                : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        {hora}
                                    </button>
                                ))}
                            </div>

                            <p className="mt-2 text-[10px] text-slate-500">
                                Precisa de minuto quebrado? Digite direto no campo.
                            </p>
                        </>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
