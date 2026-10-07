import { useMemo } from 'react';

/*
 * Métricas de um nó agrupador da árvore (embarcação, seção ou sistema),
 * calculadas a partir da própria árvore já carregada na página.
 *
 * Hierarquia (ISO 14224): Embarcação > Seção > Sistema > Equipamento >
 * (sub-equipamento) > Componente. "Não Categorizados" é a seção virtual dos
 * equipamentos cujo TAG ainda não segue o formato novo.
 */

const OUTROS = 'OUTROS';

// Mesma semântica de cor do badge de criticidade da tela (A verde, B amarelo, C vermelho).
const CRITICIDADE = [
    { chave: 'A', rot: 'Classe A', cor: '#34d399' },
    { chave: 'B', rot: 'Classe B', cor: '#fbbf24' },
    { chave: 'C', rot: 'Classe C', cor: '#f87171' },
    { chave: null, rot: 'Sem classificação', cor: '#64748b' },
];

export const ehEquipamento = (n) => !n.virtual && (n.type === 'equipment' || n.type === 'system');
const ehUncategorized = (n) => n.type === 'section' && n.prefix === OUTROS;

/** Soma recursiva de tudo que está abaixo do nó. */
export function contar(no) {
    const m = { secoes: 0, sistemas: 0, sistemasVazios: 0, equipamentos: 0, subEquipamentos: 0, componentes: 0, naoCategorizados: 0, criticidade: { A: 0, B: 0, C: 0, null: 0 } };
    const visitar = (n, dentroDeEquipamento, dentroDeOutros) => {
        for (const f of n.children || []) {
            if (f.type === 'section') {
                if (!ehUncategorized(f)) m.secoes += 1;
                visitar(f, false, ehUncategorized(f));
            } else if (f.virtual) {
                m.sistemas += 1;
                if (!f.children?.length) m.sistemasVazios += 1;
                visitar(f, false, dentroDeOutros);
            } else if (f.type === 'component') {
                m.componentes += 1;
            } else {
                m.equipamentos += 1;
                if (dentroDeEquipamento) m.subEquipamentos += 1;
                if (dentroDeOutros) m.naoCategorizados += 1;
                m.criticidade[['A', 'B', 'C'].includes(f.criticality) ? f.criticality : null] += 1;
                visitar(f, true, dentroDeOutros);
            }
        }
    };
    visitar(no, ehEquipamento(no), ehUncategorized(no));
    return m;
}

function Kpi({ rotulo, valor, detalhe, destaque }) {
    return (
        <div className={`rounded-lg p-4 ring-1 ${destaque ? 'bg-amber-500/5 ring-amber-500/30' : 'bg-slate-900/50 ring-slate-800'}`}>
            <span className="block text-[11px] uppercase tracking-wider text-slate-500">{rotulo}</span>
            <span className={`mt-1 block text-2xl font-black tabular-nums ${destaque ? 'text-amber-300' : 'text-white'}`}>{valor}</span>
            {detalhe && <span className="mt-0.5 block text-[11px] text-slate-500">{detalhe}</span>}
        </div>
    );
}

function BarraCriticidade({ criticidade, total }) {
    if (!total) return null;
    return (
        <section className="mb-8">
            <h4 className="mb-3 border-b border-slate-800 pb-2 text-sm font-semibold text-white">Criticidade dos equipamentos</h4>
            <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-900">
                {CRITICIDADE.map(({ chave, rot, cor }) => {
                    const n = criticidade[chave];
                    return n > 0 && (
                        <div key={rot} style={{ width: `${(n / total) * 100}%`, backgroundColor: cor }} title={`${rot}: ${n} (${Math.round((n / total) * 100)}%)`} />
                    );
                })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-300">
                {CRITICIDADE.map(({ chave, rot, cor }) => (
                    <span key={rot} className={`inline-flex items-center gap-1.5 ${criticidade[chave] ? '' : 'opacity-40'}`}>
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cor }} />
                        {rot} <span className="font-bold tabular-nums text-white">{criticidade[chave]}</span>
                    </span>
                ))}
            </div>
        </section>
    );
}

