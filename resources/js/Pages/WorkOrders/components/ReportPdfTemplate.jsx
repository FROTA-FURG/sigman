import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { OPCOES_STATUS, PRIORIDADES, ROTULO_PERIODICIDADE, selosDeOrigem, statusDaOs } from '../lib/os';
import { COR, estilos, dataLocal, ddmm, ddmmaaaa, rotuloPeriodo, num, hoje as hojeLocal, Cabecalho, Resumo, Secao, Celula, Rodape } from './pdf/RelatorioBase';

/*
 * Relatório de Andamento: as OS selecionadas na aba Andamento.
 *  - resumo: quantas por status, % concluída, atrasadas e a comparação de
 *    hora-homem estimada (na OS) x executada (duração das atividades);
 *  - quadro por embarcação (quando há mais de uma);
 *  - OS em seções: ATRASADAS primeiro (em destaque), depois em andamento,
 *    abertas, agendadas, concluídas e canceladas/inativadas;
 *  - ao fim, estimado x executado das concluídas, maior desvio primeiro,
 *    para calibrar a estimativa das próximas OS.
 *
 * Opções escolhidas ao exportar:
 *  - comHh: tudo de hora-homem (cartões, colunas, executado x estimado das
 *    concluídas, tabela de calibração). Sem ela, o relatório só conta OS e atividades;
 *  - comAtividades: relatório completo -- abaixo de cada OS, cada atividade
 *    (descrição, início, fim e quem executou);
 *  - comConcluidas: sem ela, as concluídas saem de tudo;
 *  - porStatus: seções por status (atrasadas, em andamento...) com a coluna
 *    Prazo. Sem ela, uma lista única por data, sem Prazo.
 */

const COLUNAS = [
    ['Prazo', '7%'], ['OS', '7%'], ['SS', '5.5%'], ['Data', '6.5%'], ['Emb.', '4.5%'], ['TAG / Equipamento', '13%'],
    ['Descrição', '16%'], ['Tipo', '4.5%'], ['Prioridade', '6.5%'], ['Periodicidade', '7.5%'], ['Status', '9%'], ['Execução', '13%'],
];
// Sem divisão por status: some a coluna Prazo e a descrição ganha o espaço.
const COLUNAS_SEM_PRAZO = COLUNAS.slice(1).map(([rot, w]) => (rot === 'Descrição' ? [rot, '23%'] : [rot, w]));

const TIPO = { corrective: 'CORR', preventive: 'PREV', predictive: 'PRED' };
const COR_STATUS = { open: COR.azul, scheduled: '#6d28d9', in_progress: COR.ambar, completed: COR.verde, cancelled: COR.cinza, inactive: COR.laranja };
const rotuloStatus = (st) => OPCOES_STATUS.find(o => o.valor === st)?.rot || st;

/** Mesma regra da tela: data passou e a OS não foi concluída/cancelada. */
const estaAtrasada = (os, hoje) => {
    const d = dataLocal(os.created_at);
    return Boolean(d) && d < hoje && !['completed', 'cancelled'].includes(os.status);
};

/** Horas lançadas nas atividades (só as que têm fim). */
const horasExecutadas = (os) => (os.activities || []).reduce((soma, a) => {
    if (!a.started_at || !a.completed_at) return soma;
    const h = (new Date(a.completed_at) - new Date(a.started_at)) / 3600000;
    return soma + (h > 0 ? h : 0);
}, 0);

/**
 * Executado comparado ao estimado, em Hh (sem divisão):
 *  - passou do estimado      -> "+1,5 Hh acima do estimado" (vermelho)
 *  - concluída abaixo        -> "3 Hh abaixo do estimado"   (verde)
 *  - ainda em execução       -> "faltam 3 Hh do estimado" (nada se não lançou nada)
 */
export const comparacaoHh = (exec, est, concluida) => {
    if (!est || (!concluida && exec === 0)) return null;
    const d = exec - est;
    if (Math.abs(d) < 0.05) return { texto: 'igual ao estimado', cor: COR.verde };
    if (d > 0) return { texto: `+${num(d)} Hh acima do estimado`, cor: COR.vermelho };
    return concluida
        ? { texto: `${num(-d)} Hh abaixo do estimado`, cor: COR.verde }
        : { texto: `faltam ${num(-d)} Hh do estimado`, cor: COR.cinza };
};

