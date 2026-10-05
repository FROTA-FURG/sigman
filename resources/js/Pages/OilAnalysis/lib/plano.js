import { diasEntre } from './classificacao';

/*
 * Situação de cada item do Plano de Ação.
 *
 * Última coleta = a mais recente entre a do plano e a da última amostra (a
 * coluna do plano costuma estar defasada). Com frequência em meses, a próxima
 * coleta sai dela; com frequência em horas fica pelo horímetro, que a gente
 * não tem ao vivo.
 */

export function somarMeses(iso, meses) {
    const [a, m, d] = iso.split('-').map(Number);
    const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
    const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(d, ultimoDia));
    return alvo.toISOString().slice(0, 10);
}

export function montarLinhaPlano(item, equipamento, hoje) {
    const ultimaAmostra = equipamento?.ultima?.dataColeta || null;
    const ultimaColeta = [item.dataColeta, ultimaAmostra].filter(Boolean).sort().pop() || null;
    const atualizadaPelaAmostra = !!ultimaAmostra && ultimaAmostra === ultimaColeta && ultimaAmostra !== item.dataColeta;

    let proxima = item.dataProximaColeta;
    if (item.frequenciaMeses && ultimaColeta) proxima = somarMeses(ultimaColeta, item.frequenciaMeses);

    let situacao = 'semData';
    let dias = null;
    if (proxima) {
        dias = diasEntre(hoje, proxima);
        situacao = dias < 0 ? 'vencida' : dias <= 30 ? 'proxima' : 'emDia';
    } else if (item.frequenciaHoras) {
        situacao = 'horas';
    }

    return {
        ...item,
        ultimaColeta,
        atualizadaPelaAmostra,
        proxima,
        dias,
        situacao,
        condicaoAtual: equipamento?.condicaoAtual || item.condicao || null,
        parecerLaboratorio: item.parecerLaboratorio || equipamento?.ultima?.parecerLaboratorio || null,
        temAnalise: !!equipamento,
    };
}

export function contarCondicoes(equipamentos) {
    const c = { Normal: 0, 'Atenção': 0, Intervir: 0, sem: 0 };
    equipamentos.forEach((e) => { if (e.condicaoAtual) c[e.condicaoAtual] += 1; else c.sem += 1; });
    return c;
}
