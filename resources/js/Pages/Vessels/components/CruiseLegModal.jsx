import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import BrDateField from '@/Components/BrDateField';
import { autoria } from './autoriaEtapa';

/*
 * Criar/editar/excluir uma etapa do plano de cruzeiro. Os campos são as
 * colunas da tabela cruise_legs: uma etapa = um intervalo (início e fim),
 * em vez das duas linhas "Início - área" / "Fim - área" da planilha.
 */

const AREAS_PADRAO = ['Oceânico Sul', 'Oceânico Norte', 'Costeiro Sul', 'Costeiro Norte'];
const PORTOS_PADRAO = ['RG', 'Itajaí'];

const vazio = (proximoNumero) => ({
    leg_number: proximoNumero,
    area: '',
    starts_at: '',
    ends_at: '',
    embark_port: '',
    disembark_port: '',
    notes: '',
});

const unicos = (lista) => [...new Set(lista.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export default function CruiseLegModal({ aberto, onClose, vessel, etapa = null, etapas = [] }) {
    const editando = Boolean(etapa);
    const proximoNumero = etapas.reduce((max, e) => Math.max(max, e.legNumber), 0) + 1;

    const [form, setForm] = useState(vazio(proximoNumero));
    const [erros, setErros] = useState({});
    const [salvando, setSalvando] = useState(false);
    const [confirmarExclusao, setConfirmarExclusao] = useState(false);

    useEffect(() => {
        if (!aberto) return;
        setErros({});
        setConfirmarExclusao(false);
        if (etapa) {
            setForm({
                leg_number: etapa.legNumber,
                area: etapa.area,
                starts_at: etapa.startsAt,
                ends_at: etapa.endsAt,
                embark_port: etapa.embarkPort,
                disembark_port: etapa.disembarkPort,
                notes: etapa.notes || '',
            });
        } else {
            // Nova etapa: sugere embarcar onde a anterior desembarcou.
            const ultima = etapas[etapas.length - 1];
            setForm({ ...vazio(proximoNumero), embark_port: ultima?.disembarkPort || '' });
        }
    }, [aberto, etapa]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!aberto) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [aberto, onClose]);

    if (!aberto) return null;

    const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor?.target ? valor.target.value : valor }));

    const opcoes = {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => onClose(),
        onError: (e) => setErros(e),
        onFinish: () => setSalvando(false),
    };

    const salvar = (e) => {
        e.preventDefault();
        setSalvando(true);
        setErros({});
        if (editando) router.put(route('cruise-legs.update', etapa.id), form, opcoes);
        else router.post(route('cruise-legs.store', vessel.id), form, opcoes);
    };

    const excluir = () => {
        setSalvando(true);
        router.delete(route('cruise-legs.destroy', etapa.id), opcoes);
    };

    const areas = unicos([...AREAS_PADRAO, ...etapas.map((e) => e.area)]);
    const portos = unicos([...PORTOS_PADRAO, ...etapas.flatMap((e) => [e.embarkPort, e.disembarkPort])]);

    const rotulo = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400';
    const campo = 'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-blue-500';
    const Erro = ({ k }) => (erros[k] ? <p className="mt-1 text-xs text-red-400">{erros[k]}</p> : null);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
            <form
                onSubmit={salvar}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b203c] shadow-2xl"
            >
                <div className="flex shrink-0 items-start justify-between border-b border-slate-800 px-5 py-3">
                    <div>
                        <h3 className="text-base font-bold text-white">{editando ? `Editar Etapa ${String(etapa.legNumber).padStart(2, '0')}` : 'Nova etapa de cruzeiro'}</h3>
                        <p className="text-xs text-slate-400">{vessel.tag} — {vessel.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    <div className="grid grid-cols-[110px_1fr] gap-3">
                        <div>
                            <label className={rotulo}>Etapa nº</label>
                            <input type="number" min="1" max="999" required value={form.leg_number} onChange={set('leg_number')} className={campo} />
                            <Erro k="leg_number" />
                        </div>
                        <div>
                            <label className={rotulo}>Área</label>
                            <input list="cruzeiro-areas" required value={form.area} onChange={set('area')} placeholder="Ex.: Oceânico Sul" className={campo} />
                            <datalist id="cruzeiro-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
                            <Erro k="area" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={rotulo}>Início</label>
                            <BrDateField value={form.starts_at} onChange={set('starts_at')} />
                            <Erro k="starts_at" />
                        </div>
                        <div>
                            <label className={rotulo}>Fim</label>
                            <BrDateField value={form.ends_at} onChange={set('ends_at')} />
                            <Erro k="ends_at" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={rotulo}>Embarque</label>
                            <input list="cruzeiro-portos" required value={form.embark_port} onChange={set('embark_port')} placeholder="Ex.: RG" className={campo} />
                            <Erro k="embark_port" />
                        </div>
                        <div>
                            <label className={rotulo}>Desembarque</label>
                            <input list="cruzeiro-portos" required value={form.disembark_port} onChange={set('disembark_port')} placeholder="Ex.: Itajaí" className={campo} />
                            <Erro k="disembark_port" />
                        </div>
                        <datalist id="cruzeiro-portos">{portos.map((p) => <option key={p} value={p} />)}</datalist>
                    </div>

                    <div>
                        <label className={rotulo}>Observações <span className="font-normal normal-case tracking-normal text-slate-500">(opcional)</span></label>
                        <textarea rows={2} value={form.notes} onChange={set('notes')} className={campo} />
                        <Erro k="notes" />
                    </div>

                    {editando && (
                        <div className="space-y-0.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-400">
                            {autoria(etapa).map((linha) => <p key={linha}>{linha}</p>)}
                        </div>
                    )}

                    {editando && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                            {confirmarExclusao ? (
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-red-200">
                                    <span>Excluir esta etapa do plano? Não dá para desfazer.</span>
                                    <span className="flex gap-2">
                                        <button type="button" onClick={() => setConfirmarExclusao(false)} className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800">Não</button>
                                        <button type="button" onClick={excluir} disabled={salvando} className="rounded bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-500 disabled:opacity-50">Sim, excluir</button>
                                    </span>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setConfirmarExclusao(true)} className="text-xs font-semibold text-red-400 hover:text-red-300">
                                    Excluir etapa
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 bg-slate-900/40 px-5 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800">Cancelar</button>
                    <button type="submit" disabled={salvando || !form.starts_at || !form.ends_at}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                        {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar etapa'}
                    </button>
                </div>
            </form>
        </div>,
        document.body,
    );
}
