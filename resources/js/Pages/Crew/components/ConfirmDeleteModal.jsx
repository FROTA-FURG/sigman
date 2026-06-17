export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, user }) {
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity p-4">
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 transition-all p-6 text-center">
                
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20 mb-4">
                    <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Confirmar Desligamento</h3>
                
                <p className="text-sm text-slate-400 mb-6">
                    Tem certeza que deseja desligar <span className="font-semibold text-white">{user.nickname || user.username}</span>? <br className="hidden sm:block" />
                    O registro não será apagado, mas será movido para o histórico do sistema.
                </p>

                <div className="flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="rounded-md px-6 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition">
                        Cancelar
                    </button>
                    <button type="button" onClick={onConfirm} className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500 transition ring-1 ring-inset ring-red-500/50">
                        Sim, Desligar
                    </button>
                </div>
            </div>
        </div>
    );
}