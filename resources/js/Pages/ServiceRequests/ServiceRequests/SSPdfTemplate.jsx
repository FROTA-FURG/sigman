import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { 
        padding: 30, 
        fontFamily: 'Helvetica', 
        fontSize: 10, 
        color: '#000' 
    },
    
    // CABEÇALHO
    headerTable: { 
        flexDirection: 'row', 
        borderWidth: 1, 
        borderColor: '#000', 
        marginBottom: 10 
    },
    headerLogoCell: { 
        width: '20%', 
        padding: 5, 
        borderRightWidth: 1, 
        borderRightColor: '#000', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    headerTitleCell: { 
        width: '60%', 
        padding: 5, 
        borderRightWidth: 1, 
        borderRightColor: '#000', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    headerInfoCell: { 
        width: '20%', 
        flexDirection: 'column' 
    },
    headerInfoRow: { 
        flex: 1, 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: '#000' 
    },
    headerInfoLabel: { 
        width: '40%', 
        backgroundColor: '#f1f5f9', 
        padding: 3, 
        borderRightWidth: 1, 
        borderRightColor: '#000', 
        fontWeight: 'bold', 
        fontSize: 9, 
        textAlign: 'center' 
    },
    headerInfoValue: { 
        width: '60%', 
        padding: 3, 
        fontSize: 10, 
        textAlign: 'center', 
        fontWeight: 'bold' 
    },
    logo: { 
        width: 60, 
        height: 'auto', 
        objectFit: 'contain' 
    },
    titleMain: { 
        fontSize: 12, 
        fontFamily: 'Helvetica-Bold', 
        textAlign: 'center' 
    },
    titleSub: { 
        fontSize: 10, 
        fontFamily: 'Helvetica-Bold', 
        textAlign: 'center', 
        marginTop: 4 
    },
    
    // TABELAS E SEÇÕES GERAIS
    sectionTitle: { 
        backgroundColor: '#e2e8f0', 
        padding: 4, 
        fontFamily: 'Helvetica-Bold', 
        fontSize: 10, 
        borderWidth: 1, 
        borderColor: '#000', 
        borderBottomWidth: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: { 
        borderWidth: 1, 
        borderColor: '#000', 
        marginBottom: 10 
    },
    row: { 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: '#000' 
    },
    rowNoBorder: { 
        flexDirection: 'row' 
    },
    cellLabel: { 
        backgroundColor: '#f8fafc', 
        padding: 4, 
        fontFamily: 'Helvetica-Bold', 
        borderRightWidth: 1, 
        borderRightColor: '#000' 
    },
    cellValue: { 
        padding: 4, 
        flex: 1, 
        borderRightWidth: 1, 
        borderRightColor: '#000' 
    },
    cellValueLast: { 
        padding: 4, 
        flex: 1 
    },
    descriptionBox: { 
        padding: 6, 
        minHeight: 50 
    },
    
    // TABELA GRID (Atividades e Peças)
    gridHeader: { 
        flexDirection: 'row', 
        backgroundColor: '#f1f5f9', 
        borderBottomWidth: 1, 
        borderBottomColor: '#000', 
        fontFamily: 'Helvetica-Bold' 
    },
    gridRow: { 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: '#000', 
        minHeight: 20 
    },
    gridCell: { 
        padding: 4, 
        borderRightWidth: 1, 
        borderRightColor: '#000', 
        fontSize: 9, 
        justifyContent: 'center', 
        alignItems: 'center',
        textAlign: 'center' // <-- AQUI ESTÁ A CORREÇÃO QUE CENTRALIZA OS TÍTULOS!
    },
    
    // ==========================================
    // ORÇAMENTO E ASSINATURAS
    // ==========================================
    budgetRow: { 
        flexDirection: 'row', 
        justifyContent: 'flex-end', 
        padding: 5, 
        borderTopWidth: 1, 
        borderTopColor: '#000', 
        backgroundColor: '#f8fafc' 
    },
    budgetText: { 
        fontFamily: 'Helvetica-Bold', 
        fontSize: 11 
    },
    signatureContainer: { 
        height: 120, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        paddingHorizontal: 20, 
        marginTop: 10 
    },
    signatureLine: { 
        width: 200, 
        borderTopWidth: 1, 
        borderTopColor: '#000', 
        alignItems: 'center', 
        paddingTop: 5 
    },
    signatureText: { 
        fontSize: 9, 
        fontFamily: 'Helvetica-Bold' 
    }
});

const translateMaintenance = (type) => {
    if (type === 'corrective') return 'Corretiva';
    if (type === 'preventive') return 'Preventiva';
    if (type === 'predictive') return 'Preditiva';
    return type || '-';
};

const translatePriority = (priority) => {
    if (priority === 'critical' || priority === 'urgent') return 'Urgente / Crítica';
    if (priority === 'high') return 'Alta';
    if (priority === 'medium' || priority === 'normal') return 'Normal';
    if (priority === 'low') return 'Baixa';
    return priority || '-';
};

const formatDateTime = (isoString) => {
    if (!isoString) return ' - ';
    try {
        const [datePart] = isoString.split('T');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    } catch (error) {
        return ' - ';
    }
};

const SSPdfTemplate = ({ ss }) => {
    const equip = ss.equipment || {};
    const vessel = equip.vessel || ss.vessel || {};
    
    const dataCriacao = formatDateTime(ss.created_at);
    
    // Arrays para desenhar tabelas vazias para preenchimento manual / orçamento
    const atividadesBlank = [{}, {}, {}]; 
    const pecasBlank = [{}, {}, {}, {}];

    // Formatação de moeda para o orçamento
    const formattedBudget = ss.budget ? parseFloat(ss.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '          ';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                
                {/* CABEÇALHO */}
                <View style={styles.headerTable}>
                    <View style={styles.headerLogoCell}>
                        <Image style={styles.logo} src={`${window.location.origin}/LogoFROTA.png`} />
                    </View>
                    <View style={styles.headerTitleCell}>
                        <Text style={styles.titleMain}>UNIVERSIDADE FEDERAL DO RIO GRANDE - FURG</Text>
                        <Text style={styles.titleSub}>COORDENAÇÃO DA FROTA</Text>
                        <Text style={[styles.titleMain, { marginTop: 8 }]}>SOLICITAÇÃO DE SERVIÇO</Text>
                    </View>
                    <View style={styles.headerInfoCell}>
                        <View style={styles.headerInfoRow}>
                            <Text style={styles.headerInfoLabel}>ID</Text>
                            <Text style={styles.headerInfoValue}>{ss.ss_number || '-'}</Text>
                        </View>
                        <View style={[styles.headerInfoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.headerInfoLabel}>DATA</Text>
                            <Text style={styles.headerInfoValue}>{dataCriacao}</Text>
                        </View>
                    </View>
                </View>

                {/* DADOS DO EQUIPAMENTO / SERVIÇO */}
                <Text style={styles.sectionTitle}>SERVIÇO</Text>
                <View style={styles.box}>
                    <View style={styles.row}>
                        <Text style={[styles.cellLabel, { width: '20%' }]}>Equipamento:</Text>
                        <Text style={[styles.cellValue, { width: '80%', borderRightWidth: 0 }]}>{equip.name || 'Geral / Não Especificado'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={[styles.cellLabel, { width: '20%' }]}>TAG / Local:</Text>
                        <Text style={[styles.cellValue, { width: '30%' }]}>{ss.tag_number || equip.tag_number || '-'}</Text>
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

                {/* DESCRIÇÃO E DETALHES DA SOLICITAÇÃO */}
                <Text style={styles.sectionTitle}>DESCRIÇÃO DO PROBLEMA / ATIVIDADE</Text>
                <View style={styles.box}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.descriptionBox}>
                                <Text>{ss.description}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={[styles.cellLabel, { width: '15%' }]}>Tipo:</Text>
                        <Text style={[styles.cellValue, { width: '35%' }]}>{translateMaintenance(ss.maintenance_type)}</Text>
                        <Text style={[styles.cellLabel, { width: '15%' }]}>Prioridade:</Text>
                        <Text style={[styles.cellValueLast, { width: '35%' }]}>{translatePriority(ss.priority)}</Text>
                    </View>
                    
                    <View style={styles.rowNoBorder}>
                        <Text style={[styles.cellLabel, { width: '25%' }]}>Empresa encarregada:</Text>
                        <Text style={[styles.cellValue, { width: '35%' }]}>{ss.vendor_name || '-'}</Text>
                        <Text style={[styles.cellLabel, { width: '15%' }]}>Status:</Text>
                        <Text style={[styles.cellValueLast, { width: '25%' }]}>{ss.status === 'pending' ? 'Pendente' : ss.status === 'approved' ? 'Aprovada' : ss.status}</Text>
                    </View>
                </View>

                {/* TABELA DE ATIVIDADES (Em Branco para Orçamento) */}
                <View style={styles.box}>
                    <View style={styles.gridHeader}>
                        <Text style={[styles.gridCell, { width: '70%' }]}>Atividades</Text>
                        <Text style={[styles.gridCell, { width: '30%', borderRightWidth: 0 }]}>Tempo estimado (hh:mm)</Text>
                    </View>
                    {atividadesBlank.map((_, i) => (
                        <View key={i} style={i === atividadesBlank.length - 1 ? styles.rowNoBorder : styles.gridRow}>
                            <Text style={[styles.gridCell, { width: '70%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '30%', borderRightWidth: 0 }]}> </Text>
                        </View>
                    ))}
                    <View style={[styles.gridRow, { borderBottomWidth: 0, backgroundColor: '#f8fafc' }]}>
                        <Text style={[styles.gridCell, { width: '70%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>Total de Horas</Text>
                        <Text style={[styles.gridCell, { width: '30%', borderRightWidth: 0 }]}> </Text>
                    </View>
                </View>

                {/* TABELA DE PEÇAS (Em Branco para Orçamento) */}
                <Text style={styles.sectionTitle}>PEÇAS</Text>
                <View style={styles.box}>
                    <View style={styles.gridHeader}>
                        <Text style={[styles.gridCell, { width: '40%' }]}>Descrição</Text>
                        <Text style={[styles.gridCell, { width: '15%' }]}>Preço unit. (R$)</Text>
                        <Text style={[styles.gridCell, { width: '10%' }]}>QTD.</Text>
                        <Text style={[styles.gridCell, { width: '15%' }]}>Frete (R$)</Text>
                        <Text style={[styles.gridCell, { width: '20%', borderRightWidth: 0 }]}>Custo total (R$)</Text>
                    </View>
                    {pecasBlank.map((_, i) => (
                        <View key={i} style={styles.gridRow}>
                            <Text style={[styles.gridCell, { width: '40%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '15%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '10%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '15%' }]}> </Text>
                            <Text style={[styles.gridCell, { width: '20%', borderRightWidth: 0 }]}> </Text>
                        </View>
                    ))}
                    <View style={styles.budgetRow}>
                        <Text style={styles.budgetText}>Total orçado: R$ {formattedBudget}</Text>
                    </View>
                </View>

                {/* RODAPÉ E ASSINATURAS COM CAIXA INVISÍVEL (Altura 120 para garantir espaço) */}
                <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 10, marginBottom: 5 }}>
                        Confirmo a realização dos serviços descritos e o uso das peças relacionadas:
                    </Text>

                    <View style={styles.signatureContainer}>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureText}>Assinatura do responsável da empresa</Text>
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

export default SSPdfTemplate;