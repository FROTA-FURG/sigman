import React from 'react';

export default function DispatchOSModal({ isOpen, onClose, os, onConfirm }) {
    if (!isOpen || !os) return null;

    // Calcula se é futura ou não para definir qual tela mostrar
    const [dPart] = os.created_at.split('T');
    const [y, m, d] = dPart.split('-');
    const osDate = new Date(y, m - 1, d, 12, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isFuture = osDate > today;

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
                        {isFuture ? 'Agendar Ordem de Serviço' : 'Disparar Ordem de Serviço'}
                    </h3>
                </div>

                {/* CORPO DO MODAL */}
                <div className="px-6 py-6 text-slate-300">
                    <p className="mb-4 font-mono text-sm text-slate-400">OS: <span className="font-bold text-white">{os.os_number}</span></p>
                    
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
                    ) : (
                        <div className="rounded-lg bg-slate-800 p-4 border border-slate-700">
                            <p className="font-semibold text-white mb-1">Esta OS está no prazo ou atrasada.</p>
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

                    {/* BOTÃO EXTRA PARA OS FUTURA: Antecipar o serviço (Fica no centro) */}
                    {isFuture && (
                        <button 
                            onClick={() => onConfirm(os.id, 'in_progress')} 
                            className="flex-1 rounded-lg border border-yellow-500/50 bg-slate-900 px-2 py-2.5 text-center text-sm font-bold text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                        >
                            Disparar p/ Andamento
                        </button>
                    )}

                    {/* BOTÃO PRINCIPAL CONFIRMAR/AGENDAR (Alinhado à direita) */}
                    <button 
                        onClick={() => onConfirm(os.id, isFuture ? 'scheduled' : 'in_progress')} 
                        className={`flex-1 rounded-lg px-2 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-colors ${isFuture ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                        {isFuture ? 'Confirmar Agendamento' : 'Confirmar Disparo'}
                    </button>
                </div>
            </div>
        </div>
    );
}