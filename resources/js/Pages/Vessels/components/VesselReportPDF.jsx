import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Estilos específicos para o PDF (não usa Tailwind aqui, usa um CSS parecido com React Native)
const styles = StyleSheet.create({
    page: {
        padding: 40,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 30,
        borderBottom: '2px solid #0f172a',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 5,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 10,
        backgroundColor: '#f1f5f9',
        padding: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        paddingVertical: 5,
        marginBottom: 2,
    },
    label: {
        fontSize: 10,
        color: '#64748b',
        width: '50%',
    },
    value: {
        fontSize: 10,
        color: '#0f172a',
        width: '50%',
        textAlign: 'right',
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        fontSize: 8,
        color: '#94a3b8',
        textAlign: 'center',
        borderTop: '1px solid #e2e8f0',
        paddingTop: 10,
    }
});

// O Componente que monta o documento
export default function VesselReportPDF({ vessel }) {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Cabeçalho */}
                <View style={styles.header}>
                    <Text style={styles.title}>{vessel.name}</Text>
                    <Text style={styles.subtitle}>TAG: {vessel.tag} | Tipo: {vessel.type}</Text>
                </View>

                {/* Status Operacional */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status Operacional</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Índice de Saúde (Health Score)</Text>
                        <Text style={styles.value}>{vessel.healthScore}%</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Status Físico</Text>
                        <Text style={styles.value}>{vessel.status}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Status de Navegação</Text>
                        <Text style={styles.value}>{vessel.navigationStatus}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Última Docagem / Inspeção</Text>
                        <Text style={styles.value}>{vessel.lastInspection}</Text>
                    </View>
                </View>

                {/* Especificações Técnicas */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Especificações Técnicas</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Construtor</Text>
                        <Text style={styles.value}>{vessel.builder}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Ano de Construção</Text>
                        <Text style={styles.value}>{vessel.year}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Comprimento (LOA)</Text>
                        <Text style={styles.value}>{vessel.dimensions?.length || 'N/A'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Comprimento de Boca</Text>
                        <Text style={styles.value}>{vessel.dimensions?.beam || 'N/A'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Calado</Text>
                        <Text style={styles.value}>{vessel.dimensions?.draft || 'N/A'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Capacidade de Tripulação</Text>
                        <Text style={styles.value}>{vessel.crewCapacity}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Quantidade de Equipamentos</Text>
                        <Text style={styles.value}>{vessel.equipmentsCount}</Text>
                    </View>
                </View>

                {/* Métricas de Manutenção */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Métricas de Manutenção Ativa</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Ordens de Serviço Abertas</Text>
                        <Text style={styles.value}>{vessel.activeWOs}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Solicitações de Serviço Pendentes</Text>
                        <Text style={styles.value}>{vessel.pendingSRs}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text>Gerado pelo sistema SIGMAN em {currentDate}</Text>
                    <Text render={({ pageNumber, totalPages }) => (
                        `Página ${pageNumber} de ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    );
}