import { condicaoDaAmostra, ordenarAmostras } from './classificacao';

/*
 * Os dados da Análise de Óleo vêm do servidor (OilAnalysisController), já no
 * formato da tela: pontos de coleta com as amostras, plano vigente e
 * histórico. Aqui só se deriva o que é cálculo de apresentação.
 */

/** Identifica uma amostra (id do banco). */
export const chaveDaAmostra = (a) => a.id;

/** Pontos de coleta com amostras em ordem cronológica, a última e a condição atual. */
export function montarEquipamentos(pontos = [], familias = {}) {
    return pontos.map((p) => {
        const familia = familias[p.familia];
        const amostras = ordenarAmostras(p.amostras || []);
        const ultima = amostras[amostras.length - 1] || null;
        return {
            ...p,
            amostras,
            ultima,
            condicaoAtual: ultima ? condicaoDaAmostra(ultima, familia, p.limites) : null,
        };
    });
}
