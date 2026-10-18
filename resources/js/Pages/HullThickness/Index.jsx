import { useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import SIGMANLayout from '@/Layouts/SIGMANLayout';
import BrDateField from '@/Components/BrDateField';
import { ehCoordenador, ehDevOuTI, ehEngenheiro, ehEstagiario } from '@/utils/roles';
import HullMap from './components/HullMap';
import PlatePanel from './components/PlatePanel';
import MapperTool from './components/MapperTool';
import OverviewMapper from './components/OverviewMapper';
import { EMBARCACOES, VISAO_GERAL, carregarDesenho, nomeDaRegiao } from './lib/contornos';
import medicoes from './data/medicoes.json';
import { PRAZO, STATUS, analisarChapa, fmtPct } from './lib/espessura';

/*
 * Medição de Espessura de chapas (ultrassom) -- PROTÓTIPO SÓ DE FRONTEND.
 *
 *  - Painel: mapa do casco por região, pintado pela condição de cada chapa,
 *    com detalhe da chapa (curva, TC norma/tendência, vida residual).
 *  - Mapeamento: ferramenta para desenhar o contorno das chapas sobre o
 *    desenho (gestão: dev, coordenador, engenheiro).
 *
 * Medições: data/medicoes.json, extraído da planilha "Controle de espessura"
 * por src/MedicaoEspessura/extrair_medicoes.py. Contornos: data/contornos.json
 * + o que for mapeado no navegador.
 */

const NOMES = { AS: 'Atlântico Sul', CMI: 'Ciências do Mar I' };

function lerUrl() {
    const p = new URLSearchParams(window.location.search);
    return { aba: p.get('aba') === 'mapeamento' ? 'mapeamento' : 'painel', emb: EMBARCACOES.includes(p.get('emb')) ? p.get('emb') : 'AS', regiao: p.get('regiao') };
}

function Segmentado({ opcoes, valor, onChange }) {
    return (
        <div className="flex rounded-lg border border-slate-700 bg-slate-900/60 p-0.5">
            {opcoes.map(([chave, rotulo]) => (
                <button key={chave} type="button" onClick={() => onChange(chave)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${valor === chave ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                    {rotulo}
                </button>
            ))}
        </div>
    );
}

function Kpi({ rotulo, valor, detalhe, cor }) {
    return (
        <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 px-4 py-3">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                {cor && <span className="h-2 w-2 rounded-full" style={{ background: cor }} />}{rotulo}
            </span>
            <span className="mt-0.5 block text-2xl font-black tabular-nums text-white">{valor}</span>
            {detalhe && <span className="block text-[11px] text-slate-500">{detalhe}</span>}
        </div>
    );
}

export default function Index({ embarcacoesSistema = [] }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const gestao = ehDevOuTI(user) || ehEngenheiro(user) || ehCoordenador(user);
    // Mapeamento: gestão em qualquer embarcação; estagiário só na embarcação em que está lotado.
    const podeMapearEmb = (e) => gestao || (ehEstagiario(user) && Boolean(user?.vessel_id)
        && embarcacoesSistema.some((v) => v.id === user.vessel_id && v.tag === carregarDesenho(e).tagSistema));
    const podeMapear = EMBARCACOES.some(podeMapearEmb);

    const inicial = useMemo(lerUrl, []);
    const [aba, setAba] = useState(podeMapear ? inicial.aba : 'painel');
    const [emb, setEmb] = useState(inicial.emb);
    const [versaoContornos, setVersaoContornos] = useState(0);
    const desenho = useMemo(() => carregarDesenho(emb), [emb, versaoContornos]); // eslint-disable-line react-hooks/exhaustive-deps
    // A visão geral (todas as partes juntas) é a primeira aba e a padrão.
    const [regiao, setRegiao] = useState(() => (inicial.regiao && carregarDesenho(inicial.emb).regioes[inicial.regiao] ? inicial.regiao : VISAO_GERAL));
    const regiaoValida = regiao === VISAO_GERAL || desenho.regioes[regiao] ? regiao : VISAO_GERAL;
    const [chapaParaEditar, setChapaParaEditar] = useState(null);

    const dados = medicoes[emb];
    const anos = dados.campanhas.map((c) => Number(c.id));
    const [ateAno, setAteAno] = useState(null);
    const anoVisto = ateAno && anos.includes(ateAno) ? ateAno : anos[anos.length - 1];

    const [modo, setModo] = useState('minima');
    const [corPor, setCorPor] = useState('status');
    const [proximaDocagem, setProximaDocagem] = useState('2027-06-01');
    const [selecionada, setSelecionada] = useState(null);

    // Sincroniza aba/embarcação/região na URL (link compartilhável, volta ao mesmo lugar).
    const atualizarUrl = (patch) => {
        const p = new URLSearchParams(window.location.search);
        Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
        window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p}`);
    };
    const trocarAba = (a) => { setAba(a); atualizarUrl({ aba: a === 'painel' ? null : a }); };
    const trocarEmb = (e) => { setEmb(e); setSelecionada(null); setAteAno(null); atualizarUrl({ emb: e }); };
    const trocarRegiao = (r) => { setRegiao(r); setSelecionada(null); setChapaParaEditar(null); atualizarUrl({ regiao: r === VISAO_GERAL ? null : r }); };

    const analises = useMemo(() => {
        const out = {};
        for (const [chave, chapa] of Object.entries(dados.chapas)) {
            out[chave] = analisarChapa(chapa, dados.campanhas, { modo, ateAno: anoVisto, anoBase: dados.construcao, proximaDocagem });
        }
        return out;
    }, [dados, modo, anoVisto, proximaDocagem]);

    const corDe = (a) => (corPor === 'prazo' ? PRAZO[a?.prazo ?? 'semDados'].cor : STATUS[a?.status ?? 'semMedicao'].cor);

    const resumo = useMemo(() => {
        const lista = Object.values(analises);
        const conta = (f) => lista.filter(f).length;
        return {
            total: lista.length,
            mapeadas: desenho.contornos.length,
            normal: conta((a) => a.status === 'normal'),
            alerta: conta((a) => a.status === 'alerta'),
            critico: conta((a) => a.status === 'critico'),
            semMedicao: conta((a) => a.status === 'semMedicao'),
            antesDaDocagem: conta((a) => a.prazo === 'antes'),
        };
    }, [analises, desenho.contornos.length]);

    // Chapas que vencem antes da próxima docagem, mais urgentes primeiro.
    const urgentes = useMemo(() => Object.entries(analises)
        .filter(([, a]) => a.prazo === 'antes')
        .sort(([, a], [, b]) => (a.anoLimite ?? 0) - (b.anoLimite ?? 0))
        .map(([chave, a]) => ({ chave, a, regiaoSigla: chave.split('-')[0] })), [analises]);

    // Lista de chapas abaixo do mapa: só da região, ou de todas agrupadas na visão geral.
    const gruposDeChapas = (regiaoValida === VISAO_GERAL ? Object.keys(desenho.regioes) : [regiaoValida])
        .map((sigla) => ({ sigla, chaves: Array.from({ length: desenho.regioes[sigla].chapas }, (_, i) => `${sigla}-${i + 1}`) }));
    const legenda = corPor === 'prazo' ? Object.values(PRAZO) : Object.values(STATUS);
    const analiseSelecionada = selecionada ? analises[selecionada] : null;

    return (
        <SIGMANLayout>
            <Head title="Medição de Espessura | SIGMAN" />

            <div className="flex h-full flex-col gap-5 overflow-y-auto pb-6 custom-scrollbar">
                {/* Cabeçalho */}
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white">Medição de Espessura</h2>
                        <p className="text-xs text-slate-400">Ultrassom das chapas do casco · taxa de corrosão, vida residual e limites de 20% (alerta) e 25% (crítico).</p>
                    </div>
                    {/* mr-14: espaço para o sino de notificações, fixo no canto superior direito */}
                    <div className="mr-14 flex flex-wrap items-center gap-3">
                        <Segmentado opcoes={EMBARCACOES.map((e) => [e, `${e} · ${NOMES[e]}`])} valor={emb} onChange={trocarEmb} />
                        {podeMapear && <Segmentado opcoes={[['painel', 'Painel'], ['mapeamento', 'Mapeamento']]} valor={aba} onChange={trocarAba} />}
                    </div>
                </div>

                {/* Abas das regiões (comuns às duas abas) */}
                <div className="flex flex-wrap gap-1.5">
                    {[[VISAO_GERAL, 'Visão geral'], ...Object.entries(desenho.regioes).map(([sigla, r]) => [sigla, r.nome])].map(([sigla, nome]) => (
                        <button key={sigla} type="button" onClick={() => trocarRegiao(sigla)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${sigla === regiaoValida ? 'bg-slate-700 text-white ring-1 ring-slate-500' : 'bg-slate-900/60 text-slate-400 ring-1 ring-slate-800 hover:text-white'}`}>
                            {nome}
                        </button>
                    ))}
                </div>

                {aba === 'mapeamento' && !podeMapearEmb(emb) ? (
                    <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                        O mapeamento do {NOMES[emb]} fica com a gestão e com o estagiário lotado nessa embarcação.
                    </p>
                ) : aba === 'mapeamento' && regiaoValida === VISAO_GERAL ? (
                    <OverviewMapper
                        desenho={desenho}
                        onAbrirRegiao={trocarRegiao}
                        onAbrirChapa={(r, n) => { trocarRegiao(r); setChapaParaEditar(`${r}-${n}`); }}
                    />
                ) : aba === 'mapeamento' ? (
                    <MapperTool
                        chapaInicial={chapaParaEditar}
                        embarcacao={emb}
                        desenho={desenho}
                        regiao={regiaoValida}
                        onRegiao={trocarRegiao}
                        onContornosAlterados={() => setVersaoContornos((v) => v + 1)}
                        usuario={user?.nickname || user?.name || 'Usuário'}
                    />
                ) : (
                    <>
                        {dados.observacoes?.length > 0 && (
                            <details className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs text-amber-200">
                                <summary className="cursor-pointer font-semibold">
                                    {dados.observacoes.length} observaç{dados.observacoes.length === 1 ? 'ão' : 'ões'} sobre a planilha ({dados.fonte}) — clique para ver
                                </summary>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/90">
                                    {dados.observacoes.map((o) => <li key={o}>{o}</li>)}
                                </ul>
                            </details>
                        )}

                        {/* Indicadores */}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <Kpi rotulo="Chapas" valor={resumo.total} detalhe={`${resumo.mapeadas} desenhadas no mapa`} />
                            <Kpi rotulo="Normal" valor={resumo.normal} cor={STATUS.normal.cor} detalhe={fmtPct(resumo.normal / resumo.total)} />
                            <Kpi rotulo="Alerta (≥20%)" valor={resumo.alerta} cor={STATUS.alerta.cor} detalhe={fmtPct(resumo.alerta / resumo.total)} />
                            <Kpi rotulo="Crítico (≥25%)" valor={resumo.critico} cor={STATUS.critico.cor} detalhe={fmtPct(resumo.critico / resumo.total)} />
                            <Kpi rotulo="Sem medição" valor={resumo.semMedicao} cor={STATUS.semMedicao.cor} detalhe={`até ${anoVisto}`} />
                            <Kpi rotulo="Antes da docagem" valor={resumo.antesDaDocagem} cor={PRAZO.antes.cor} detalhe="Atingem 25% até a próxima" />
                        </div>

                        {/* Controles */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-slate-800 bg-[#0b203c]/90 px-4 py-3">
                            <label className="flex items-center gap-2 text-xs text-slate-400">Leitura
                                <Segmentado opcoes={[['minima', 'Mínima (pior caso)'], ['media', 'Média']]} valor={modo} onChange={setModo} />
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-400">Colorir por
                                <Segmentado opcoes={[['status', '% de perda'], ['prazo', 'Vida residual × docagem']]} valor={corPor} onChange={setCorPor} />
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-400">Campanha
                                <Segmentado opcoes={anos.map((a) => [a, String(a)])} valor={anoVisto} onChange={setAteAno} />
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-400">Próxima docagem
                                <div className="w-36"><BrDateField value={proximaDocagem} onChange={(v) => setProximaDocagem(v || '')} /></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
                            <div className="min-w-0 space-y-3">
                                <HullMap desenho={desenho} regiao={regiaoValida} analises={analises} corDe={corDe} selecionada={selecionada} onSelecionar={setSelecionada}
                                         tipos={Object.fromEntries(Object.entries(dados.chapas).map(([k, c]) => [k, c.tipo]))} />

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                                    {legenda.map((l) => (
                                        <span key={l.rot} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.cor }} />{l.rot}</span>
                                    ))}
                                </div>

                                {/* Todas as chapas da região, inclusive as ainda não desenhadas no mapa */}
                                <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
                                    <h4 className="mb-2 text-sm font-semibold text-white">Chapas · {nomeDaRegiao(desenho, regiaoValida)}</h4>
                                    {gruposDeChapas.map(({ sigla, chaves }) => (
                                    <div key={sigla} className="mb-2 last:mb-0">
                                    {gruposDeChapas.length > 1 && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{desenho.regioes[sigla].nome}</p>}
                                    <div className="grid grid-cols-8 gap-1 sm:grid-cols-12 lg:grid-cols-[repeat(18,minmax(0,1fr))]">
                                        {chaves.map((chave) => {
                                            const a = analises[chave];
                                            const n = chave.split('-')[1];
                                            const ativa = selecionada === chave;
                                            return (
                                                <button key={chave} type="button" onClick={() => setSelecionada(chave)}
                                                        title={`Chapa ${n}: ${a?.atual ? `${fmtPct(a.perda)} de perda · ${STATUS[a.status].rot}` : 'sem medição'}`}
                                                        className={`rounded py-1 text-[11px] font-bold tabular-nums text-slate-950 transition hover:brightness-110 ${ativa ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                                                        style={{ background: corDe(a) }}>
                                                    {n}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {analiseSelecionada ? (
                                    <PlatePanel
                                        chave={selecionada}
                                        regiaoNome={desenho.regioes[selecionada.split('-')[0]]?.nome}
                                        chapa={dados.chapas[selecionada]}
                                        analise={analiseSelecionada}
                                        modo={modo}
                                        onFechar={() => setSelecionada(null)}
                                    />
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
                                        Clique numa chapa do mapa (ou na lista) para ver a curva de espessura, a taxa de corrosão e a vida residual.
                                    </div>
                                )}

                                <div className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
                                    <h4 className="text-sm font-semibold text-white">Substituir antes da próxima docagem ({urgentes.length})</h4>
                                    <p className="mb-2 text-[11px] text-slate-500">Já críticas ou que atingem 25% de perda até {proximaDocagem ? proximaDocagem.split('-').reverse().join('/') : '—'}.</p>
                                    {urgentes.length === 0 ? (
                                        <p className="text-xs text-slate-500">Nenhuma chapa.</p>
                                    ) : (
                                        <ul className="max-h-72 divide-y divide-slate-800 overflow-y-auto">
                                            {urgentes.map(({ chave, a, regiaoSigla }) => (
                                                <li key={chave}>
                                                    <button type="button" onClick={() => { if (regiaoValida !== VISAO_GERAL) trocarRegiao(regiaoSigla); setSelecionada(chave); }}
                                                            className="flex w-full items-center gap-3 px-1 py-1.5 text-left text-xs hover:bg-slate-800/50">
                                                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[a.status].cor }} />
                                                        <span className="flex-1 text-slate-200">{desenho.regioes[regiaoSigla].nome} · chapa {chave.split('-')[1]}</span>
                                                        <span className="tabular-nums text-slate-400">{fmtPct(a.perda)}</span>
                                                        <span className="w-16 text-right tabular-nums text-slate-500">{a.status === 'critico' ? 'já crítica' : a.anoLimite ? Math.floor(a.anoLimite) : '—'}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </SIGMANLayout>
    );
}

