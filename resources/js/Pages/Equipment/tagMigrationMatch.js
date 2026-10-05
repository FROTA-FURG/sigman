/*
 * Sugestão de vínculo entre equipamento já cadastrado e linha do manifesto
 * da nova árvore (tag novo).
 *
 * Só olhar o tag antigo não basta: no manifesto do CM1 ele vem vazio em todas
 * as linhas, e no AS em boa parte. Então a nota junta:
 *  - tag antigo do manifesto igual ao tag do cadastro (ou só o sufixo, ex.
 *    "COM02" ~ "AS01-SMP-COM02");
 *  - semelhança do nome (palavras em comum, sem acento/pontuação).
 *
 * A sugestão só vale quando é recíproca: o equipamento escolhe a linha E a
 * linha escolhe o equipamento. Ex.: as 4 unidades hidráulicas do AS apontam
 * todas pra mesma linha "Unidade Hidráulica" -- nenhuma vira sugestão, fica
 * pra decisão manual.
 */

const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o', 'com', 'para', 'em']);

const sem = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function palavras(texto) {
    return new Set(sem(texto).split(/[^a-z0-9/]+/).filter((t) => t.length > 1 && !STOP.has(t)));
}

const nomeNormalizado = (t) => [...palavras(t)].sort().join(' ');

function nota(equipamento, linha) {
    let n = 0;
    let motivo = null;

    const ta = (linha.tag_antigo || '').toUpperCase().trim();
    const tag = (equipamento.tag_number || '').toUpperCase();
    if (ta && ta === tag) { n += 3; motivo = 'tag antigo igual'; }
    else if (ta && ta.length >= 4 && tag.endsWith(ta)) { n += 1.5; motivo = 'tag antigo parecido'; }

    const a = palavras(equipamento.name);
    const b = palavras(linha.equipamento);
    if (a.size && b.size) {
        const comuns = [...a].filter((t) => b.has(t)).length;
        const uniao = new Set([...a, ...b]).size;
        n += comuns / uniao; // Jaccard: 1 = mesmas palavras
        if (nomeNormalizado(equipamento.name) === nomeNormalizado(linha.equipamento)) {
            n += 1;
            motivo = motivo || 'nome idêntico';
        } else if (!motivo && comuns / uniao >= 0.5) {
            motivo = 'nome parecido';
        }
    }
    return { n, motivo };
}

export const CONFIANCA = {
    alta: { rot: 'Sugestão forte', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40' },
    media: { rot: 'Sugestão — confira', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/40' },
};

/**
 * Pareia equipamentos (ainda não migrados) com linhas pendentes.
 * Retorna:
 *   porEquipamento: { [equipment_id]: { linha, confianca, motivo } }
 *   porLinha:       { [tag_novo]:     { equipamento, confianca, motivo } }
 *   melhorLinha:    { [equipment_id]: linha }  -- melhor palpite mesmo sem reciprocidade
 */
export function sugerirVinculos(candidatos, pendentes) {
    const melhorDoEquip = {};
    const melhorDaLinha = {};

    for (const e of candidatos) {
        for (const l of pendentes) {
            const { n, motivo } = nota(e, l);
            if (n <= 0) continue;
            if (!melhorDoEquip[e.id] || n > melhorDoEquip[e.id].n) melhorDoEquip[e.id] = { n, linha: l, motivo };
            if (!melhorDaLinha[l.tag_novo] || n > melhorDaLinha[l.tag_novo].n) melhorDaLinha[l.tag_novo] = { n, equipamento: e, motivo };
        }
    }

    const porEquipamento = {};
    const porLinha = {};
    const melhorLinha = {};
    for (const e of candidatos) {
        const m = melhorDoEquip[e.id];
        if (!m) continue;
        melhorLinha[e.id] = m.linha;
        const reciproco = melhorDaLinha[m.linha.tag_novo]?.equipamento.id === e.id;
        if (!reciproco || m.n < 0.5) continue;
        const confianca = m.n >= 1.5 ? 'alta' : 'media';
        porEquipamento[e.id] = { linha: m.linha, confianca, motivo: m.motivo };
        porLinha[m.linha.tag_novo] = { equipamento: e, confianca, motivo: m.motivo };
    }
    return { porEquipamento, porLinha, melhorLinha };
}
