export default function ConfirmRestoreModal({ isOpen, onClose, onConfirm, user }) {
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity p-4">
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 transition-all p-6 text-center">
                
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 mb-4">
                    <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Reativar Funcionário</h3>
                
                <p className="text-sm text-slate-400 mb-6">
                    Tem certeza que deseja reativar <span className="font-semibold text-white">{user.nickname || user.username}</span>? <br className="hidden sm:block" />
                    O registro voltará imediatamente para a lista de tripulação ativa.
                </p>

                <div className="flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="rounded-md px-6 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition">
                        Cancelar
                    </button>
                    <button type="button" onClick={onConfirm} className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 transition ring-1 ring-inset ring-emerald-500/50">
                        Sim, Reativar
                    </button>
                </div>
            </div>
        </div>
    );
}