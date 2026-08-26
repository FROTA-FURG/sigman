import { useState, useEffect } from 'react';

const isoParaExibicao = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
};

/**
 * Input de data no formato dd/mm/aaaa, sempre -- o <input type="date">
 * nativo exibe no formato do idioma/SO do navegador (vira mm/dd/aaaa em
 * navegador configurado em inglês, mesmo pra usuário no Brasil). O valor
 * exposto ao formulário continua yyyy-mm-dd, o mesmo contrato do input
 * nativo, então dá pra trocar um pelo outro sem mexer em mais nada.
 */
export default function BrDateInput({ value, onChange, disabled, className = '', ...props }) {
    const [texto, setTexto] = useState(isoParaExibicao(value));

    useEffect(() => {
        setTexto(isoParaExibicao(value));
    }, [value]);

    const handleChange = (e) => {
        const digitos = e.target.value.replace(/\D/g, '').slice(0, 8);

        let mascarado = digitos;
        if (digitos.length > 4) mascarado = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
        else if (digitos.length > 2) mascarado = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
        setTexto(mascarado);

        if (digitos.length === 8) {
            const dia = digitos.slice(0, 2);
            const mes = digitos.slice(2, 4);
            const ano = digitos.slice(4, 8);
            onChange(`${ano}-${mes}-${dia}`);
        } else if (digitos.length === 0) {
            onChange('');
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            value={texto}
            onChange={handleChange}
            disabled={disabled}
            className={className}
            {...props}
        />
    );
}
