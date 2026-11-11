import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { getMonday, getSunday, getISOWeek } from '@/utils/weeks';
import { PRIORIDADES, ROTULO_PERIODICIDADE } from '../lib/os';
import { COR, estilos, dataLocal, ddmm, ddmmaaaa, rotuloPeriodo, hoje as hojeLocal, Cabecalho, Resumo, Secao, Celula, Rodape } from './pdf/RelatorioBase';

/*
 * Relatório do Planejamento: as OS selecionadas, separadas em ATRASADAS
 * (primeiro, em destaque) e NO PRAZO, cada uma com a semana em que deve
 * ocorrer e a situação da checagem do estagiário (pendente/aguardando
 * também ficam em destaque -- é o que trava o disparo).
 */

// Larguras das colunas (somam 100%).
const COLUNAS = [
    ['Situação', '8%'], ['OS', '7%'], ['Previsto para', '8%'], ['Semana prevista', '13%'], ['Emb.', '5%'],
    ['TAG', '13%'], ['Descrição', '21%'], ['Periodicidade', '8.5%'], ['Prioridade', '6.5%'], ['Checagem', '10%'],
];
const L = COLUNAS.map(c => c[1]);

const semanaDe = (d) => {
    const seg = getMonday(d);
    return `SEM ${getISOWeek(d)} · ${ddmm(seg)} a ${ddmm(getSunday(seg))}`;
};

const CHECAGEM = {
    pending: { rot: 'Pendente', cor: COR.laranja, destaque: true },
    waiting: { rot: 'Aguardando', cor: COR.laranja, destaque: true },
    approved: { rot: 'Pronta p/ disparo', cor: COR.verde, destaque: false },
};

function Linha({ os, hoje, ultima }) {
    const data = dataLocal(os.created_at);
    const atrasada = data && data < hoje;
    const dias = atrasada ? Math.floor((hoje - data) / 86400000) + 1 : 0;
    const checagem = CHECAGEM[os.intern_status || 'pending'] || CHECAGEM.pending;
    const prioridade = PRIORIDADES.find(p => p.valor === os.priority)?.rot || os.priority || '-';
    const eq = os.equipment || {};

    return (
        <View wrap={false} style={[estilos.tableRow, atrasada && { backgroundColor: '#fef2f2' }, ultima && { borderBottomWidth: 0 }]}>
            <Celula largura={L[0]}>
                {atrasada ? (
                    <>
                        <Text style={[estilos.negrito, { color: COR.vermelho }]}>ATRASADA</Text>
                        <Text style={{ color: COR.vermelho, fontSize: 7 }}>{dias} {dias === 1 ? 'dia' : 'dias'}</Text>
                    </>
                ) : <Text>No prazo</Text>}
            </Celula>
            <Celula largura={L[1]}><Text style={estilos.negrito}>{os.os_number || '-'}</Text></Celula>
            <Celula largura={L[2]}><Text style={atrasada ? [estilos.negrito, { color: COR.vermelho }] : null}>{ddmmaaaa(data)}</Text></Celula>
            <Celula largura={L[3]}><Text>{data ? semanaDe(data) : '-'}</Text></Celula>
            <Celula largura={L[4]}><Text>{eq.vessel?.tag || '-'}</Text></Celula>
            <Celula largura={L[5]}>
                <Text>{eq.tag_number || '-'}</Text>
                {eq.tag_antigo ? <Text style={estilos.pequeno}>antiga: {eq.tag_antigo}</Text> : null}
            </Celula>
            <Celula largura={L[6]}>
                <Text>{(os.description || '').substring(0, 110)}{os.description?.length > 110 ? '...' : ''}</Text>
            </Celula>
            <Celula largura={L[7]}><Text>{ROTULO_PERIODICIDADE[os.periodicity] || 'Avulsa'}</Text></Celula>
            <Celula largura={L[8]}><Text>{prioridade}</Text></Celula>
            <Celula largura={L[9]} ultima>
                <Text style={[{ color: checagem.cor }, checagem.destaque && estilos.negrito]}>{checagem.rot}</Text>
                {os.intern_status === 'waiting' && os.intern_reason ? <Text style={estilos.pequeno}>Falta: {os.intern_reason}</Text> : null}
            </Celula>
        </View>
    );
}

/**
 * inicio/fim: período do Planejamento na tela (Date locais).
 * incluiAtrasadas: modo "próximas N semanas", que também traz o que ficou para trás.
 */
export default function PlanningReportPdfTemplate({ workOrders = [], inicio = null, fim = null, incluiAtrasadas = false }) {
    const hoje = hojeLocal();
    const porData = [...workOrders].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const atrasadas = porData.filter(os => dataLocal(os.created_at) < hoje);
    const noPrazo = porData.filter(os => !(dataLocal(os.created_at) < hoje));
    const conta = (st) => workOrders.filter(os => (os.intern_status || 'pending') === st).length;
    const pendentes = conta('pending');
    const aguardando = conta('waiting');
    const periodo = rotuloPeriodo(inicio, fim);

    const linhas = (lista) => lista.map((os, i) => <Linha key={os.id} os={os} hoje={hoje} ultima={i === lista.length - 1} />);

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={estilos.page}>
                <Cabecalho
                    subtitulo="COORDENAÇÃO DA FROTA - PLANEJAMENTO DE MANUTENÇÃO"
                    periodo={periodo && `PERÍODO PLANEJADO: ${periodo}`}
                    notas={[incluiAtrasadas && 'Inclui OS atrasadas de semanas anteriores ainda não executadas.']}
                />

                <Resumo itens={[
                    { rot: 'OS no relatório', valor: workOrders.length },
                    { rot: 'Atrasadas', valor: atrasadas.length, cor: atrasadas.length ? COR.vermelho : null, alerta: atrasadas.length ? COR.vermelho : null },
                    { rot: 'No prazo', valor: noPrazo.length },
                    { rot: 'Pendentes de checagem', valor: pendentes, cor: pendentes ? COR.laranja : null, alerta: pendentes ? COR.laranja : null },
                    { rot: 'Aguardando', valor: aguardando, cor: aguardando ? COR.laranja : null, alerta: aguardando ? COR.laranja : null },
                    { rot: 'Prontas p/ disparo', valor: conta('approved'), cor: COR.verde },
                ]} />

                <Secao titulo="OS ATRASADAS — data prevista já passou" cor={COR.vermelho} quantidade={atrasadas.length} colunas={COLUNAS}>{linhas(atrasadas)}</Secao>
                <Secao titulo="OS NO PRAZO" cor={COR.azul} quantidade={noPrazo.length} colunas={COLUNAS}>{linhas(noPrazo)}</Secao>

                <Rodape texto="Planejamento de Manutenção" />
            </Page>
        </Document>
    );
}
