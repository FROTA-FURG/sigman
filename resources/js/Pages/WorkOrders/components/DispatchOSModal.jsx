import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import BrDateInput from '@/Components/BrDateInput';
import { proximaData, temIntervalo } from './InactivateOSModal';

/*
 * Disparo da OS. Se a checagem do estagiário não está aprovada, avisa:
 *  - "Aguardando" (falta algo): dá para disparar mesmo assim, mas o motivo é
 *    obrigatório (o servidor também exige) e vai para o histórico;
 *  - "Pendente": comentário opcional.
 * OS já agendada só pode ser antecipada para Em Andamento.
 * OS atrasada não pode ser agendada na data que já passou: "Agendar" pede o
 * próximo ciclo (o primeiro que cai depois de hoje) ou uma nova data -- a OS
 * atrasada é inativada e nasce outra já agendada (fica no histórico).
 */

const amanha = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
const br = (d) => d.toLocaleDateString('pt-BR');
export default function DispatchOSModal({ isOpen, onClose, os, onConfirm, erro }) {
    const [justificativa, setJustificativa] = useState('');
    const [agendando, setAgendando] = useState(false); // painel "Agendar" da atrasada
    const [modo, setModo] = useState('periodicidade');
    const [novaData, setNovaData] = useState('');
    const [errosAgenda, setErrosAgenda] = useState({});
    const [enviando, setEnviando] = useState(false);
    useEffect(() => {
        if (!isOpen) return;
        setJustificativa(''); setAgendando(false); setNovaData(''); setErrosAgenda({});
        setModo(temIntervalo(os?.periodicity) ? 'periodicidade' : 'nova_data');
    }, [isOpen, os?.id]);

    if (!isOpen || !os) return null;

    const checagem = os.intern_status || 'pending';
    const aguardando = checagem === 'waiting';
    const jaAgendada = os.status === 'scheduled';
    const bloqueado = aguardando && !justificativa.trim();
    const confirmar = (status) => !bloqueado && onConfirm(os.id, status, justificativa.trim());

    // Calcula se é futura ou não para definir qual tela mostrar
    const [dPart] = os.created_at.split('T');
    const [y, m, d] = dPart.split('-');
    const osDate = new Date(y, m - 1, d, 12, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Já agendada: o único passo é antecipar para Em Andamento.
    const isFuture = osDate > today && !jaAgendada;
    const atrasada = osDate < today;

    // Próximo ciclo que cai depois de hoje (o servidor calcula igual).
    let proximoCiclo = null;
    if (temIntervalo(os.periodicity)) {
        proximoCiclo = proximaData(os.periodicity, osDate);
        while (proximoCiclo && proximoCiclo <= today) proximoCiclo = proximaData(os.periodicity, proximoCiclo);
    }
    const podeAgendar = modo === 'periodicidade' ? Boolean(proximoCiclo) : novaData >= amanha();

    const confirmarAgendamento = () => {
        if (!podeAgendar || enviando) return;
        router.post(route('work-orders.inactivate', os.id), {
            modo,
            nova_data: modo === 'nova_data' ? novaData : null,
            motivo: justificativa.trim() || 'OS atrasada reagendada',
            agendar: true,
        }, {
            preserveScroll: true,
            onStart: () => setEnviando(true),
            onFinish: () => setEnviando(false),
            onSuccess: () => onClose(),
            onError: (e) => setErrosAgenda(e),
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-fade-in overflow-hidden">
                
                {/* CABEÇALHO DO MODAL */}
                <div className={`flex items-center gap-3 border-b border-slate-700 px-6 py-4 ${isFuture ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
                    {isFuture ? (
                        <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    ) : (
                        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                    <h3 className="text-lg font-bold text-white">
                        {isFuture || agendando ? 'Agendar Ordem de Serviço' : 'Disparar Ordem de Serviço'}
                    </h3>
                </div>

                {/* CORPO DO MODAL */}
                <div className="px-6 py-6 text-slate-300">
                    <p className="mb-4 font-mono text-sm text-slate-400">OS: <span className="font-bold text-white">{os.os_number}</span></p>

                    {jaAgendada && (
                        <p className="mb-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-200">
                            Esta OS já foi disparada e está <strong>Agendada</strong>. Confirmando, ela passa agora para <strong>Em Andamento</strong>.
                        </p>
                    )}

                    {checagem !== 'approved' && !agendando && (
                        <div className={`mb-4 rounded-lg border p-3 ${aguardando ? 'border-orange-500/40 bg-orange-500/10' : 'border-slate-600 bg-slate-800/60'}`}>
                            <p className={`text-sm font-semibold ${aguardando ? 'text-orange-300' : 'text-slate-200'}`}>
                                {aguardando ? 'O estagiário marcou esta OS como Aguardando.' : 'A checagem do estagiário ainda está pendente.'}
                            </p>
                            {aguardando && os.intern_reason && <p className="mt-1 text-xs text-orange-200/80">Falta: “{os.intern_reason}”</p>}
                            <label className="mt-3 block text-xs font-medium text-slate-300">
                                {aguardando ? <>Motivo para disparar mesmo assim <span className="text-red-400">*</span></> : 'Comentário (opcional)'}
                            </label>
                            <textarea
                                rows="2"
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                placeholder={aguardando ? 'Ex.: peça chega amanhã cedo, equipe já pode iniciar a desmontagem' : 'Ex.: checada por telefone com o estagiário'}
                                className="mt-1 w-full resize-none rounded-md border border-slate-600 bg-slate-950 p-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">Fica registrado no histórico da OS, com seu nome.</p>
                            {erro && <p className="mt-1 text-xs text-red-400">{erro}</p>}
                        </div>
                    )}

                    {atrasada && agendando && (
                        <div className="mb-4 rounded-lg border border-purple-500/40 bg-purple-500/10 p-4">
                            <p className="mb-1 font-semibold text-white">Agendar a OS atrasada</p>
                            <p className="mb-3 text-xs text-slate-400">A data dela ({br(osDate)}) já passou. Esta OS é inativada e nasce outra, já agendada, na data escolhida. Tudo fica no histórico.</p>
                            <div className="space-y-2">
                                {proximoCiclo && (
                                    <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-2.5 text-sm ${modo === 'periodicidade' ? 'border-purple-400 bg-purple-500/10 text-white' : 'border-slate-700 text-slate-300'}`}>
                                        <input type="radio" checked={modo === 'periodicidade'} onChange={() => setModo('periodicidade')} className="text-purple-500 focus:ring-purple-500" />
                                        Próximo ciclo: <strong>{br(proximoCiclo)}</strong>
                                    </label>
                                )}
                                <label className={`flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-2.5 text-sm ${modo === 'nova_data' ? 'border-purple-400 bg-purple-500/10 text-white' : 'border-slate-700 text-slate-300'}`}>
                                    <input type="radio" checked={modo === 'nova_data'} onChange={() => setModo('nova_data')} className="text-purple-500 focus:ring-purple-500" />
                                    Nova data
                                    {modo === 'nova_data' && (
                                        <span className="w-40"><BrDateInput value={novaData} onChange={(v) => setNovaData(v)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-1.5 text-sm text-slate-200 focus:border-purple-500 focus:outline-none" /></span>
                                    )}
                                </label>
                                {modo === 'nova_data' && novaData && novaData < amanha() && <p className="text-xs text-red-400">Escolha uma data a partir de amanhã.</p>}
                                {Object.values(errosAgenda).map((m) => <p key={m} className="text-xs text-red-400">{m}</p>)}
                            </div>
                        </div>
                    )}

                    {isFuture ? (
                        <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
                            <p className="font-semibold text-white mb-3">Esta OS é para uma data futura.</p>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-yellow-400">• Em Andamento:</span> 
                                    <span>Força o início imediato do serviço pela equipe.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-purple-400">• Agendar:</span> 
                                    <span>O sistema a liberará automaticamente na data correta.</span>
                                </li>
                            </ul>
                        </div>
                    ) : !agendando && (
                        <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
                            <p className="font-semibold text-white mb-1">{jaAgendada ? 'Antecipar o início.' : 'Esta OS está no prazo ou atrasada.'}</p>
                            <p className="text-sm text-slate-400">Ela passará imediatamente para o status <span className="font-bold text-yellow-400">Em Andamento</span> e ficará disponível para a equipe técnica.</p>
                        </div>
                    )}
                </div>

                {/* RODAPÉ E BOTÕES DE AÇÃO */}
                <div className="flex w-full flex-row items-center justify-between gap-3 bg-slate-800/50 px-6 py-4 border-t border-slate-700">
                    
                    {/* BOTÃO CANCELAR (Alinhado à esquerda pelo justify-between) */}
                    <button 
                        onClick={onClose} 
                        className="flex-1 rounded-lg px-2 py-2.5 text-center text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>

                    {agendando ? (
                        <>
                            <button
                                onClick={() => setAgendando(false)}
                                className="flex-1 rounded-lg border border-slate-600 px-2 py-2.5 text-center text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={confirmarAgendamento}
                                disabled={!podeAgendar || enviando}
                                className="flex-1 rounded-lg bg-purple-600 px-2 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {enviando ? 'Agendando...' : 'Confirmar agendamento'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* OS futura: antecipar o serviço (fica no centro) */}
                            {isFuture && (
                                <button
                                    onClick={() => confirmar('in_progress')}
                                    disabled={bloqueado}
                                    className="flex-1 rounded-lg border border-yellow-500/50 disabled:cursor-not-allowed disabled:opacity-40 bg-slate-900 px-2 py-2.5 text-center text-sm font-bold text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                                >
                                    Disparar p/ Andamento
                                </button>
                            )}

                            {/* OS atrasada: em vez de agendar na data que passou, escolhe próximo ciclo ou nova data */}
                            {atrasada && (
                                <button
                                    onClick={() => setAgendando(true)}
                                    className="flex-1 rounded-lg border border-purple-500/50 bg-slate-900 px-2 py-2.5 text-center text-sm font-bold text-purple-300 hover:bg-purple-500/10 transition-colors"
                                    title="A data já passou: agendar para o próximo ciclo ou uma nova data"
                                >
                                    Agendar...
                                </button>
                            )}

                            {/* Principal: confirmar disparo/agendamento (à direita) */}
                            <button
                                onClick={() => confirmar(isFuture ? 'scheduled' : 'in_progress')}
                                disabled={bloqueado}
                                title={bloqueado ? 'Escreva o motivo para disparar mesmo assim' : undefined}
                                className={`flex-1 rounded-lg disabled:cursor-not-allowed disabled:opacity-40 px-2 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-colors ${isFuture ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                            >
                                {isFuture ? 'Confirmar Agendamento' : 'Disparar agora'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}