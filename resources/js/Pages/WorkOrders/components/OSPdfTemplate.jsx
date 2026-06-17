import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos recriados para ficar idêntico ao modelo físico, mas mais moderno e limpo
const styles = StyleSheet.create({
    page: { 
        padding: 30, 
        fontFamily: 'Helvetica', 
        fontSize: 10, 
        color: '#000' 
    },
    // Cabeçalho
    headerTable: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#000',
        marginBottom: 10,
    },
    headerLogoCell: {
        width: '20%',
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleCell: {
        width: '60%',
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfoCell: {
        width: '20%',
        flexDirection: 'column',
    },
    headerInfoRow: {
        flex: 1,
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    headerInfoLabel: {
        width: '40%',
        backgroundColor: '#f1f5f9',
        padding: 3,
        borderRightWidth: 1,
        borderRightColor: '#000',
        fontWeight: 'bold',
        fontSize: 9,
        textAlign: 'center',
    },
    headerInfoValue: {
        width: '60%',
        padding: 3,
        fontSize: 10,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    logo: { 
        width: 60, 
        height: 'auto', 
        objectFit: 'contain' 
    },
    titleMain: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    titleSub: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 4 },
    
    // Tabelas e Seções
    sectionTitle: {
        backgroundColor: '#e2e8f0',
        padding: 4,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        borderWidth: 1,
        borderColor: '#000',
        borderBottomWidth: 0,
        textAlign: 'center',
        width: '100%',
    },
    box: {
        borderWidth: 1,
        borderColor: '#000',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    rowNoBorder: {
        flexDirection: 'row',
    },
    cellLabel: {
        backgroundColor: '#f8fafc',
        padding: 4,
        fontFamily: 'Helvetica-Bold',
        borderRightWidth: 1,
        borderRightColor: '#000',
    },
    cellValue: {
        padding: 4,
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: '#000',
    },
    cellValueLast: {
        padding: 4,
        flex: 1,
    },
    descriptionBox: {
        padding: 6,
        minHeight: 50,
    },
    
    // Tabela Grid (Atividades e Peças)
    gridHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        fontFamily: 'Helvetica-Bold',
    },
    gridRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        minHeight: 20,
    },
    gridCell: {
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: '#000',
        fontSize: 9,
        justifyContent: 'center',
    },
    
    // Rodapé de Assinaturas
    footerBlock: {
        marginTop: 50,
    },
    signatureContainer: {
        height: 80, 
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    signatureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 90,
        paddingHorizontal: 20,
    },
    signatureLine: {
        width: 200,
        borderTopWidth: 1,
        borderTopColor: '#000',
        alignItems: 'center',
        paddingTop: 5,
    },
    signatureText: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
    }
});

// Tradutores
const translateMaintenance = (type) => {
    if (type === 'corrective') return 'Corretiva';
    if (type === 'preventive') return 'Preventiva';
    if (type === 'predictive') return 'Preditiva';
    return type || '-';
};

const translatePriority = (priority) => {
    if (priority === 'critical') return 'Crítica';
    if (priority === 'high') return 'Alta';
    if (priority === 'medium') return 'Média';
    if (priority === 'low') return 'Baixa';
    return priority || '-';
};

const formatDateTime = (isoString) => {
    if (!isoString) return ' : ';
    
    try {
        const [datePart, timePart] = isoString.split('T');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes] = timePart.split(':');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        return ' : ';
    }
};


