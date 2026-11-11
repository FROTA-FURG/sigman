import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import BrDateTimeFields from '@/Components/BrDateTimeFields';
import ResponsavelField from './ResponsavelField';
import { nomeResponsavel, ultimaAtualizacaoAtividade } from '../lib/os';

/*
 * Atividades da OS dentro do modal da própria OS: lista + lançar/editar/
 * excluir (início, fim, descrição e responsável). Cada ação salva na hora,
 * independente do "Salvar Alterações" da OS. Mesmas rotas do modal de
 * Detalhamento (work-order-activities.*).
 */

const UMA_HORA_MS = 60 * 60 * 1000;
const formatar = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null);
const vazio = (responsavel) => ({ description: '', started_at: '', completed_at: '', responsible_user_id: responsavel, responsible_name: '' });

export default function OsActivities({ os, users = [], podeLancar = true }) {
    const { auth } = usePage().props;
    const [form, setForm] = useState(null); // null = fechado
    const [editando, setEditando] = useState(null);
    const [fimSugerido, setFimSugerido] = useState(false);
    const [erros, setErros] = useState({});
    const [salvando, setSalvando] = useState(false);
    const atividades = os?.activities || [];

    const abrirNova = () => { setEditando(null); setErros({}); setFimSugerido(false); setForm(vazio(auth?.user?.id || '')); };
    const abrirEdicao = (a) => {
        setEditando(a.id); setErros({}); setFimSugerido(false);
        setForm({ description: a.description || '', started_at: a.started_at || '', completed_at: a.completed_at || '', responsible_user_id: a.responsible_user_id || '', responsible_name: a.responsible_name || '' });
    };
    const fechar = () => { setForm(null); setEditando(null); setErros({}); };

    const mudarInicio = (valor) => {
        setForm((f) => {
            const novo = { ...f, started_at: valor };
            if (valor && (!f.completed_at || fimSugerido)) {
                const inicio = new Date(valor);
                if (!Number.isNaN(inicio.getTime())) novo.completed_at = new Date(inicio.getTime() + UMA_HORA_MS).toISOString();
            }
            return novo;
        });
        if (valor) setFimSugerido(true);
    };

    const opcoes = {
        preserveScroll: true,
        preserveState: true,
        onStart: () => setSalvando(true),
        onFinish: () => setSalvando(false),
        onSuccess: () => fechar(),
        onError: (e) => setErros(e),
    };

    const salvar = () => {
        const dados = { ...form, work_order_id: os.id };
        if (editando) router.put(route('work-order-activities.update', editando), dados, opcoes);
        else router.post(route('work-order-activities.store'), dados, opcoes);
    };

    const excluir = (id) => {
        if (window.confirm('Excluir esta atividade? Essa ação não pode ser desfeita.')) {
            router.delete(route('work-order-activities.destroy', id), { preserveScroll: true, preserveState: true });
        }
    };

    const campo = 'w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-300 focus:border-blue-500';

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Atividades Registradas <span className="ml-1 font-normal normal-case text-slate-500">({atividades.length})</span></h4>
                {podeLancar && !form && (
                    <button type="button" onClick={abrirNova} className="flex items-center gap-1 rounded-md bg-blue-600/20 px-2.5 py-1 text-[11px] font-semibold text-blue-300 ring-1 ring-inset ring-blue-500/30 hover:bg-blue-600 hover:text-white">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Nova atividade
                    </button>
                )}
            </div>

            {form && (
                <div className="mb-3 space-y-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-400">Início <span className="text-red-500">*</span></label>
                            <BrDateTimeFields value={form.started_at} onChange={mudarInicio} />
                            {erros.started_at && <span className="text-xs text-red-500">{erros.started_at}</span>}
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-400">
                                Fim {fimSugerido && <span className="ml-1 text-[10px] font-normal text-slate-500">sugerido — ajuste se precisar</span>}
                            </label>
                            <BrDateTimeFields value={form.completed_at} onChange={(v) => { setFimSugerido(false); setForm((f) => ({ ...f, completed_at: v })); }} />
                            {erros.completed_at && <span className="text-xs text-red-500">{erros.completed_at}</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-400">Descrição <span className="text-red-500">*</span></label>
                            <textarea rows="2" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${campo} resize-none`} />
                            {erros.description && <span className="text-xs text-red-500">{erros.description}</span>}
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-400">Responsável</label>
                            <ResponsavelField
                                key={editando || 'nova'}
                                userId={form.responsible_user_id}
                                nome={form.responsible_name}
                                users={users}
                                className={campo}
                                erro={erros.responsible_user_id || erros.responsible_name}
                                onChange={(campos) => setForm((f) => ({ ...f, ...campos }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={fechar} className="rounded-md px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Cancelar</button>
                        <button type="button" onClick={salvar} disabled={salvando || !form.started_at || !form.description.trim()}
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40">
                            {salvando ? 'Salvando...' : editando ? 'Salvar atividade' : 'Adicionar atividade'}
                        </button>
                    </div>
                </div>
            )}

            {atividades.length === 0 && !form ? (
                <p className="rounded-md border border-dashed border-slate-700 py-5 text-center text-xs text-slate-500">Nenhuma atividade registrada nesta OS ainda.</p>
            ) : (
                <div className="space-y-2">
                    {atividades.map((a) => {
                        const responsavel = nomeResponsavel(a) || 'Não informado';
                        const externo = !a.responsible_user && a.responsible_name;
                        const ultima = ultimaAtualizacaoAtividade(a);
                        return (
                            <div key={a.id} className="group rounded-md border border-slate-700/60 bg-slate-900/50 p-3">
                                <div className="flex items-start gap-2">
                                    <p className="flex-1 whitespace-pre-wrap text-sm text-slate-300">{a.description}</p>
                                    {podeLancar && (
                                        <span className="flex shrink-0 gap-1 opacity-60 group-hover:opacity-100">
                                            <button type="button" onClick={() => abrirEdicao(a)} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white" title="Editar atividade">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button type="button" onClick={() => excluir(a.id)} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400" title="Excluir atividade">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-700/40 pt-2 text-[11px]">
                                    <span className="text-slate-500">Início: <span className="text-slate-300">{formatar(a.started_at) || '—'}</span></span>
                                    <span className="text-slate-500">Fim: {a.completed_at ? <span className="text-slate-300">{formatar(a.completed_at)}</span> : <span className="text-yellow-400">Em andamento</span>}</span>
                                    <span className="ml-auto text-slate-500">
                                        Responsável: <span className="text-slate-300">{responsavel}</span>
                                        {externo && <span className="ml-1.5 rounded bg-slate-700/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-slate-400" title="Pessoa fora do sistema">externo</span>}
                                    </span>
                                </div>
                                {ultima && (
                                    <p className="mt-1 text-right text-[10px] text-slate-500">
                                        Lançada/atualizada por <span className="text-slate-400">{ultima.quem}</span> em {ultima.quando}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