/** Uma linha por filho direto (seções da embarcação, sistemas da seção), com barra proporcional. */
function Distribuicao({ titulo, linhas, onAbrir }) {
    const max = Math.max(1, ...linhas.map((l) => l.m.equipamentos));
    return (
        <section className="mb-8">
            <h4 className="mb-3 border-b border-slate-800 pb-2 text-sm font-semibold text-white">{titulo}</h4>
            <ul className="space-y-1">
                {linhas.map(({ no, m }) => {
                    const fora = ehUncategorized(no);
                    return (
                        <li key={no.id}>
                            <button
                                type="button"
                                onClick={() => onAbrir(no)}
                                title={`Abrir ${no.name} na árvore`}
                                className="group grid w-full grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-800/60"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    {no.prefix && <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${fora ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>{fora ? '—' : no.prefix}</span>}
                                    <span className={`truncate text-sm ${fora ? 'text-amber-200' : 'text-slate-200'} group-hover:text-white`}>{no.name}</span>
                                </span>
                                <span className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                                    <span className={`block h-full rounded-full ${fora ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: `${(m.equipamentos / max) * 100}%` }} />
                                </span>
                                <span className="w-28 text-right text-xs text-slate-400">
                                    <span className="font-bold tabular-nums text-white">{m.equipamentos}</span> equip.
                                    {no.type === 'section' && !fora && <span className="text-slate-500"> · {m.sistemas} sist.</span>}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/** Equipamentos de um sistema (ou da seção Não Categorizados). */
function ListaEquipamentos({ titulo, equipamentos, onAbrir }) {
    return (
        <section className="mb-8">
            <h4 className="mb-3 border-b border-slate-800 pb-2 text-sm font-semibold text-white">{titulo}</h4>
            {equipamentos.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">Nenhum equipamento cadastrado neste sistema ainda.</p>
            ) : (
                <ul className="divide-y divide-slate-800 rounded-lg ring-1 ring-slate-800">
                    {equipamentos.map((eq) => {
                        const m = contar(eq);
                        const crit = CRITICIDADE.find((c) => c.chave === (['A', 'B', 'C'].includes(eq.criticality) ? eq.criticality : null));
                        return (
                            <li key={eq.id}>
                                <button type="button" onClick={() => onAbrir(eq)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-800/60">
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: crit.cor }} title={crit.rot} />
                                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{eq.name}</span>
                                    {eq.tag && <span className="hidden shrink-0 font-mono text-[10px] text-slate-500 sm:inline">{eq.tag}</span>}
                                    <span className="w-36 shrink-0 text-right text-[11px] text-slate-500">
                                        {m.equipamentos > 0 && <>{m.equipamentos} sub-equip. · </>}{m.componentes} comp.
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

export default function TreeMetrics({ node, onAbrir }) {
    const m = useMemo(() => contar(node), [node]);
    const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '—');
    const filhos = node.children || [];
    const categorizados = m.equipamentos - m.naoCategorizados;

    if (node.type === 'vessel') {
        return (
            <>
                <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi rotulo="Seções" valor={m.secoes} detalhe={`${m.sistemas} sistemas${m.sistemasVazios ? ` · ${m.sistemasVazios} sem equipamento` : ''}`} />
                    <Kpi rotulo="Equipamentos" valor={m.equipamentos} detalhe={m.subEquipamentos ? `${m.subEquipamentos} são sub-equipamentos` : null} />
                    <Kpi rotulo="Componentes" valor={m.componentes} />
                    <Kpi rotulo="Não categorizados" valor={m.naoCategorizados} detalhe={`${pct(categorizados, m.equipamentos)} já na árvore nova`} destaque={m.naoCategorizados > 0} />
                </div>
                <Distribuicao titulo="Equipamentos por seção" linhas={filhos.map((no) => ({ no, m: contar(no) }))} onAbrir={onAbrir} />
                <BarraCriticidade criticidade={m.criticidade} total={m.equipamentos} />
            </>
        );
    }

    if (node.type === 'section' && !ehUncategorized(node)) {
        return (
            <>
                <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi rotulo="Sistemas" valor={m.sistemas} detalhe={m.sistemasVazios ? `${m.sistemasVazios} sem equipamento` : 'todos com equipamento'} />
                    <Kpi rotulo="Equipamentos" valor={m.equipamentos} detalhe={m.subEquipamentos ? `${m.subEquipamentos} são sub-equipamentos` : null} />
                    <Kpi rotulo="Componentes" valor={m.componentes} />
                    <Kpi rotulo="Criticidade C" valor={m.criticidade.C} detalhe={`${pct(m.criticidade.C, m.equipamentos)} dos equipamentos`} />
                </div>
                <Distribuicao titulo="Equipamentos por sistema" linhas={filhos.map((no) => ({ no, m: contar(no) }))} onAbrir={onAbrir} />
                <BarraCriticidade criticidade={m.criticidade} total={m.equipamentos} />
            </>
        );
    }

    // Sistema (virtual) ou "Não Categorizados".
    const fora = ehUncategorized(node);
    return (
        <>
            {fora && (
                <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                    Equipamentos cujo TAG ainda não segue o formato novo (embarcação-seção-sistema-...). Passam para a seção certa depois da migração de tags.
                </p>
            )}
            <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi rotulo="Equipamentos" valor={m.equipamentos} detalhe={`${filhos.length} no 1º nível`} destaque={fora && m.equipamentos > 0} />
                <Kpi rotulo="Sub-equipamentos" valor={m.subEquipamentos} />
                <Kpi rotulo="Componentes" valor={m.componentes} />
                <Kpi rotulo="Criticidade C" valor={m.criticidade.C} detalhe={`${pct(m.criticidade.C, m.equipamentos)} dos equipamentos`} />
            </div>
            <ListaEquipamentos titulo={fora ? 'Equipamentos não categorizados' : 'Equipamentos do sistema'} equipamentos={filhos.filter(ehEquipamento)} onAbrir={onAbrir} />
            <BarraCriticidade criticidade={m.criticidade} total={m.equipamentos} />
        </>
    );
}
