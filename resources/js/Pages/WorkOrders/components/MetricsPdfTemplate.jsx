import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9, color: '#000' },

    headerTable: { flexDirection: 'row', borderWidth: 1, borderColor: '#000', marginBottom: 12 },
    headerLogoCell: { width: '25%', padding: 5, borderRightWidth: 1, borderRightColor: '#000', alignItems: 'center', justifyContent: 'center' },
    headerTitleCell: { width: '75%', padding: 5, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 55, height: 'auto', objectFit: 'contain' },
    titleMain: { fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    titleSub: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 4 },
    titleEscopo: { fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 3, color: '#1e293b' },

    secaoTitulo: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 5, marginTop: 12 },

    // Cartões de KPI (2 x 2, pra caber confortável no retrato)
    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    kpiCard: { flex: 1, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 3, padding: 8, alignItems: 'center' },
    kpiLabel: { fontSize: 8, color: '#475569', textAlign: 'center', textTransform: 'uppercase' },
    kpiValor: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginTop: 3 },
    kpiNota: { fontSize: 7, color: '#64748b', textAlign: 'center', marginTop: 3 },

    // Tabelas
    table: { width: '100%', borderWidth: 1, borderColor: '#000' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#000', fontFamily: 'Helvetica-Bold' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 18, alignItems: 'center' },
    tableRowAlt: { backgroundColor: '#f8fafc' },
    tableVazia: { padding: 5, color: '#64748b' },

    // Colunas: carga por embarcação
    cargaEmb: { width: '40%', padding: 4, borderRightWidth: 1, borderRightColor: '#000' },
    cargaNum: { width: '15%', padding: 4, borderRightWidth: 1, borderRightColor: '#000', textAlign: 'center' },
    cargaTotal: { width: '15%', padding: 4, textAlign: 'center', fontFamily: 'Helvetica-Bold' },

    // Colunas: periodicidade
    periodNome: { width: '70%', padding: 4, borderRightWidth: 1, borderRightColor: '#000' },
    periodQtd: { width: '30%', padding: 4, textAlign: 'center' },

    rodape: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 7, color: '#94a3b8' },
});

/**
 * Relatório da aba Métricas: só os indicadores que estão na tela no momento
 * da exportação (respeitando a flag do Plano de 52 Semanas). Os números
 * chegam prontos do FullPlan pra não haver risco de a conta do PDF divergir
 * da conta da tela. A listagem das OS fica de fora de propósito -- quem
 * precisa da lista exporta pela aba Andamento.
 */
const MetricsPdfTemplate = ({
    workOrders = [],
    metrics = {},
    cargaPorEmbarcacao = [],
    periodoCarga = null,
    apenasPlano52 = false,
}) => {
    const dataEmissao = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const periodicidades = metrics.pieData || [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerTable}>
                    <View style={styles.headerLogoCell}>
                        <Image style={styles.logo} src={`${window.location.origin}/LogoFROTA.png`} />
                    </View>
                    <View style={styles.headerTitleCell}>
                        <Text style={styles.titleMain}>UNIVERSIDADE FEDERAL DO RIO GRANDE - FURG</Text>
                        <Text style={styles.titleSub}>COORDENAÇÃO DA FROTA - RELATÓRIO DE MÉTRICAS DE MANUTENÇÃO</Text>
                        <Text style={styles.titleEscopo}>
                            {apenasPlano52
                                ? 'ESCOPO: APENAS OS DO PLANO DE MANUTENÇÃO PREVENTIVA DE 52 SEMANAS'
                                : 'ESCOPO: TODAS AS ORDENS DE SERVIÇO DA FROTA'}
                        </Text>
                        <Text style={{ fontSize: 8, marginTop: 5, color: '#475569' }}>
                            Emitido em: {dataEmissao} | Base: {workOrders.length} OS
                        </Text>
                    </View>
                </View>

                {/* INDICADORES */}
                <Text style={styles.secaoTitulo}>Indicadores</Text>

                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>OS Ativas</Text>
                        <Text style={styles.kpiValor}>{metrics.totalActive ?? 0}</Text>
                        <Text style={styles.kpiNota}>Trabalhos em andamento</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>OS Atrasadas</Text>
                        <Text style={styles.kpiValor}>{metrics.totalOverdue ?? 0}</Text>
                        <Text style={styles.kpiNota}>Mais de 15 dias em aberto</Text>
                    </View>
                </View>

                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>OS Adiantadas</Text>
                        <Text style={styles.kpiValor}>{metrics.totalAhead ?? 0}</Text>
                        <Text style={styles.kpiNota}>Concluídas antes do prazo</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Fila de Aprovação</Text>
                        <Text style={styles.kpiValor}>{metrics.awaitingApproval?.length ?? 0}</Text>
                        <Text style={styles.kpiNota}>Necessitam peças</Text>
                    </View>
                </View>

                {/* CARGA DE TRABALHO POR EMBARCAÇÃO */}
                <Text style={styles.secaoTitulo}>
                    Carga de Trabalho por Embarcação{periodoCarga ? ` — ${periodoCarga}` : ''}
                </Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.cargaEmb}>Embarcação</Text>
                        <Text style={styles.cargaNum}>Corretiva</Text>
                        <Text style={styles.cargaNum}>Preventiva</Text>
                        <Text style={styles.cargaNum}>Preditiva</Text>
                        <Text style={styles.cargaTotal}>Total</Text>
                    </View>
                    {cargaPorEmbarcacao.length === 0 ? (
                        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.tableVazia}>Nenhuma OS no período selecionado.</Text>
                        </View>
                    ) : cargaPorEmbarcacao.map((linha, index) => (
                        <View
                            key={linha.name}
                            style={[styles.tableRow, index % 2 !== 0 && styles.tableRowAlt, index === cargaPorEmbarcacao.length - 1 && { borderBottomWidth: 0 }]}
                        >
                            <Text style={styles.cargaEmb}>{linha.name}</Text>
                            <Text style={styles.cargaNum}>{linha.Corretiva}</Text>
                            <Text style={styles.cargaNum}>{linha.Preventiva}</Text>
                            <Text style={styles.cargaNum}>{linha.Preditiva}</Text>
                            <Text style={styles.cargaTotal}>{linha.Corretiva + linha.Preventiva + linha.Preditiva}</Text>
                        </View>
                    ))}
                </View>

                {/* OS PLANEJADAS POR PERIODICIDADE */}
                <Text style={styles.secaoTitulo}>OS Planejadas por Periodicidade</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.periodNome}>Periodicidade</Text>
                        <Text style={styles.periodQtd}>Quantidade</Text>
                    </View>
                    {periodicidades.length === 0 ? (
                        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.tableVazia}>Sem dados de periodicidade.</Text>
                        </View>
                    ) : periodicidades.map((item, index) => (
                        <View
                            key={item.name}
                            style={[styles.tableRow, index % 2 !== 0 && styles.tableRowAlt, index === periodicidades.length - 1 && { borderBottomWidth: 0 }]}
                        >
                            <Text style={styles.periodNome}>{item.name}</Text>
                            <Text style={styles.periodQtd}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.rodape} fixed>
                    SIGMAN - Sistema Integrado de Gestão de Manutenção Naval | Coordenação da Frota - FURG
                </Text>
            </Page>
        </Document>
    );
};

export default MetricsPdfTemplate;
