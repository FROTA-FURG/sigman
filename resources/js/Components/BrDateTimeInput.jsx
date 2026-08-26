import { useState, useEffect } from 'react';

const isoParaExibicao = (value) => {
    if (!value) return '';
    const [dataParte, horaParte] = value.split('T');
    const [y, m, d] = (dataParte || '').split('-');
    if (!y || !m || !d) return '';
    let texto = `${d}/${m}/${y}`;
    if (horaParte) texto += ` ${horaParte.slice(0, 5)}`;
    return texto;
};

/**
 * Igual ao BrDateInput, mas com hora: dd/mm/aaaa hh:mm. O <input
 * type="datetime-local"> nativo também sofre do mesmo problema de formato
 * ligado ao idioma do navegador. Valor exposto ao formulário continua
 * yyyy-mm-ddTHH:mm, o mesmo contrato do input nativo.
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
            const dia = digitos.slice(0, 2);
            const mes = digitos.slice(2, 4);
            const ano = digitos.slice(4, 8);
            const hora = digitos.slice(8, 10);
            const minuto = digitos.slice(10, 12);
            onChange(`${ano}-${mes}-${dia}T${hora}:${minuto}`);
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