const nomeDe = (a) => a.responsible_user?.nickname || a.responsible_user?.username || a.responsible_name || null;

const dataHora = (iso) => (iso
    ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null);

const qtdAtividades = (n) => (n === 0 ? 'Sem atividades' : `${n} ${n === 1 ? 'atividade' : 'atividades'}`);

function Linha({ os, hoje, ultima, comHh, comAtividades, porStatus }) {
    const L = (porStatus ? COLUNAS : COLUNAS_SEM_PRAZO).map(c => c[1]);
    const w = (k) => L[porStatus ? k : k - 1]; // índices abaixo contam com a coluna Prazo
    const data = dataLocal(os.created_at);
    // Destaque de atraso só na versão separada por status (onde há a coluna Prazo).
    const atrasada = porStatus && estaAtrasada(os, hoje);
    const dias = atrasada ? Math.floor((hoje - data) / 86400000) + 1 : 0;
    const st = statusDaOs(os);
    const eq = os.equipment || {};
    const atividades = os.activities || [];
    const hExec = horasExecutadas(os);
    const hEst = Number(os.estimated_hours) || 0;
    // Resumido: executado x estimado só na OS concluída. Completo: em todas
    // (exceto cancelada/inativada), para acompanhar o andamento das horas.
    const mostraHh = comHh && (st === 'completed' || (comAtividades && !['cancelled', 'inactive'].includes(st)));
    const comp = mostraHh ? comparacaoHh(hExec, hEst, st === 'completed') : null;
    const selos = selosDeOrigem(os).map(s => s.rot).join(' · ');

    return (
        <View wrap={false} style={[estilos.tableRow, atrasada && { backgroundColor: '#fef2f2' }, ultima && { borderBottomWidth: 0 }]}>
            {porStatus && <Celula largura={w(0)}>
                {atrasada ? (
                    <>
                        <Text style={[estilos.negrito, { color: COR.vermelho }]}>ATRASADA</Text>
                        <Text style={{ color: COR.vermelho, fontSize: 7 }}>{dias} {dias === 1 ? 'dia' : 'dias'}</Text>
                    </>
                ) : <Text>{['completed', 'cancelled'].includes(os.status) ? '—' : 'No prazo'}</Text>}
            </Celula>}
            <Celula largura={w(1)}>
                <Text style={estilos.negrito}>{os.os_number || '-'}</Text>
                {selos ? <Text style={estilos.pequeno}>{selos}</Text> : null}
            </Celula>
            <Celula largura={w(2)}><Text>{os.ss_number || '-'}</Text></Celula>
            <Celula largura={w(3)}><Text style={atrasada ? [estilos.negrito, { color: COR.vermelho }] : null}>{ddmmaaaa(data)}</Text></Celula>
            <Celula largura={w(4)}><Text>{eq.vessel?.tag || '-'}</Text></Celula>
            <Celula largura={w(5)}>
                <Text>{eq.tag_number || '-'}</Text>
                {eq.tag_antigo ? <Text style={estilos.pequeno}>antiga: {eq.tag_antigo}</Text> : null}
                {eq.name ? <Text style={estilos.pequeno}>{eq.name}</Text> : null}
            </Celula>
            <Celula largura={w(6)}>
                <Text>{(os.description || '').substring(0, 120)}{os.description?.length > 120 ? '...' : ''}</Text>
            </Celula>
            <Celula largura={w(7)}><Text>{TIPO[os.maintenance_type] || '-'}</Text></Celula>
            <Celula largura={w(8)}><Text>{PRIORIDADES.find(p => p.valor === os.priority)?.rot || '-'}</Text></Celula>
            <Celula largura={w(9)}><Text>{ROTULO_PERIODICIDADE[os.periodicity] || 'Avulsa'}</Text></Celula>
            <Celula largura={w(10)}><Text style={[estilos.negrito, { color: COR_STATUS[st] || COR.texto }]}>{rotuloStatus(st)}</Text></Celula>
            <Celula largura={w(11)} ultima>
                <Text>{qtdAtividades(atividades.length)}</Text>
                {mostraHh && (
                    <>
                        <Text style={estilos.pequeno}>Executado: <Text style={[estilos.negrito, { color: COR.texto }]}>{num(hExec)} Hh</Text></Text>
                        <Text style={estilos.pequeno}>Estimado: <Text style={[estilos.negrito, { color: COR.texto }]}>{hEst ? `${num(hEst)} Hh` : '—'}</Text></Text>
                        {comp && <Text style={{ fontSize: 7, color: comp.cor, fontFamily: comp.cor === COR.cinza ? 'Helvetica' : 'Helvetica-Bold' }}>{comp.texto}</Text>}
                    </>
                )}
            </Celula>
        </View>
    );
}

