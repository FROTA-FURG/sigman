import { useState } from 'react';
import { router } from '@inertiajs/react';

/*
 * Motivo da inativação/reprogramação, editável depois do fato (ex.: a OS foi
 * reprogramada sem comentário). Quem pode inativar pode escrever; o texto
 * anterior e o autor ficam no histórico da OS.
 */
export default function MotivoInativacao({ os, podeEditar = false }) {
    const [editando, setEditando] = useState(false);
    const [texto, setTexto] = useState(os.inactivation_reason || '');
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState(null);

    const salvar = () => {
        router.put(route('work-orders.inactivation-reason', os.id), { motivo: texto }, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSalvando(true),
            onFinish: () => setSalvando(false),
            onSuccess: () => { setEditando(false); setErro(null); },
            onError: (e) => setErro(e.motivo || 'Não foi possível salvar.'),
        });
    };

    if (editando) {
        return (
            <div className="space-y-2">
                <textarea
                    autoFocus
                    rows="3"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Ex.: embarcação em cruzeiro na data; peça só chega em março"
                    className="w-full resize-none rounded-md border border-orange-500/40 bg-slate-950 p-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-orange-500 focus:outline-none"
                />
                {erro && <p className="text-xs text-red-400">{erro}</p>}
                <div className="flex gap-2">
                    <button type="button" onClick={salvar} disabled={salvando} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50">
                        {salvando ? 'Salvando...' : 'Salvar motivo'}
                    </button>
                    <button type="button" onClick={() => { setEditando(false); setTexto(os.inactivation_reason || ''); setErro(null); }} className="rounded-md px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                        Cancelar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            <p className={`flex-1 whitespace-pre-wrap text-sm ${os.inactivation_reason ? 'text-slate-200' : 'italic text-slate-500'}`}>
                {os.inactivation_reason || 'Nenhum motivo registrado.'}
            </p>
            {podeEditar && (
                <button type="button" onClick={() => setEditando(true)} className="shrink-0 rounded-md border border-orange-500/40 px-2.5 py-1 text-[11px] font-semibold text-orange-300 hover:bg-orange-500/10">
                    {os.inactivation_reason ? 'Editar motivo' : 'Adicionar motivo'}
                </button>
            )}
        </div>
    );
}
