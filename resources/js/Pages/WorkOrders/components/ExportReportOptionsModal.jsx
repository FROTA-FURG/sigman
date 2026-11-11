import { useEffect } from 'react';

/*
 * Opções do "Exportar Relatório" do Andamento: separado por status ou lista
 * única, com ou sem hora-homem e resumido ou completo (cada atividade de
 * cada OS, com quem executou).
 */
function Opcao({ marcado, onChange, titulo, descricao, icone }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!marcado)}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${marcado ? 'border-blue-500/60 bg-blue-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'}`}
        >
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${marcado ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-500'}`}>
                {marcado && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </span>
            <span className="flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">{icone}{titulo}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{descricao}</span>
            </span>
        </button>
    );
}

export default function ExportReportOptionsModal({ isOpen, onClose, quantidade, opcoes, setOpcoes, onGerar, gerando }) {
    useEffect(() => {
        if (!isOpen) return undefined;
        const tecla = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md overflow-hidden rounded-xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-white">Exportar relatório</h3>
                        <p className="text-xs text-slate-400">{quantidade} {quantidade === 1 ? 'OS selecionada' : 'OS selecionadas'} · escolha o que entra no PDF</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" title="Fechar (Esc)">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-2.5 p-5">
                    <p className="text-[11px] text-slate-500">Sempre entram: métricas por status, quadro por embarcação e, em cada OS, a SS vinculada (se houver) e quantas atividades tem.</p>
                    <Opcao
                        marcado={opcoes.porStatus}
                        onChange={(v) => setOpcoes((o) => ({ ...o, porStatus: v }))}
                        titulo="Separar por status"
                        descricao="Seções de atrasadas (em destaque), em andamento, abertas, agendadas, concluídas e canceladas, com a coluna Prazo. Desmarcado: uma lista única por data, sem a coluna Prazo."
                    />
                    <Opcao
                        marcado={opcoes.comConcluidas}
                        onChange={(v) => setOpcoes((o) => ({ ...o, comConcluidas: v }))}
                        titulo="Incluir OS concluídas"
                        descricao="Desmarcado: as concluídas selecionadas ficam fora do PDF (lista, métricas e comparação de Hh)."
                    />
                    <Opcao
                        marcado={opcoes.comHh}
                        onChange={(v) => setOpcoes((o) => ({ ...o, comHh: v }))}
                        titulo="Hora-homem (estimado x executado)"
                        descricao="Cartões de Hh, executado x estimado nas OS concluídas e a tabela para ajustar as próximas estimativas."
                    />
                    <Opcao
                        marcado={opcoes.comAtividades}
                        onChange={(v) => setOpcoes((o) => ({ ...o, comAtividades: v }))}
                        titulo="Relatório completo: atividades de cada OS"
                        descricao="Abaixo de cada OS, cada atividade com descrição, início, fim e quem executou (inclusive pessoas de fora do sistema)."
                    />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-700/60 px-5 py-3">
                    <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancelar</button>
                    <button
                        onClick={onGerar}
                        disabled={gerando}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {gerando ? 'Gerando...' : 'Gerar PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}
