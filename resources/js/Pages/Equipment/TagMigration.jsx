import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Combobox de busca (tag ou descrição) pra escolher um equipamento já
 * cadastrado no banco -- o dropdown nativo não dá pra filtrar, e a lista
 * de 20+ equipamentos por nome puro é difícil de escanear.
 */
function EquipmentCombobox({ candidatos, value, sugerido, onChange }) {
    const [aberto, setAberto] = useState(false);
    const [busca, setBusca] = useState('');
    const wrapperRef = useRef(null);

    const selecionado = candidatos.find(c => c.id === value) || null;

    useEffect(() => {
        if (!aberto) return;
        const fechaFora = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAberto(false);
        };
        document.addEventListener('mousedown', fechaFora);
        return () => document.removeEventListener('mousedown', fechaFora);
    }, [aberto]);

    const termo = busca.trim().toLowerCase();
    const filtrados = termo
        ? candidatos.filter(c => c.tag_number.toLowerCase().includes(termo) || c.name.toLowerCase().includes(termo))
        : candidatos;

    const escolher = (c) => {
        onChange(c.id);
        setBusca('');
        setAberto(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={aberto ? busca : (selecionado ? `${selecionado.tag_number} — ${selecionado.name}` : '')}
                onChange={(e) => { setBusca(e.target.value); if (!aberto) setAberto(true); }}
                onFocus={() => { setAberto(true); setBusca(''); }}
                placeholder="Buscar por tag ou descrição..."
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 pr-7 text-sm text-slate-300 focus:border-blue-500"
            />
            {value && !aberto && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    title="Limpar seleção"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
                >
                    ✕
                </button>
            )}
            {aberto && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-700 bg-slate-900 shadow-2xl">
                    {filtrados.length === 0 && (
                        <p className="p-2 text-xs text-slate-500">Nenhum equipamento encontrado.</p>
                    )}
                    {filtrados.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => escolher(c)}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-800 ${c.id === value ? 'bg-blue-500/10 text-blue-300' : 'text-slate-300'}`}
                        >
                            <span className="font-mono">{c.tag_number}</span> — {c.name}
                            {sugerido?.id === c.id && <span className="ml-2 text-[10px] font-semibold text-emerald-400">sugestão</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Ferramenta local (dev only) pra confirmar, uma linha de cada vez, o
 * de-para entre o tag antigo (o que já está em uso no sistema) e o tag
 * novo da árvore de classificação (ISO 14224). Ver EquipmentTagMigrationController.
 */
export default function TagMigration({ vessel, vesselsDisponiveis = [], pendentes = [], candidatos = [], jaMigrados = [], malformados = [], ambiguos = [], totalLimpo = 0 }) {
    const [busy, setBusy] = useState(null); // tag_novo em processamento
    const [toast, setToast] = useState(null);
    const [confirmandoCriacao, setConfirmandoCriacao] = useState(null); // tag_novo aguardando 2º clique
    const [mostrarMalformados, setMostrarMalformados] = useState(false);
    const [mostrarAmbiguos, setMostrarAmbiguos] = useState(false);
    const [selecao, setSelecao] = useState({}); // { [tag_novo]: equipment_id }

    const avisar = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
    };

    const sugestao = (linha) => {
        if (!linha.tag_antigo) return null;
        return candidatos.find(c => c.tag_number === linha.tag_antigo) || null;
    };

    const vincular = (linha) => {
        const equipmentId = selecao[linha.tag_novo];
        if (!equipmentId) return;
        setBusy(linha.tag_novo);
        router.post(route('equipments.tag-migration.vincular'), {
            equipment_id: equipmentId,
            tag_novo: linha.tag_novo,
        }, {
            preserveScroll: true,
            onSuccess: () => avisar(`Vinculado: ${linha.tag_novo}`),
            onError: () => avisar('Erro ao vincular -- confira o console.'),
            onFinish: () => setBusy(null),
        });
    };

    const criarNovo = (linha) => {
        if (confirmandoCriacao !== linha.tag_novo) {
            setConfirmandoCriacao(linha.tag_novo);
            return;
        }
        setBusy(linha.tag_novo);
        router.post(route('equipments.tag-migration.criar-novo'), {
            vessel: vessel.tag,
            tag_novo: linha.tag_novo,
            nome: linha.equipamento,
        }, {
            preserveScroll: true,
            onSuccess: () => avisar(`Equipamento novo criado: ${linha.tag_novo}`),
            onError: () => avisar('Erro ao criar -- confira o console.'),
            onFinish: () => { setBusy(null); setConfirmandoCriacao(null); },
        });
    };

    const ignorar = (linha) => {
        setBusy(linha.tag_novo);
        router.post(route('equipments.tag-migration.ignorar'), {
            vessel: vessel.tag,
            tag_novo: linha.tag_novo,
        }, {
            preserveScroll: true,
            onSuccess: () => avisar('Deixado de lado por enquanto.'),
            onFinish: () => setBusy(null),
        });
    };

    const desfazer = (equipment) => {
        setBusy(equipment.id);
        router.post(route('equipments.tag-migration.desfazer'), {
            equipment_id: equipment.id,
        }, {
            preserveScroll: true,
            onSuccess: () => avisar(`Desfeito: ${equipment.tag_number} voltou pro tag antigo.`),
            onFinish: () => setBusy(null),
        });
    };

    const totalConfirmado = jaMigrados.length;
    const totalPendente = pendentes.length;

    return (
        <SIGMANLayout>
            <Head title="Migração de Tags" />

            <div className="mx-auto max-w-6xl px-4 py-8 text-slate-200">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-white">Migração de Tags -- {vessel.name}</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Ferramenta local: confirme, um equipamento de cada vez, a ligação entre o tag que já está em uso e o tag novo da árvore de classificação (ISO 14224).
                    </p>

                    {vesselsDisponiveis.length > 1 && (
                        <div className="mt-4 flex gap-2 border-b border-slate-800">
                            {vesselsDisponiveis.map((v) => (
                                <Link
                                    key={v.tag}
                                    href={route('equipments.tag-migration', { vessel: v.tag })}
                                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                                        v.tag === vessel.tag
                                            ? 'border-b-2 border-blue-500 text-blue-400'
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {v.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                        <span><span className="font-bold text-emerald-400">{totalConfirmado}</span> confirmados</span>
                        <span><span className="font-bold text-amber-400">{totalPendente}</span> pendentes</span>
                        <span><span className="font-bold text-slate-500">{malformados.length}</span> excluídos (tag incompleto na planilha)</span>
                        {ambiguos.length > 0 && (
                            <span><span className="font-bold text-orange-400">{ambiguos.length}</span> ambíguos (mais de 1 equipamento pro mesmo tag)</span>
                        )}
                        <span className="text-slate-600">{totalLimpo} linhas ao todo na planilha limpa</span>
                    </div>
                </div>

                {toast && (
                    <div className="fixed right-6 top-6 z-50 rounded-lg border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm text-emerald-300 shadow-xl">
                        {toast}
                    </div>
                )}

                {/* PENDENTES */}
                <div className="space-y-3">
                    {pendentes.length === 0 && (
                        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
                            Nenhuma linha pendente. 🎉
                        </div>
                    )}

                    {pendentes.map((linha) => {
                        const sugerido = sugestao(linha);
                        const valorSelecionado = selecao[linha.tag_novo] ?? (sugerido?.id ?? '');
                        const equipamentoSelecionado = candidatos.find(c => c.id === valorSelecionado) || null;

                        return (
                            <div key={linha.tag_novo} className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                                <div className="grid grid-cols-1 divide-y divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                                    {/* JÁ CADASTRADO NO SISTEMA */}
                                    <div className="p-4">
                                        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Já cadastrado no sistema</h3>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">Selecionar equipamento existente no banco:</label>
                                        <EquipmentCombobox
                                            candidatos={candidatos}
                                            value={valorSelecionado}
                                            sugerido={sugerido}
                                            onChange={(id) => setSelecao((s) => ({ ...s, [linha.tag_novo]: id }))}
                                        />
                                        {equipamentoSelecionado && (
                                            <p className="mt-2 text-xs text-slate-500">
                                                Tag atual: <span className="font-mono text-slate-300">{equipamentoSelecionado.tag_number}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* NOVA FORMATAÇÃO */}
                                    <div className="p-4">
                                        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nova Formatação</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                                                        <th className="pb-1 pr-3 font-medium">Planta</th>
                                                        <th className="pb-1 pr-3 font-medium">Seção</th>
                                                        <th className="pb-1 pr-3 font-medium">Sistema</th>
                                                        <th className="pb-1 pr-3 font-medium">Equipamento</th>
                                                        <th className="pb-1 pr-3 font-medium">Tag Antigo</th>
                                                        <th className="pb-1 font-medium">Tag Novo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="align-top text-slate-200">
                                                        <td className="pr-3 py-0.5">{vessel.tag}</td>
                                                        <td className="pr-3 py-0.5">{linha.secao}</td>
                                                        <td className="pr-3 py-0.5">{linha.sistema}</td>
                                                        <td className="pr-3 py-0.5">{linha.equipamento}</td>
                                                        <td className="pr-3 py-0.5 font-mono">
                                                            {linha.tag_antigo
                                                                ? linha.tag_antigo
                                                                : <span className="italic text-slate-600">não informado</span>}
                                                        </td>
                                                        <td className="py-0.5 font-mono font-bold text-blue-400">{linha.tag_novo}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        {linha.componentes_sugeridos?.length > 0 && (
                                            <p className="mt-2 text-[11px] text-slate-500">
                                                Componentes na planilha (nível opcional, cadastre depois se quiser): {linha.componentes_sugeridos.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-950/40 px-4 py-3">
                                    <button
                                        type="button"
                                        disabled={busy === linha.tag_novo || !valorSelecionado}
                                        onClick={() => vincular(linha)}
                                        className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                                    >
                                        Vincular
                                    </button>

                                    <button
                                        type="button"
                                        disabled={busy === linha.tag_novo}
                                        onClick={() => criarNovo(linha)}
                                        className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                                            confirmandoCriacao === linha.tag_novo
                                                ? 'bg-orange-600 text-white hover:bg-orange-500'
                                                : 'border border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400'
                                        }`}
                                    >
                                        {confirmandoCriacao === linha.tag_novo ? 'Confirmar criação?' : 'Novo equipamento (sem equivalente)'}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={busy === linha.tag_novo}
                                        onClick={() => ignorar(linha)}
                                        className="ml-auto rounded-md px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-300"
                                    >
                                        Pular por enquanto
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* JÁ MIGRADOS */}
                {jaMigrados.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Confirmados</h2>
                        <div className="space-y-2">
                            {jaMigrados.map((e) => (
                                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                                    <p className="text-sm">
                                        <span className="font-mono text-slate-500 line-through">{e.tag_antigo}</span>
                                        {' → '}
                                        <span className="font-mono font-bold text-emerald-400">{e.tag_number}</span>
                                        <span className="ml-2 text-slate-400">{e.name}</span>
                                    </p>
                                    <button
                                        type="button"
                                        disabled={busy === e.id}
                                        onClick={() => desfazer(e)}
                                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-400"
                                    >
                                        Desfazer
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* EXCLUÍDOS */}
                {malformados.length > 0 && (
                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={() => setMostrarMalformados((v) => !v)}
                            className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
                        >
                            {mostrarMalformados ? '▾' : '▸'} Excluídos desta rodada ({malformados.length}) -- tag incompleto na planilha
                        </button>
                        {mostrarMalformados && (
                            <div className="mt-3 space-y-1">
                                {malformados.map((m, i) => (
                                    <p key={i} className="text-xs text-slate-600">
                                        <span className="font-mono">{m.tag_novo}</span> -- {m.equipamento}
                                        {m.tag_antigo ? <> (tag antigo: <span className="font-mono">{m.tag_antigo}</span>)</> : null}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* AMBÍGUOS */}
                {ambiguos.length > 0 && (
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={() => setMostrarAmbiguos((v) => !v)}
                            className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
                        >
                            {mostrarAmbiguos ? '▾' : '▸'} Ambíguos ({ambiguos.length}) -- mais de 1 equipamento apontando pro mesmo tag novo
                        </button>
                        {mostrarAmbiguos && (
                            <div className="mt-3 space-y-1">
                                {ambiguos.map((a, i) => (
                                    <p key={i} className="text-xs text-slate-600">
                                        <span className="font-mono">{a.tag_novo}</span> -- {a.equipamentos?.join(' / ')}
                                        {a.tags_antigos_conflitantes ? <> (tags antigos conflitantes: {a.tags_antigos_conflitantes.join(', ')})</> : null}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </SIGMANLayout>
    );
}
