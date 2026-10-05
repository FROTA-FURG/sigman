import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIANCA, sugerirVinculos } from './tagMigrationMatch';

/**
 * Combobox de busca genérico: o dropdown nativo não filtra, e as listas
 * (20+ equipamentos, 60+ linhas do manifesto) são difíceis de escanear.
 */
function Combobox({ itens, value, onChange, chave, rotulo, buscaEm, placeholder, sugeridoChave, extra }) {
    const [aberto, setAberto] = useState(false);
    const [busca, setBusca] = useState('');
    const wrapperRef = useRef(null);

    const selecionado = itens.find((i) => chave(i) === value) || null;

    useEffect(() => {
        if (!aberto) return;
        const fechaFora = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAberto(false);
        };
        document.addEventListener('mousedown', fechaFora);
        return () => document.removeEventListener('mousedown', fechaFora);
    }, [aberto]);

    const termo = busca.trim().toLowerCase();
    const filtrados = termo ? itens.filter((i) => buscaEm(i).toLowerCase().includes(termo)) : itens;

    const escolher = (i) => {
        onChange(chave(i));
        setBusca('');
        setAberto(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={aberto ? busca : (selecionado ? rotulo(selecionado) : '')}
                onChange={(e) => { setBusca(e.target.value); if (!aberto) setAberto(true); }}
                onFocus={() => { setAberto(true); setBusca(''); }}
                placeholder={placeholder}
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 pr-7 text-sm text-slate-300 focus:border-blue-500"
            />
            {value && !aberto && (
                <button type="button" onClick={() => onChange('')} title="Limpar seleção" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400">✕</button>
            )}
            {aberto && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-700 bg-slate-900 shadow-2xl">
                    {filtrados.length === 0 && <p className="p-2 text-xs text-slate-500">Nada encontrado.</p>}
                    {filtrados.map((i) => (
                        <button
                            key={chave(i)}
                            type="button"
                            onClick={() => escolher(i)}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-800 ${chave(i) === value ? 'bg-blue-500/10 text-blue-300' : 'text-slate-300'}`}
                        >
                            {rotulo(i)}
                            {extra?.(i)}
                            {sugeridoChave === chave(i) && <span className="ml-2 text-[10px] font-semibold text-emerald-400">sugestão</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function BadgeConfianca({ sugestao }) {
    if (!sugestao) return null;
    const c = CONFIANCA[sugestao.confianca];
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${c.cls}`} title={sugestao.motivo}>
            {c.rot}{sugestao.motivo ? ` · ${sugestao.motivo}` : ''}
        </span>
    );
}

function Contador({ valor, rotulo, cor, onClick, ativo }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg border px-3 py-2 text-left transition ${ativo ? 'border-blue-500/60 bg-blue-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'}`}
        >
            <p className={`text-xl font-bold leading-none ${cor}`}>{valor}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{rotulo}</p>
        </button>
    );
}

/**
 * Ferramenta (dev only) pra confirmar o de-para entre o tag antigo (em uso no
 * sistema) e o tag novo da árvore de classificação (ISO 14224).
 *
 * Duas visões do mesmo problema:
 *  - Equipamentos do sistema ainda sem vínculo: o que tem OS (sobretudo do
 *    Plano de 52 semanas) precisa ser vinculado, não recriado -- senão as OS
 *    ficam presas ao equipamento antigo.
 *  - Linhas do manifesto pendentes: as que não casam com nada são candidatas
 *    a "novo equipamento".
 *
 * Vincular mantém o mesmo equipamento (mesmo id): só troca a tag e reescreve
 * o snapshot das OS, então o Plano de 52 semanas segue funcionando.
 * Ver EquipmentTagMigrationController.
 */
export default function TagMigration({
    vessel, vesselsDisponiveis = [], pendentes = [], candidatos = [], jaMigrados = [], criadosNovos = [],
    malformados = [], ambiguos = [], totalLimpo = 0,
}) {
    const [busy, setBusy] = useState(null);
    const [toast, setToast] = useState(null);
    const [confirmando, setConfirmando] = useState(null); // chave da ação aguardando 2º clique
    const [mostrarMalformados, setMostrarMalformados] = useState(false);
    const [mostrarAmbiguos, setMostrarAmbiguos] = useState(false);
    const [selecao, setSelecao] = useState({}); // { [tag_novo]: equipment_id }
    const [linhaEscolhida, setLinhaEscolhida] = useState({}); // { [equipment_id]: tag_novo }
    const [filtroLinhas, setFiltroLinhas] = useState('todas'); // 'todas' | 'sugeridas' | 'novos'

    const avisar = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 5000);
    };

    const sugestoes = useMemo(() => sugerirVinculos(candidatos, pendentes), [candidatos, pendentes]);

    // Prioridade: quem tem OS do Plano de 52 semanas primeiro.
    const semVinculo = useMemo(
        () => [...candidatos].sort((a, b) => (b.os_plano_52 - a.os_plano_52) || (b.os_total - a.os_total) || a.tag_number.localeCompare(b.tag_number)),
        [candidatos],
    );
    const comPlano = semVinculo.filter((e) => e.os_plano_52 > 0);
    const comPlanoSemSugestao = comPlano.filter((e) => !sugestoes.porEquipamento[e.id]);
    const provaveisNovos = pendentes.filter((l) => !sugestoes.porLinha[l.tag_novo]);

    // Equipamento criado como "novo" que parece ser um antigo ainda sem vínculo.
    const duplicados = useMemo(() => criadosNovos.map((novo) => {
        const parecido = sugerirVinculos(candidatos, [{ tag_novo: novo.tag_number, equipamento: novo.name, tag_antigo: null }]).porLinha[novo.tag_number];
        return { novo, parecido: parecido?.equipamento || null };
    }), [criadosNovos, candidatos]);

    const linhasVisiveis = filtroLinhas === 'novos'
        ? provaveisNovos
        : filtroLinhas === 'sugeridas'
            ? pendentes.filter((l) => sugestoes.porLinha[l.tag_novo])
            : pendentes;

    const postVincular = (equipamento, tagNovo, chaveBusy) => {
        setBusy(chaveBusy);
        router.post(route('equipments.tag-migration.vincular'), {
            equipment_id: equipamento.id,
            tag_novo: tagNovo,
        }, {
            preserveScroll: true,
            onSuccess: () => avisar(`Vinculado: ${equipamento.tag_number} → ${tagNovo}. ${equipamento.os_total} OS atualizada(s), ${equipamento.os_plano_52} do Plano de 52 semanas.`),
            onError: () => avisar('Erro ao vincular — confira o console.'),
            onFinish: () => { setBusy(null); setConfirmando(null); },
        });
    };

    const vincularPelaLinha = (linha, equipamentoId) => {
        const e = candidatos.find((c) => c.id === equipamentoId);
        if (!e) return;
        postVincular(e, linha.tag_novo, linha.tag_novo);
    };

    const vincularPeloEquipamento = (e, tagNovo) => {
        const chave = `eq-${e.id}`;
        if (confirmando !== chave) { setConfirmando(chave); return; }
        postVincular(e, tagNovo, chave);
    };

    const criarNovo = (linha) => {
        const chave = `novo-${linha.tag_novo}`;
        if (confirmando !== chave) { setConfirmando(chave); return; }
        setBusy(linha.tag_novo);
        router.post(route('equipments.tag-migration.criar-novo'), {
            vessel: vessel.tag,
            tag_novo: linha.tag_novo,
            nome: linha.equipamento,
        }, {
            preserveScroll: true,
            onSuccess: () => avisar(`Equipamento novo criado: ${linha.tag_novo}`),
            onError: () => avisar('Erro ao criar — confira o console.'),
            onFinish: () => { setBusy(null); setConfirmando(null); },
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

    const irParaLinha = (tagNovo) => {
        setFiltroLinhas('todas');
        setTimeout(() => document.getElementById(`linha-${tagNovo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    };

    const rotuloLinha = (l) => `${l.tag_novo} — ${l.equipamento}`;

    return (
        <SIGMANLayout>
            <Head title="Migração de Tags" />

            <div className="mx-auto max-w-6xl px-4 py-8 text-slate-200">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-white">Migração de Tags — {vessel.name}</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Ligue cada equipamento já cadastrado ao tag novo da árvore de classificação (ISO 14224). Vincular mantém o mesmo
                        equipamento e todas as OS dele — inclusive as futuras do Plano de 52 semanas — passando a usar o tag novo.
                    </p>

                    {vesselsDisponiveis.length > 1 && (
                        <div className="mt-4 flex gap-2 border-b border-slate-800">
                            {vesselsDisponiveis.map((v) => (
                                <Link
                                    key={v.tag}
                                    href={route('equipments.tag-migration', { vessel: v.tag })}
                                    className={`px-3 py-2 text-sm font-medium transition-colors ${v.tag === vessel.tag ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {v.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        <Contador valor={jaMigrados.length} rotulo="Confirmados" cor="text-emerald-400" />
                        <Contador valor={semVinculo.length} rotulo="Sem vínculo no sistema" cor="text-amber-400" />
                        <Contador valor={comPlano.length} rotulo="… com OS do plano 52 sem." cor="text-orange-400" />
                        <Contador valor={Object.keys(sugestoes.porEquipamento).length} rotulo="Sugestões prontas" cor="text-blue-300"
                                  onClick={() => setFiltroLinhas('sugeridas')} ativo={filtroLinhas === 'sugeridas'} />
                        <Contador valor={provaveisNovos.length} rotulo="Prováveis novos" cor="text-purple-300"
                                  onClick={() => setFiltroLinhas('novos')} ativo={filtroLinhas === 'novos'} />
                        <Contador valor={pendentes.length} rotulo={`Linhas pendentes de ${totalLimpo}`} cor="text-slate-200"
                                  onClick={() => setFiltroLinhas('todas')} ativo={filtroLinhas === 'todas'} />
                    </div>

                    {comPlanoSemSugestao.length > 0 && (
                        <p className="mt-3 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
                            {comPlanoSemSugestao.length} equipamento{comPlanoSemSugestao.length === 1 ? '' : 's'} com OS do Plano de 52 semanas sem sugestão automática —
                            escolha a linha manualmente na tabela abaixo. Não use "Novo equipamento" para eles: as OS ficariam no equipamento antigo.
                        </p>
                    )}
                </div>

                {toast && (
                    <div className="fixed right-6 top-6 z-50 max-w-md rounded-lg border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm text-emerald-300 shadow-xl">
                        {toast}
                    </div>
                )}

                {/* DUPLICADOS PROVÁVEIS */}
                {duplicados.some((d) => d.parecido) && (
                    <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                        <h2 className="text-sm font-semibold text-red-300">Possível duplicado</h2>
                        <p className="mt-1 text-xs text-slate-400">
                            Estes foram criados como "novo equipamento", mas parecem ser um equipamento antigo que ainda está sem vínculo (e que tem as OS).
                            Confira: o certo seria vincular o antigo e não manter os dois.
                        </p>
                        <ul className="mt-2 space-y-1 text-xs">
                            {duplicados.filter((d) => d.parecido).map(({ novo, parecido }) => (
                                <li key={novo.id} className="text-slate-300">
                                    <span className="font-mono text-red-300">{novo.tag_number}</span> {novo.name} ({novo.os_total} OS)
                                    {' ≈ '}
                                    <span className="font-mono text-amber-300">{parecido.tag_number}</span> {parecido.name} ({parecido.os_total} OS, {parecido.os_plano_52} do plano)
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* EQUIPAMENTOS DO SISTEMA SEM VÍNCULO */}
                <section className="mb-8">
                    <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Equipamentos do sistema sem vínculo</h2>
                    <p className="mb-3 text-xs text-slate-500">Ordenados pelas OS do Plano de 52 semanas. Clique em Vincular duas vezes para confirmar.</p>

                    {semVinculo.length === 0 ? (
                        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-500">Todos os equipamentos já estão vinculados. 🎉</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Equipamento (tag atual)</th>
                                        <th className="px-3 py-2 text-right">OS</th>
                                        <th className="px-3 py-2 text-right">Plano 52</th>
                                        <th className="min-w-[320px] px-3 py-2 text-left">Tag novo</th>
                                        <th className="px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {semVinculo.map((e) => {
                                        const sug = sugestoes.porEquipamento[e.id];
                                        const escolhida = linhaEscolhida[e.id] ?? sug?.linha.tag_novo ?? '';
                                        const linha = pendentes.find((l) => l.tag_novo === escolhida);
                                        const chave = `eq-${e.id}`;
                                        return (
                                            <tr key={e.id} className={`align-top ${e.os_plano_52 > 0 ? '' : 'opacity-80'}`}>
                                                <td className="px-3 py-2.5">
                                                    <p className="font-mono text-slate-200">{e.tag_number}</p>
                                                    <p className="text-slate-400">{e.name}</p>
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{e.os_total}</td>
                                                <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${e.os_plano_52 > 0 ? 'text-orange-300' : 'text-slate-600'}`}>{e.os_plano_52}</td>
                                                <td className="px-3 py-2.5">
                                                    <Combobox
                                                        itens={pendentes}
                                                        value={escolhida}
                                                        onChange={(t) => setLinhaEscolhida((s) => ({ ...s, [e.id]: t }))}
                                                        chave={(l) => l.tag_novo}
                                                        rotulo={rotuloLinha}
                                                        buscaEm={(l) => `${l.tag_novo} ${l.equipamento} ${l.sistema} ${l.tag_antigo || ''}`}
                                                        placeholder={sug ? 'Buscar linha do manifesto…' : `Sem sugestão — palpite: ${sugestoes.melhorLinha[e.id]?.equipamento || '—'}`}
                                                        sugeridoChave={sug?.linha.tag_novo}
                                                        extra={(l) => <span className="ml-1 text-[10px] text-slate-500">· {l.sistema}</span>}
                                                    />
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        {sug && escolhida === sug.linha.tag_novo && <BadgeConfianca sugestao={sug} />}
                                                        {linha && (
                                                            <button type="button" onClick={() => irParaLinha(linha.tag_novo)} className="text-[10px] text-blue-400 hover:underline">
                                                                {linha.secao} › {linha.sistema}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                                    <button
                                                        type="button"
                                                        disabled={!escolhida || busy === chave}
                                                        onClick={() => vincularPeloEquipamento(e, escolhida)}
                                                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 ${confirmando === chave ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                                        title={escolhida ? `${e.tag_number} → ${escolhida}` : 'Escolha a linha do manifesto'}
                                                    >
                                                        {confirmando === chave ? `Confirmar (${e.os_total} OS)` : 'Vincular'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* LINHAS DO MANIFESTO PENDENTES */}
                <section>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Linhas da nova árvore pendentes</h2>
                            <p className="text-xs text-slate-500">"Prováveis novos" não casam com nenhum equipamento cadastrado — são candidatos a Novo equipamento.</p>
                        </div>
                        <div className="flex rounded-lg bg-slate-900 p-0.5 text-xs">
                            {[['todas', `Todas (${pendentes.length})`], ['sugeridas', `Com sugestão (${Object.keys(sugestoes.porLinha).length})`], ['novos', `Prováveis novos (${provaveisNovos.length})`]].map(([k, rot]) => (
                                <button key={k} type="button" onClick={() => setFiltroLinhas(k)}
                                        className={`rounded-md px-3 py-1 font-medium transition ${filtroLinhas === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                    {rot}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {linhasVisiveis.length === 0 && (
                            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-500">Nenhuma linha neste filtro.</div>
                        )}

                        {linhasVisiveis.map((linha) => {
                            const sug = sugestoes.porLinha[linha.tag_novo];
                            const valorSelecionado = selecao[linha.tag_novo] ?? (sug?.equipamento.id ?? '');
                            const equipamentoSelecionado = candidatos.find((c) => c.id === valorSelecionado) || null;
                            const chaveNovo = `novo-${linha.tag_novo}`;

                            return (
                                <div key={linha.tag_novo} id={`linha-${linha.tag_novo}`} className={`overflow-hidden rounded-lg border bg-slate-900 ${sug ? 'border-blue-500/30' : 'border-slate-700'}`}>
                                    <div className="grid grid-cols-1 divide-y divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                                        {/* JÁ CADASTRADO NO SISTEMA */}
                                        <div className="p-4">
                                            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Já cadastrado no sistema
                                                {sug && valorSelecionado === sug.equipamento.id && <BadgeConfianca sugestao={sug} />}
                                                {!sug && <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-purple-300 ring-1 ring-inset ring-purple-500/40">Provável novo</span>}
                                            </h3>
                                            <label className="mb-1 block text-xs font-medium text-slate-400">Selecionar equipamento existente no banco:</label>
                                            <Combobox
                                                itens={candidatos}
                                                value={valorSelecionado}
                                                onChange={(id) => setSelecao((s) => ({ ...s, [linha.tag_novo]: id }))}
                                                chave={(c) => c.id}
                                                rotulo={(c) => `${c.tag_number} — ${c.name}`}
                                                buscaEm={(c) => `${c.tag_number} ${c.name}`}
                                                placeholder="Buscar por tag ou descrição..."
                                                sugeridoChave={sug?.equipamento.id}
                                                extra={(c) => (c.os_plano_52 > 0 ? <span className="ml-1 text-[10px] text-orange-300">· {c.os_plano_52} OS plano 52</span> : null)}
                                            />
                                            {equipamentoSelecionado && (
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Tag atual: <span className="font-mono text-slate-300">{equipamentoSelecionado.tag_number}</span>
                                                    {' · '}{equipamentoSelecionado.os_total} OS ({equipamentoSelecionado.os_plano_52} do Plano de 52 semanas) passam para o tag novo
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
                                                            <td className="py-0.5 pr-3">{vessel.tag}</td>
                                                            <td className="py-0.5 pr-3">{linha.secao}</td>
                                                            <td className="py-0.5 pr-3">{linha.sistema}</td>
                                                            <td className="py-0.5 pr-3">{linha.equipamento}</td>
                                                            <td className="py-0.5 pr-3 font-mono">
                                                                {linha.tag_antigo ? linha.tag_antigo : <span className="italic text-slate-600">não informado</span>}
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
                                            onClick={() => vincularPelaLinha(linha, valorSelecionado)}
                                            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                                        >
                                            Vincular
                                        </button>

                                        <button
                                            type="button"
                                            disabled={busy === linha.tag_novo}
                                            onClick={() => criarNovo(linha)}
                                            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${confirmando === chaveNovo ? 'bg-orange-600 text-white hover:bg-orange-500' : 'border border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400'}`}
                                        >
                                            {confirmando === chaveNovo
                                                ? (sug ? 'Tem sugestão de vínculo — criar mesmo assim?' : 'Confirmar criação?')
                                                : 'Novo equipamento (sem equivalente)'}
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
                </section>

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
                                        <span className="ml-2 text-xs text-slate-500">{e.os_total} OS · {e.os_plano_52} plano 52</span>
                                    </p>
                                    <button type="button" disabled={busy === e.id} onClick={() => desfazer(e)} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-400">
                                        Desfazer
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CRIADOS COMO NOVOS */}
                {criadosNovos.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Criados como novo equipamento ({criadosNovos.length})</h2>
                        <div className="space-y-1">
                            {criadosNovos.map((e) => (
                                <p key={e.id} className="text-xs text-slate-400">
                                    <span className="font-mono text-purple-300">{e.tag_number}</span> — {e.name} <span className="text-slate-600">({e.os_total} OS)</span>
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* EXCLUÍDOS */}
                {malformados.length > 0 && (
                    <div className="mt-8">
                        <button type="button" onClick={() => setMostrarMalformados((v) => !v)} className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                            {mostrarMalformados ? '▾' : '▸'} Excluídos desta rodada ({malformados.length}) — tag incompleto na planilha
                        </button>
                        {mostrarMalformados && (
                            <div className="mt-3 space-y-1">
                                {malformados.map((m, i) => (
                                    <p key={i} className="text-xs text-slate-600">
                                        <span className="font-mono">{m.tag_novo}</span> — {m.equipamento}
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
                        <button type="button" onClick={() => setMostrarAmbiguos((v) => !v)} className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                            {mostrarAmbiguos ? '▾' : '▸'} Ambíguos ({ambiguos.length}) — mais de 1 equipamento apontando pro mesmo tag novo
                        </button>
                        {mostrarAmbiguos && (
                            <div className="mt-3 space-y-1">
                                {ambiguos.map((a, i) => (
                                    <p key={i} className="text-xs text-slate-600">
                                        <span className="font-mono">{a.tag_novo}</span> — {a.equipamentos?.join(' / ')}
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