/**
 * Relatório completo: as atividades da OS, logo abaixo dela, recuadas.
 * Devolve uma linha por elemento (sub-cabeçalho + uma por atividade), para
 * a página poder quebrar entre atividades de uma OS longa.
 */
function linhasDeAtividades(os, comHh, ultimaDaSecao) {
    const lista = [...(os.activities || [])].sort((a, b) => (a.started_at || '').localeCompare(b.started_at || ''));
    if (lista.length === 0) return [];

    const cols = comHh
        ? [['', '7%'], ['Atividade', '42%'], ['Início', '12%'], ['Fim', '12%'], ['Duração', '7%'], ['Executado por', '20%']]
        : [['', '7%'], ['Atividade', '49%'], ['Início', '12%'], ['Fim', '12%'], ['Executado por', '20%']];
    const W = cols.map(c => c[1]);
    const fundo = { backgroundColor: '#f8fafc' };
    const linhaFina = { minHeight: 13, borderBottomColor: '#e2e8f0' };

    const sub = (
        <View key={`${os.id}-cab`} wrap={false} style={[estilos.tableRow, fundo, linhaFina]}>
            {cols.map(([rot, w], i) => (
                <Celula key={i} largura={w} ultima={i === cols.length - 1} style={{ borderRightColor: '#e2e8f0' }}>
                    <Text style={[estilos.pequeno, estilos.negrito]}>{i === 0 ? '' : i === 1 ? `Atividades da ${os.os_number || 'OS'}` : rot}</Text>
                </Celula>
            ))}
        </View>
    );

    return [sub, ...lista.map((a, i) => {
        const ultima = ultimaDaSecao && i === lista.length - 1;
        const horas = a.completed_at ? (new Date(a.completed_at) - new Date(a.started_at)) / 3600000 : null;
        const quem = nomeDe(a);
        const externo = !a.responsible_user && a.responsible_name;
        const celulas = [
            <Text key="d" style={{ fontSize: 7.5 }}>{a.description || '-'}</Text>,
            <Text key="i" style={{ fontSize: 7.5 }}>{dataHora(a.started_at) || '-'}</Text>,
            a.completed_at ? <Text key="f" style={{ fontSize: 7.5 }}>{dataHora(a.completed_at)}</Text> : <Text key="f" style={{ fontSize: 7.5, color: COR.ambar }}>em andamento</Text>,
            ...(comHh ? [<Text key="h" style={{ fontSize: 7.5 }}>{horas != null ? `${num(Math.max(horas, 0))} Hh` : '—'}</Text>] : []),
            <Text key="q" style={{ fontSize: 7.5 }}>{quem || 'Não informado'}{externo ? ' (externo)' : ''}</Text>,
        ];
        return (
            <View key={a.id || `${os.id}-${i}`} wrap={false} style={[estilos.tableRow, fundo, linhaFina, ultima && { borderBottomWidth: 0 }]}>
                <Celula largura={W[0]} style={{ borderRightColor: '#e2e8f0' }}><Text /></Celula>
                {celulas.map((c, j) => (
                    <Celula key={j} largura={W[j + 1]} ultima={j === celulas.length - 1} style={{ borderRightColor: '#e2e8f0' }}>{c}</Celula>
                ))}
            </View>
        );
    })];
}

