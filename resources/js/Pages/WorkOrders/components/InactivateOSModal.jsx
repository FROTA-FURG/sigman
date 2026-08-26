import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import BrDateInput from '@/Components/BrDateInput';

// Espelha App\Services\PeriodicityInterval no backend -- só pra mostrar a
// data prévia antes de confirmar. Quem decide de verdade é o servidor.
const MESES = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6 };
const ANOS = { annual: 1, biennial: 2, triennial: 3, quadrennial: 4, sexennial: 6 };
const DIAS = { daily: 1, weekly: 7, biweekly: 14 };

const PERIODICITY_LABELS = {
    daily: 'Diário', weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal',
    bimonthly: 'Bimestral', quarterly: 'Trimestral', semiannual: 'Semestral',
    annual: 'Anual', biennial: 'Bianual', triennial: 'Trianual',
    quadrennial: 'Quadrienal', sexennial: 'Sexênio', docking: 'Docagem',
};

function temIntervalo(periodicity) {
    return periodicity in DIAS || periodicity in MESES || periodicity in ANOS;
}

function proximaData(periodicity, dataBase) {
    if (!temIntervalo(periodicity)) return null;
    const d = new Date(dataBase);
    if (periodicity in DIAS) d.setDate(d.getDate() + DIAS[periodicity]);
    else if (periodicity in MESES) d.setMonth(d.getMonth() + MESES[periodicity]);
    else d.setFullYear(d.getFullYear() + ANOS[periodicity]);
    return d;
}

const formatBr = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
};

export default function InactivateOSModal({ isOpen, onClose, os }) {
    const [modo, setModo] = useState('periodicidade');
    const [novaData, setNovaData] = useState('');
    const [motivo, setMotivo] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const podeConformePeriodicidade = os && temIntervalo(os.periodicity);
            setModo(podeConformePeriodicidade ? 'periodicidade' : 'nova_data');
            setNovaData('');
            setMotivo('');
        }
    }, [isOpen, os?.id]);

    if (!isOpen || !os) return null;

    const dataAtual = os.created_at.split('T')[0];
    const podeConformePeriodicidade = temIntervalo(os.periodicity);
    const previaAutomatica = podeConformePeriodicidade ? proximaData(os.periodicity, dataAtual) : null;

    const podeConfirmar = modo === 'periodicidade' ? podeConformePeriodicidade : Boolean(novaData);

    const confirmar = () => {
        setProcessing(true);
        router.post(route('work-orders.inactivate', os.id), {
            modo,
            nova_data: modo === 'nova_data' ? novaData : null,
            motivo: motivo.trim() || null,
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-fade-in overflow-hidden">

                <div className="flex items-center gap-3 border-b border-slate-700 bg-orange-500/10 px-6 py-4">
                    <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    <h3 className="text-lg font-bold text-white">Inativar Ordem de Serviço</h3>
                </div>

                <div className="px-6 py-6 text-slate-300">
                    <p className="mb-1 font-mono text-sm text-slate-400">
                        OS: <span className="font-bold text-white">{os.os_number}</span>
                        <span className="mx-2 text-slate-600">•</span>
                        {PERIODICITY_LABELS[os.periodicity] || os.periodicity}
                        <span className="mx-2 text-slate-600">•</span>
                        Data marcada: <span className="text-slate-300">{formatBr(dataAtual)}</span>
                    </p>
                    <p className="mb-5 text-sm text-slate-400 truncate" title={os.description}>{os.description}</p>

                    <p className="mb-3 text-sm text-slate-300">
                        Esta ocorrência não vai acontecer na data marcada. Escolha como reprogramar:
                    </p>

                    <div className="space-y-3">
                        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${modo === 'periodicidade' ? 'border-orange-500/50 bg-orange-500/5' : 'border-slate-700 hover:border-slate-600'} ${!podeConformePeriodicidade ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <input
                                type="radio"
                                name="modo"
                                checked={modo === 'periodicidade'}
                                disabled={!podeConformePeriodicidade}
                                onChange={() => setModo('periodicidade')}
                                className="mt-0.5 h-4 w-4 text-orange-500 focus:ring-orange-500"
                            />
                            <span>
                                <span className="block text-sm font-semibold text-slate-200">Reprogramar conforme a periodicidade</span>
                                <span className="block text-xs text-slate-500">
                                    {podeConformePeriodicidade
                                        ? <>Nova OS em <span className="font-semibold text-orange-400">{formatBr(previaAutomatica)}</span> (data atual + intervalo da periodicidade). Só esta ocorrência muda.</>
                                        : `"${PERIODICITY_LABELS[os.periodicity] || os.periodicity}" não tem um intervalo de calendário fixo -- escolha uma nova data manualmente.`}
                                </span>
                            </span>
                        </label>

                        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${modo === 'nova_data' ? 'border-orange-500/50 bg-orange-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
                            <input
                                type="radio"
                                name="modo"
                                checked={modo === 'nova_data'}
                                onChange={() => setModo('nova_data')}
                                className="mt-0.5 h-4 w-4 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="flex-1">
                                <span className="block text-sm font-semibold text-slate-200">Escolher uma nova data</span>
                                <span className="block text-xs text-slate-500">
                                    Mantém a periodicidade a partir da nova data -- as próximas ocorrências desta mesma tarefa (se já existirem no plano) são reprogramadas junto, respeitando o intervalo.
                                </span>
                                {modo === 'nova_data' && (
                                    <BrDateInput
                                        autoFocus
                                        value={novaData}
                                        onChange={(value) => setNovaData(value)}
                                        className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                )}
                            </span>
                        </label>
                    </div>

                    <div className="mt-4">
                        <label className="mb-1 block text-xs font-medium text-slate-400">Motivo (opcional)</label>
                        <textarea
                            rows="2"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Por que esta ocorrência não vai acontecer na data marcada..."
                            className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                    </div>
                </div>

                <div className="flex w-full flex-row items-center justify-between gap-3 border-t border-slate-700 bg-slate-800/50 px-6 py-4">
                    <button onClick={onClose} className="flex-1 rounded-lg px-2 py-2.5 text-center text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={confirmar}
                        disabled={!podeConfirmar || processing}
                        className="flex-1 rounded-lg bg-orange-600 px-2 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                    >
                        {processing ? 'Inativando...' : 'Confirmar Inativação'}
                    </button>
                </div>
            </div>
        </div>
    );
}
