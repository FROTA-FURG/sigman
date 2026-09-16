import { useState, useEffect } from 'react';

// Diferente do BrDateInput (que é só uma data-alvo, sempre meia-noite),
// aqui a hora importa de verdade -- é um instante real (quando a
// atividade começou/terminou). O app roda em UTC (config('app.timezone')),
// então precisa converter pra/da hora local de quem está digitando, senão
// "15:00" digitado vira "15:00 UTC" gravado, que reexibido em Brasília
// (UTC-3) aparece como 12:00. `value`/`onChange` carregam um ISO UTC de
// verdade (o mesmo formato que o Carbon manda pro front); só o texto
// mostrado no campo é que é local.
const isoParaExibicao = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Igual ao BrDateInput, mas com hora: dd/mm/aaaa hh:mm. O <input
 * type="datetime-local"> nativo também sofre do mesmo problema de formato
 * ligado ao idioma do navegador. Valor exposto ao formulário é um ISO UTC
 * (ex.: "2026-09-15T18:00:00.000Z"), o mesmo que vem/vai pro backend --
 * a hora exibida no campo de texto é sempre a hora local de quem está
 * vendo a tela.
 */
export default function BrDateTimeInput({ value, onChange, disabled, className = '', ...props }) {
    const [texto, setTexto] = useState(isoParaExibicao(value));

    useEffect(() => {
        setTexto(isoParaExibicao(value));
    }, [value]);

    const handleChange = (e) => {
        const digitos = e.target.value.replace(/\D/g, '').slice(0, 12);

        let mascarado = digitos;
        if (digitos.length > 8) {
            const hora = digitos.slice(8, 10);
            const minuto = digitos.slice(10, 12);
            mascarado = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4, 8)} ${hora}${minuto ? ':' + minuto : ''}`;
        } else if (digitos.length > 4) {
            mascarado = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
        } else if (digitos.length > 2) {
            mascarado = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
        }
        setTexto(mascarado);

        if (digitos.length === 12) {
            const dia = parseInt(digitos.slice(0, 2), 10);
            const mes = parseInt(digitos.slice(2, 4), 10);
            const ano = parseInt(digitos.slice(4, 8), 10);
            const hora = parseInt(digitos.slice(8, 10), 10);
            const minuto = parseInt(digitos.slice(10, 12), 10);
            // new Date(ano, mes-1, dia, ...) monta o instante na hora
            // LOCAL do navegador -- toISOString() converte pra UTC certo.
            const d = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
            if (!Number.isNaN(d.getTime())) {
                onChange(d.toISOString());
            }
        } else if (digitos.length === 0) {
            onChange('');
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa hh:mm"
            maxLength={16}
            value={texto}
            onChange={handleChange}
            disabled={disabled}
            className={className}
            {...props}
        />
    );
}
