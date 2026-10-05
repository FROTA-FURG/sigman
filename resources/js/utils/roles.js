/**
 * Identificação de cargo no frontend.
 *
 * O backend manda o cargo como string (ver tabela `roles`): dev, coordinator,
 * engineer, technician, intern, seaman, terceiro. As telas faziam essa
 * checagem cada uma por conta própria, comparando por pedaço de texto
 * ('ti', 'admin', 'developer') -- e nenhuma dessas casa com 'dev', que é o
 * cargo real do TI. Resultado: o dev ficava sem permissão de editar OS na
 * interface, mesmo o servidor liberando. Centralizado aqui pra a regra não
 * divergir de novo entre as telas.
 *
 * Lembrando que isto é só interface: a trava que vale continua no servidor
 * (WorkOrderController::canChangeStatus e afins).
 */

export const nomeDoCargo = (user) =>
    String(user?.role?.name || user?.role || '').toLowerCase();

/** Dev/TI enxerga e edita qualquer OS, de qualquer embarcação. */
export const ehDevOuTI = (user) => {
    const cargo = nomeDoCargo(user);
    return cargo === 'dev'
        || cargo === 'ti'
        || cargo.includes('developer')
        || cargo.includes('desenvolvedor')
        || cargo.includes('admin');
};

export const ehEngenheiro = (user) => {
    const cargo = nomeDoCargo(user);
    return cargo.includes('engineer') || cargo.includes('engenheir');
};

export const ehEstagiario = (user) => {
    const cargo = nomeDoCargo(user);
    return cargo.includes('intern') || cargo.includes('estagiari');
};

export const ehCoordenador = (user) => {
    const cargo = nomeDoCargo(user);
    return cargo.includes('coordinator') || cargo.includes('coordenador');
};