/** Quadro por embarcação; as colunas de concluídas e de Hh entram conforme as opções. */
function QuadroPorEmbarcacao({ grupos, comHh, comConcluidas }) {
    const vermelhoSe = (cond) => (cond ? [estilos.negrito, { color: COR.vermelho }] : null);
    const colunas = [
        { rot: 'Embarcação', peso: 2.2, valor: (g) => <Text style={estilos.negrito}>{g.tag}{g.nome && g.nome !== g.tag ? ` · ${g.nome}` : ''}</Text> },
        { rot: 'Total', peso: 0.8, valor: (g) => <Text>{g.total}</Text> },
        comConcluidas && { rot: 'Concluídas', peso: 1.1, valor: (g) => <Text>{g.concluidas} ({Math.round((g.concluidas / g.total) * 100)}%)</Text> },
        { rot: 'Em andamento', peso: 1.1, valor: (g) => <Text>{g.andamento}</Text> },
        { rot: 'Abertas / Agend.', peso: 1.1, valor: (g) => <Text>{g.abertas}</Text> },
        { rot: 'Atrasadas', peso: 0.9, valor: (g) => <Text style={vermelhoSe(g.atrasadas)}>{g.atrasadas}</Text> },
        comHh && { rot: 'Hh estimadas', peso: 1, valor: (g) => <Text>{num(g.hEst)}</Text> },
        comHh && { rot: 'Hh executadas', peso: 1, valor: (g) => <Text>{num(g.hExec)}</Text> },
        comHh && { rot: 'Exec. - est.', peso: 1, valor: (g) => <Text style={vermelhoSe(g.hExec > g.hEst)}>{g.hExec > g.hEst ? '+' : g.hExec < g.hEst ? '-' : ''}{num(Math.abs(g.hExec - g.hEst))} Hh</Text> },
    ].filter(Boolean);
    const soma = colunas.reduce((t, c) => t + c.peso, 0);
    const largura = (c) => `${(c.peso / soma) * 100}%`;

    return (
        <View wrap={false} style={{ marginBottom: 4 }}>
            <View style={[estilos.secao, { backgroundColor: '#334155', marginTop: 0 }]}>
                <Text>POR EMBARCAÇÃO</Text>
                <Text>{grupos.length} embarcações</Text>
            </View>
            <View style={estilos.tableHeader}>
                {colunas.map((c, i) => <Text key={c.rot} style={[estilos.cell, { width: largura(c) }, i === colunas.length - 1 && { borderRightWidth: 0 }]}>{c.rot}</Text>)}
            </View>
            <View style={estilos.table}>
                {grupos.map((g, i) => (
                    <View key={g.tag} style={[estilos.tableRow, { minHeight: 14 }, i === grupos.length - 1 && { borderBottomWidth: 0 }]}>
                        {colunas.map((c, k) => <Celula key={c.rot} largura={largura(c)} ultima={k === colunas.length - 1}>{c.valor(g)}</Celula>)}
                    </View>
                ))}
            </View>
        </View>
    );
}

const COLUNAS_CALIB = [['OS', '8%'], ['Emb.', '5%'], ['TAG / Equipamento', '16%'], ['Descrição', '30%'], ['Periodicidade', '9%'], ['Estimado', '9%'], ['Executado', '9%'], ['Diferença', '14%']];

/** Concluídas com estimativa: o que foi previsto x o que levou, maior desvio primeiro. */
function Calibracao({ lista }) {
    if (lista.length === 0) return null;
    const W = COLUNAS_CALIB.map(c => c[1]);
    return (
        <View>
            <Secao titulo="ESTIMADO x EXECUTADO — OS concluídas" cor="#334155" quantidade={lista.length} colunas={COLUNAS_CALIB}>
                {lista.map(({ os, exec, est }, i) => {
                    const comp = comparacaoHh(exec, est, true);
                    const eq = os.equipment || {};
                    return (
                        <View key={os.id} wrap={false} style={[estilos.tableRow, i === lista.length - 1 && { borderBottomWidth: 0 }]}>
                            <Celula largura={W[0]}><Text style={estilos.negrito}>{os.os_number || '-'}</Text></Celula>
                            <Celula largura={W[1]}><Text>{eq.vessel?.tag || '-'}</Text></Celula>
                            <Celula largura={W[2]}>
                                <Text>{eq.tag_number || '-'}</Text>
                                {eq.name ? <Text style={estilos.pequeno}>{eq.name}</Text> : null}
                            </Celula>
                            <Celula largura={W[3]}><Text>{(os.description || '').substring(0, 140)}</Text></Celula>
                            <Celula largura={W[4]}><Text>{ROTULO_PERIODICIDADE[os.periodicity] || 'Avulsa'}</Text></Celula>
                            <Celula largura={W[5]}><Text>{num(est)} Hh</Text></Celula>
                            <Celula largura={W[6]}><Text style={estilos.negrito}>{num(exec)} Hh</Text></Celula>
                            <Celula largura={W[7]} ultima><Text style={[estilos.negrito, { color: comp.cor }]}>{comp.texto}</Text></Celula>
                        </View>
                    );
                })}
            </Secao>
        </View>
    );
}

