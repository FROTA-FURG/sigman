/* Autoria de uma etapa do plano de cruzeiro (created_by / updated_by). */

const dataHora = (s) => (s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/** "Criada por Ana em 05/10/2026 14:30" + "Atualizada por ..." (só se alguém editou depois). */
export function autoria(e) {
    const linhas = [`Criada por ${e.createdBy || 'usuário removido'} em ${dataHora(e.createdAt)}`];
    if (e.updatedAt && e.updatedAt !== e.createdAt) {
        linhas.push(`Atualizada por ${e.updatedBy || 'usuário removido'} em ${dataHora(e.updatedAt)}`);
    }
    return linhas;
}