const OSPdfTemplate = ({ os }) => {
    const equip = os.equipment || {};
    const vessel = equip.vessel || {};
    
    const dataCriacao = os.created_at 
        ? os.created_at.substring(0, 10).split('-').reverse().join('/') 
        : '-';

    // Se houver atividades cadastradas no banco, usamos. Se não, geramos linhas em branco para preenchimento manual.
    const atividades = (os.activities && os.activities.length > 0) ? os.activities : [{}, {}, {}, {}];
    const pecasBlank = [{}, {}, {}]; // Linhas em branco para a tabela de peças

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                
                {/* CABEÇALHO (Logo, FURG, ID e Data) */}
                <View style={styles.headerTable}>
                    <View style={styles.headerLogoCell}>
                        <Image style={styles.logo} src={`${window.location.origin}/LogoFROTA.png`} />
                    </View>
                    <View style={styles.headerTitleCell}>
                        <Text style={styles.titleMain}>UNIVERSIDADE FEDERAL DO RIO GRANDE - FURG</Text>
                        <Text style={styles.titleSub}>COORDENAÇÃO DA FROTA</Text>
                        <Text style={[styles.titleMain, { marginTop: 8 }]}>ORDEM DE SERVIÇO</Text>
                    </View>
                    <View style={styles.headerInfoCell}>
                        <View style={styles.headerInfoRow}>
                            <Text style={styles.headerInfoLabel}>ID</Text>
                            <Text style={styles.headerInfoValue}>{os.os_number || os.ss_number || '-'}</Text>
                        </View>
                        <View style={[styles.headerInfoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.headerInfoLabel}>DATA</Text>
                            <Text style={styles.headerInfoValue}>{dataCriacao}</Text>
                        </View>
                    </View>
                </View>

                {/* DADOS DO EQUIPAMENTO */}
                <Text style={styles.sectionTitle}>IDENTIFICAÇÃO DO ATIVO</Text>
                <View style={styles.box}>
                    <View style={styles.row}>
                        <Text style={[styles.cellLabel, { width: '20%' }]}>Equipamento:</Text>
                        <Text style={[styles.cellValue, { width: '80%', borderRightWidth: 0 }]}>{equip.name || '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[styles.cellLabel, { width: '20%' }]}>TAG:</Text>
                        <Text style={[styles.cellValue, { width: '30%' }]}>{equip.tag_number || '-'}</Text>
                        <Text style={[styles.cellLabel, { width: '20%' }]}>Nº de Série:</Text>
                        <Text style={[styles.cellValueLast, { width: '30%' }]}>{equip.series_number || '-'}</Text>
                    </View>
                    <View style={styles.rowNoBorder}>
                        <Text style={[styles.cellLabel, { width: '20%' }]}>Marca:</Text>
                        <Text style={[styles.cellValue, { width: '30%' }]}>{equip.manufacturer || equip.marca || '-'}</Text>
                        <Text style={[styles.cellLabel, { width: '20%' }]}>Modelo:</Text>
                        <Text style={[styles.cellValueLast, { width: '30%' }]}>{equip.model || equip.modelo || '-'}</Text>
                    </View>
                </View>

                {/* SERVIÇO / INFORMAÇÕES GERAIS */}
                <Text style={styles.sectionTitle}>SERVIÇO</Text>
                <View style={styles.box}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cellLabel, { borderRightWidth: 0 }]}>Descrição do problema/atividade:</Text>
                            <View style={styles.descriptionBox}>
                                <Text>{os.description}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={[styles.cellLabel, { width: '15%' }]}>Tipo:</Text>
                        <Text style={[styles.cellValue, { width: '35%' }]}>{translateMaintenance(os.maintenance_type)}</Text>
                        <Text style={[styles.cellLabel, { width: '15%' }]}>Prioridade:</Text>
                        <Text style={[styles.cellValueLast, { width: '35%' }]}>{translatePriority(os.priority)}</Text>
                    </View>
                    
                    <View style={styles.rowNoBorder}>
                        <Text style={[styles.cellLabel, { width: '25%' }]}>Empresa encarregada:</Text>
                        <Text style={[styles.cellValue, { width: '35%' }]}>{os.vendor_name || '-'}</Text>
                        <Text style={[styles.cellLabel, { width: '15%' }]}>Status:</Text>
                        <Text style={[styles.cellValueLast, { width: '25%' }]}>{os.status === 'open' ? 'Aberta' : os.status}</Text>
                    </View>
                </View>

                {/* TABELA DE ATIVIDADES (Com espaços para preenchimento manual de horas se vazio) */}
                <Text style={styles.sectionTitle}>REGISTRO DE ATIVIDADES</Text>
                <View style={styles.box}>
                    <View style={styles.gridHeader}>
                        <Text style={[styles.gridCell, { width: '15%' }]}>Hora Início</Text>
                        <Text style={[styles.gridCell, { width: '15%' }]}>Hora Término</Text>
                        <Text style={[styles.gridCell, { width: '50%' }]}>Atividade</Text>
                        <Text style={[styles.gridCell, { width: '20%', borderRightWidth: 0 }]}>Executante</Text>
                    </View>
                    {atividades.map((ativ, i) => {
                        const user = ativ.responsible_user;
                        const nomeExecutante = user ? (user.username || user.nickname || ' ') : ' ';

                        return (
                            <View key={i} style={i === atividades.length - 1 ? styles.rowNoBorder : styles.gridRow}>
                                <Text style={[styles.gridCell, { width: '15%' }]}>{formatDateTime(ativ.started_at)}</Text>
                                <Text style={[styles.gridCell, { width: '15%' }]}>{formatDateTime(ativ.completed_at)}</Text>
                                <Text style={[styles.gridCell, { width: '50%' }]}>{ativ.description || ' '}</Text>
                                
                                <Text style={[styles.gridCell, { width: '20%', borderRightWidth: 0 }]}>
                                    {nomeExecutante}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* TABELA DE PEÇAS (Para preenchimento manual) */}
                <Text style={styles.sectionTitle}>PEÇAS E MATERIAIS UTILIZADOS</Text>
                <View style={styles.box}>
                    <View style={styles.gridHeader}>
                        <Text style={[styles.gridCell, { width: '50%' }]}>Descrição</Text>
                        <Text style={[styles.gridCell, { width: '15%' }]}>QTD.</Text>
                        <Text style={[styles.gridCell, { width: '15%' }]}>Preço Unit. (R$)</Text>
                        <Text style={[styles.gridCell, { width: '20%', borderRightWidth: 0 }]}>Custo Total (R$)</Text>
                    </View>
                    {pecasBlank.map((_, i) => (
                        <View key={i} style={i === pecasBlank.length - 1 ? styles.rowNoBorder : styles.gridRow}>
                            <Text style={[styles.gridCell, { width: '50%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '15%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '15%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '20%', borderRightWidth: 0 }]}> </Text>
                        </View>
                    ))}
                </View>

                {/* RODAPÉ E ASSINATURAS */}
                <View style={styles.footerBlock}>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 15 }}>
                        Data do fechamento da OS: ______ / ______ / ________
                    </Text>
                    <Text style={{ fontSize: 10 }}>
                        Confirmo a realização dos serviços descritos e o uso das peças relacionadas:
                    </Text>

                    <View style={styles.signatureContainer}>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureText}>Assinatura do executante</Text>
                        </View>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureText}>Assinatura Dep. Manutenção</Text>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    );
};

export default OSPdfTemplate;