/** weekStart/weekEnd: semana selecionada na aba Andamento (Date locais), ou nulos em "Ver tudo". */
export default function ReportPdfTemplate({ workOrders: selecionadas = [], weekStart = null, weekEnd = null, comHh = true, comAtividades = false, porStatus = true, comConcluidas = true }) {
    const hoje = hojeLocal();
    // Sem concluídas: elas saem de tudo (lista, métricas e comparação de Hh).
    const workOrders = comConcluidas ? selecionadas : selecionadas.filter(os => statusDaOs(os) !== 'completed');
    const porData = [...workOrders].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    const atrasadas = porData.filter(os => estaAtrasada(os, hoje));
    const resto = porData.filter(os => !estaAtrasada(os, hoje));
    const doStatus = (...sts) => resto.filter(os => sts.includes(statusDaOs(os)));
    const secoes = !porStatus ? [
        { titulo: 'ORDENS DE SERVIÇO', cor: COR.azul, lista: porData },
    ] : [
        { titulo: 'OS ATRASADAS — data já passou e não foram concluídas', cor: COR.vermelho, lista: atrasadas },
        { titulo: 'EM ANDAMENTO', cor: COR.ambar, lista: doStatus('in_progress') },
        { titulo: 'ABERTAS', cor: COR.azul, lista: doStatus('open') },
        { titulo: 'AGENDADAS', cor: '#6d28d9', lista: doStatus('scheduled') },
        { titulo: 'CONCLUÍDAS', cor: COR.verde, lista: doStatus('completed') },
        { titulo: 'CANCELADAS / INATIVADAS', cor: COR.cinza, lista: doStatus('cancelled', 'inactive') },
    ];

    const total = workOrders.length;
    const contaSt = (st) => workOrders.filter(os => statusDaOs(os) === st).length;
    const concluidas = contaSt('completed');
    const validas = total - contaSt('cancelled') - contaSt('inactive'); // base do % de conclusão
    const pct = validas > 0 ? Math.round((concluidas / validas) * 100) : 0;
    const hEst = workOrders.reduce((s, os) => s + (Number(os.estimated_hours) || 0), 0);
    const hExec = workOrders.reduce((s, os) => s + horasExecutadas(os), 0);
    const totalAtividades = workOrders.reduce((s, os) => s + (os.activities?.length || 0), 0);

    // Comparação que serve para planejar: só OS concluídas e com estimativa.
    const calibracao = workOrders
        .filter(os => statusDaOs(os) === 'completed' && Number(os.estimated_hours) > 0)
        .map(os => ({ os, est: Number(os.estimated_hours), exec: horasExecutadas(os) }))
        .sort((a, b) => Math.abs(b.exec - b.est) - Math.abs(a.exec - a.est));
    const calibEst = calibracao.reduce((s, c) => s + c.est, 0);
    const calibExec = calibracao.reduce((s, c) => s + c.exec, 0);
    const acimaDoEstimado = calibracao.filter(c => c.exec - c.est >= 0.05).length;
    const compConcluidas = comparacaoHh(calibExec, calibEst, true);

    const grupos = Object.values(workOrders.reduce((acc, os) => {
        const v = os.equipment?.vessel || {};
        const tag = v.tag || '—';
        const g = acc[tag] ||= { tag, nome: v.name, total: 0, concluidas: 0, andamento: 0, abertas: 0, atrasadas: 0, hEst: 0, hExec: 0 };
        const st = statusDaOs(os);
        g.total += 1;
        if (st === 'completed') g.concluidas += 1;
        if (st === 'in_progress') g.andamento += 1;
        if (st === 'open' || st === 'scheduled') g.abertas += 1;
        if (estaAtrasada(os, hoje)) g.atrasadas += 1;
        g.hEst += Number(os.estimated_hours) || 0;
        g.hExec += horasExecutadas(os);
        return acc;
    }, {})).sort((a, b) => a.tag.localeCompare(b.tag));

    const periodo = rotuloPeriodo(weekStart, weekEnd);

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={estilos.page}>
                <Cabecalho
                    subtitulo="COORDENAÇÃO DA FROTA - ANDAMENTO DAS ORDENS DE SERVIÇO"
                    periodo={periodo ? `PERÍODO: ${periodo}` : 'PERÍODO: TODAS AS DATAS'}
                    notas={[comAtividades && 'Relatório completo: inclui cada atividade registrada nas OS e quem a executou.']}
                />

                <Resumo itens={[
                    { rot: 'OS no relatório', valor: total },
                    comConcluidas && { rot: 'Concluídas', valor: `${pct}%`, detalhe: `${concluidas} de ${validas}`, cor: COR.verde },
                    { rot: 'Em andamento', valor: contaSt('in_progress'), cor: contaSt('in_progress') ? COR.ambar : null },
                    { rot: 'Abertas / Agendadas', valor: contaSt('open') + contaSt('scheduled') },
                    { rot: 'Atrasadas', valor: atrasadas.length, cor: atrasadas.length ? COR.vermelho : null, alerta: atrasadas.length ? COR.vermelho : null },
                    { rot: 'Canceladas / Inativadas', valor: contaSt('cancelled') + contaSt('inactive') },
                ]} />

                {comHh && (
                    <>
                    <Text style={[estilos.negrito, { fontSize: 8, color: COR.suave, marginBottom: 3 }]}>HORA-HOMEM: ESTIMADO x EXECUTADO</Text>
                    <Resumo itens={[
                        { rot: 'Hh estimadas (todas as OS)', valor: `${num(hEst)} Hh` },
                        { rot: 'Hh executadas (todas as OS)', valor: `${num(hExec)} Hh`, detalhe: `${totalAtividades} ${totalAtividades === 1 ? 'atividade' : 'atividades'}`, cor: hEst > 0 && hExec > hEst ? COR.vermelho : null },
                        comConcluidas && {
                            rot: 'Concluídas: diferença no total',
                            valor: compConcluidas ? compConcluidas.texto.replace(' do estimado', '') : '—',
                            detalhe: calibracao.length ? `executado ${num(calibExec)} Hh · estimado ${num(calibEst)} Hh` : 'nenhuma concluída com estimativa',
                            cor: compConcluidas?.cor,
                            alerta: compConcluidas?.cor === COR.vermelho ? COR.vermelho : null,
                        },
                        comConcluidas && {
                            rot: 'Concluídas acima do estimado',
                            valor: calibracao.length ? `${acimaDoEstimado} de ${calibracao.length}` : '—',
                            cor: acimaDoEstimado ? COR.vermelho : null,
                        },
                    ]} />
                    </>
                )}

                {grupos.length > 1 && <QuadroPorEmbarcacao grupos={grupos} comHh={comHh} comConcluidas={comConcluidas} />}

                {secoes.map(s => (
                    <Secao key={s.titulo} titulo={s.titulo} cor={s.cor} quantidade={s.lista.length} colunas={porStatus ? COLUNAS : COLUNAS_SEM_PRAZO}>
                        {s.lista.flatMap((os, i) => {
                            const ultimaDaSecao = i === s.lista.length - 1;
                            const atividades = comAtividades ? linhasDeAtividades(os, comHh, ultimaDaSecao) : [];
                            return [
                                <Linha key={os.id} os={os} hoje={hoje} comHh={comHh} comAtividades={comAtividades} porStatus={porStatus} ultima={ultimaDaSecao && atividades.length === 0} />,
                                ...atividades,
                            ];
                        })}
                    </Secao>
                ))}

                {comHh && comConcluidas && <Calibracao lista={calibracao} />}

                <Text style={[estilos.pequeno, { marginTop: 6 }]}>
                    {comHh && 'Hh estimadas: valor previsto na OS. Hh executadas: soma da duração (início ao fim) das atividades registradas na OS; atividade ainda sem fim não entra. Executado x estimado aparece nas OS concluídas (no relatório completo, em todas); acima do estimado indica que a próxima estimativa dessa OS deve ser maior. '}
                    {comConcluidas ? '% de conclusão não conta canceladas/inativadas.' : 'OS concluídas não incluídas neste relatório.'}
                </Text>

                <Rodape texto="Andamento das Ordens de Serviço" />
            </Page>
        </Document>
    );
}
