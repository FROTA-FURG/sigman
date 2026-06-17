export default function UserHistoryModal({ isOpen, onClose, historyUsers, onRestore }) {
    if (!isOpen) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity p-4">
            <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col transform overflow-hidden rounded-2xl bg-[#0b203c] shadow-2xl ring-1 ring-slate-700 transition-all">
                
                <div className="shrink-0 border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">Histórico do Sistema</h3>
                        <p className="text-xs text-slate-400">Registro de todos os usuários, incluindo desligados.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400 ring-1 ring-slate-800 rounded-lg">
                            <tr>
                                <th className="px-4 py-3 font-semibold rounded-tl-lg">Funcionário</th>
                                <th className="px-4 py-3 font-semibold">Data de Criação</th>
                                <th className="px-4 py-3 font-semibold">Último Update</th>
                                <th className="px-4 py-3 font-semibold">Data de Desligamento</th>
                                <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {historyUsers && historyUsers.map((user) => (
                                <tr key={user.id} className={`${user.deleted_at ? 'bg-red-900/10 opacity-75' : ''} transition-colors hover:bg-slate-800/30`}>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-white">{user.nickname || user.username}</div>
                                        <div className="text-xs text-slate-500">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        {formatDate(user.updated_at)}
                                        <span className="block text-[10px] text-slate-500">por {user.last_updated_by || 'Sistema'}</span>
                                    </td>
                                    <td className="px-4 py-3 items-center ">
                                        {user.deleted_at ? (
                                            <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                                                {formatDate(user.deleted_at)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">Ativo</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {user.deleted_at && (
                                            <button 
                                                onClick={() => onRestore(user)} 
                                                className="inline-flex items-center rounded-md bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-600/30 hover:bg-emerald-600/20 transition-colors"
                                            >
                                                <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Reativar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="shrink-0 border-t border-slate-800 bg-slate-900/50 px-6 py-4 flex justify-end">
                    <button type="button" onClick={onClose} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 transition">
                        Fechar Histórico
                    </button>
                </div>
            </div>
        </div>
    );
}