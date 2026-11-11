import React from 'react';
import { Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { getISOWeek } from '@/utils/weeks';

/*
 * Peças comuns dos relatórios em PDF de OS (Andamento e Planejamento):
 * cabeçalho FURG, cartões de resumo, faixa de seção + cabeçalho da tabela,
 * célula e rodapé com paginação. Cada relatório define as colunas.
 */

export const COR = {
    vermelho: '#b91c1c',
    laranja: '#c2410c',
    verde: '#15803d',
    azul: '#1e3a8a',
    ambar: '#a16207',
    texto: '#0f172a',
    suave: '#475569',
    cinza: '#64748b',
};

export const estilos = StyleSheet.create({
    page: { padding: 24, paddingBottom: 36, fontFamily: 'Helvetica', fontSize: 8, color: '#000' },
    headerTable: { flexDirection: 'row', borderWidth: 1, borderColor: '#000', marginBottom: 10 },
    headerLogoCell: { width: '18%', padding: 5, borderRightWidth: 1, borderRightColor: '#000', alignItems: 'center', justifyContent: 'center' },
    headerTitleCell: { width: '82%', padding: 5, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 60, height: 'auto', objectFit: 'contain' },
    titleMain: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    titleSub: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 3 },
    titlePeriodo: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 3, color: '#1e293b' },
    titleNota: { fontSize: 7.5, textAlign: 'center', marginTop: 2, color: COR.suave },

    resumo: { flexDirection: 'row', marginBottom: 8, gap: 6 },
    resumoCard: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 3, padding: 5, alignItems: 'center' },
    resumoValor: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
    resumoDetalhe: { fontSize: 6.5, color: COR.cinza, marginTop: 1 },
    resumoRotulo: { fontSize: 6.5, color: COR.suave, marginTop: 1, textTransform: 'uppercase', textAlign: 'center' },

    secao: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 6, marginTop: 6, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#000', borderTopWidth: 0, fontFamily: 'Helvetica-Bold' },
    table: { width: '100%', borderWidth: 1, borderColor: '#000', borderTopWidth: 0 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#94a3b8', minHeight: 18, alignItems: 'stretch' },
    cell: { padding: 3, borderRightWidth: 1, borderRightColor: '#94a3b8', justifyContent: 'center' },
    pequeno: { fontSize: 6.5, color: COR.cinza },
    negrito: { fontFamily: 'Helvetica-Bold' },
    rodape: { position: 'absolute', bottom: 14, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: COR.cinza },
});

// ---- datas ---------------------------------------------------------------

/** "2026-11-10T..." -> Date local ao meio-dia (sem o fuso empurrar o dia). */
export const dataLocal = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.substring(0, 10).split('-');
    return new Date(y, m - 1, d, 12, 0, 0);
};
export const ddmm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
export const ddmmaaaa = (d) => (d ? `${ddmm(d)}/${d.getFullYear()}` : '-');

/** "SEM 46-49 · 09/11/2026 A 06/12/2026" */
export const rotuloPeriodo = (inicio, fim) => {
    if (!inicio || !fim) return null;
    const a = getISOWeek(inicio);
    const b = getISOWeek(fim);
    return `SEM ${a}${a !== b ? `-${b}` : ''} · ${ddmmaaaa(inicio)} A ${ddmmaaaa(fim)}`;
};

export const hoje = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

/** 4.5 -> "4,5" */
export const num = (v, casas = 1) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });

// ---- peças ---------------------------------------------------------------

export function Cabecalho({ subtitulo, periodo, notas = [] }) {
    return (
        <View style={estilos.headerTable}>
            <View style={estilos.headerLogoCell}>
                <Image style={estilos.logo} src={`${window.location.origin}/LogoFROTA.png`} />
            </View>
            <View style={estilos.headerTitleCell}>
                <Text style={estilos.titleMain}>UNIVERSIDADE FEDERAL DO RIO GRANDE - FURG</Text>
                <Text style={estilos.titleSub}>{subtitulo}</Text>
                {periodo && <Text style={estilos.titlePeriodo}>{periodo}</Text>}
                {notas.filter(Boolean).map(n => <Text key={n} style={estilos.titleNota}>{n}</Text>)}
                <Text style={estilos.titleNota}>Emitido em: {new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
        </View>
    );
}

/** itens: [{ rot, valor, detalhe?, cor?, alerta? }] -- alerta pinta a borda. */
export function Resumo({ itens }) {
    return (
        <View style={estilos.resumo}>
            {itens.filter(Boolean).map(r => (
                <View key={r.rot} style={[estilos.resumoCard, r.alerta && { borderColor: r.alerta, borderWidth: 1.5 }]}>
                    <Text style={[estilos.resumoValor, { color: r.cor || COR.texto }]}>{r.valor}</Text>
                    {r.detalhe ? <Text style={estilos.resumoDetalhe}>{r.detalhe}</Text> : null}
                    <Text style={estilos.resumoRotulo}>{r.rot}</Text>
                </View>
            ))}
        </View>
    );
}

/**
 * Faixa colorida da seção + cabeçalho da tabela; as linhas vêm como children.
 * Faixa, cabeçalho e a 1ª linha andam juntos (wrap={false}), para o título
 * nunca ficar sozinho no pé da página.
 */
export function Secao({ titulo, cor, quantidade, colunas, children }) {
    if (!quantidade) return null;
    const [primeira, ...resto] = React.Children.toArray(children);
    return (
        <View>
            <View wrap={false}>
                <View style={[estilos.secao, { backgroundColor: cor }]}>
                    <Text>{titulo}</Text>
                    <Text>{quantidade} OS</Text>
                </View>
                <View style={estilos.tableHeader}>
                    {colunas.map(([rot, largura], i) => (
                        <Text key={rot} style={[estilos.cell, { width: largura }, i === colunas.length - 1 && { borderRightWidth: 0 }]}>{rot}</Text>
                    ))}
                </View>
                <View style={[estilos.table, resto.length > 0 && { borderBottomWidth: 0 }]}>{primeira}</View>
            </View>
            {resto.length > 0 && <View style={estilos.table}>{resto}</View>}
        </View>
    );
}

export function Celula({ largura, ultima, children, style }) {
    return <View style={[estilos.cell, { width: largura }, ultima && { borderRightWidth: 0 }, style]}>{children}</View>;
}

export function Rodape({ texto }) {
    return (
        <View style={estilos.rodape} fixed>
            <Text>SIGMAN · {texto}</Text>
            <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
    );
}
