/**
 * Utilitários de semana usados pelo Plano de 52 Semanas.
 *
 * O plano de manutenção da frota é organizado por semana do ano (semana 32,
 * semana 33...), seguindo a ISO 8601: a semana começa na segunda-feira e a
 * semana 1 é a que contém a primeira quinta-feira do ano. É a mesma
 * convenção usada nas planilhas de origem ("PLANO DE MANUTENÇÃO PREVENTIVA
 * - 52 SEMANAS (ISO 8601)").
 */

export const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

export const getSunday = (monday) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + 6);
    date.setHours(23, 59, 59, 999);
    return date;
};

/** Número da semana ISO 8601 (1 a 53). */
export const getISOWeek = (date) => {
    // Normaliza em UTC pra fuso horário não empurrar o dia pra semana vizinha.
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Na ISO 8601 é a quinta-feira da semana que define a qual ano ela pertence.
    const dayNum = d.getUTCDay() || 7; // segunda = 1 ... domingo = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

export const formatBr = (date) => {
    if (!date) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
};

/**
 * Rótulo curto do intervalo selecionado, sempre citando a(s) semana(s):
 *   uma semana  -> "SEM 32 · 04/08 à 10/08"
 *   várias      -> "SEM 32-35 · 04/08 à 31/08"
 */
export const formatWeekRange = (start, end) => {
    if (!start || !end) return 'Todas as Datas';

    const startWeek = getISOWeek(start);
    const endWeek = getISOWeek(end);
    const label = startWeek === endWeek ? `SEM ${startWeek}` : `SEM ${startWeek}-${endWeek}`;

    return `${label} · ${formatBr(start)} à ${formatBr(end)}`;
};
