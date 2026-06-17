import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9, color: '#000' },
    headerTable: { flexDirection: 'row', borderWidth: 1, borderColor: '#000', marginBottom: 15 },
    headerLogoCell: { width: '20%', padding: 5, borderRightWidth: 1, borderRightColor: '#000', alignItems: 'center', justifyContent: 'center' },
    headerTitleCell: { width: '80%', padding: 5, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 60, height: 'auto', objectFit: 'contain' },
    titleMain: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    titleSub: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 4 },
    
    // Tabela do Relatório
    table: { width: '100%', borderWidth: 1, borderColor: '#000' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#000', fontFamily: 'Helvetica-Bold' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 20, alignItems: 'center' },
    tableRowAlt: { backgroundColor: '#f8fafc' }, // Efeito Zebra
    
    // Células
    cellOs: { width: '10%', padding: 4, borderRightWidth: 1, borderRightColor: '#000', textAlign: 'center' },
    cellData: { width: '12%', padding: 4, borderRightWidth: 1, borderRightColor: '#000', textAlign: 'center' },
    cellEmb: { width: '12%', padding: 4, borderRightWidth: 1, borderRightColor: '#000', textAlign: 'center' },
    cellTag: { width: '15%', padding: 4, borderRightWidth: 1, borderRightColor: '#000', textAlign: 'center' },
    cellDesc: { width: '36%', padding: 4, borderRightWidth: 1, borderRightColor: '#000' },
    cellStatus: { width: '15%', padding: 4, textAlign: 'center' },
});

const translateStatus = (status) => {
    const s = { open: 'Aberto', in_progress: 'Andamento', completed: 'Fechado', cancelled: 'Cancelado' };
    return s[status] || status;
};

const ReportPdfTemplate = ({ workOrders = [] }) => {
    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* CABEÇALHO */}
                <View style={styles.headerTable}>
                    <View style={styles.headerLogoCell}>
                        <Image style={styles.logo} src={`${window.location.origin}/LogoFROTA.png`} />
                    </View>
                    <View style={styles.headerTitleCell}>
                        <Text style={styles.titleMain}>UNIVERSIDADE FEDERAL DO RIO GRANDE - FURG</Text>
                        <Text style={styles.titleSub}>COORDENAÇÃO DA FROTA - RELATÓRIO DE ORDENS DE SERVIÇO</Text>
                        <Text style={{ fontSize: 8, marginTop: 5, color: '#475569' }}>Emitido em: {dataEmissao} | Total de OS: {workOrders.length}</Text>
                    </View>
                </View>

                {/* TABELA DE DADOS */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.cellOs}>OS</Text>
                        <Text style={styles.cellData}>Criação</Text>
                        <Text style={styles.cellEmb}>Embarcação</Text>
                        <Text style={styles.cellTag}>TAG</Text>
                        <Text style={styles.cellDesc}>Descrição Resumida</Text>
                        <Text style={styles.cellStatus}>Status</Text>
                    </View>

                    {workOrders.map((os, index) => {
                        const isEven = index % 2 === 0;
                        const vesselTag = os.equipment?.vessel?.tag || '-';
                        const equipTag = os.equipment?.tag_number || '-';
                        const dataCriacao = os.created_at ? os.created_at.substring(0, 10).split('-').reverse().join('/') : '-';

                        return (
                            <View key={os.id} style={[styles.tableRow, !isEven && styles.tableRowAlt, index === workOrders.length - 1 && { borderBottomWidth: 0 }]}>
                                <Text style={styles.cellOs}>{os.os_number || '-'}</Text>
                                <Text style={styles.cellData}>{dataCriacao}</Text>
                                <Text style={styles.cellEmb}>{vesselTag}</Text>
                                <Text style={styles.cellTag}>{equipTag}</Text>
                                <Text style={styles.cellDesc}>{os.description?.substring(0, 70)}{os.description?.length > 70 ? '...' : ''}</Text>
                                <Text style={styles.cellStatus}>{translateStatus(os.status)}</Text>
                            </View>
                        );
                    })}
                </View>
            </Page>
        </Document>
    );
};

export default ReportPdfTemplate;