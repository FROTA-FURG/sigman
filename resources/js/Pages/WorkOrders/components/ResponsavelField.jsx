import { useState } from 'react';

/*
 * Responsável pela atividade: um usuário do sistema ou, para quem não tem
 * conta (técnico do fabricante, prestador avulso...), só o nome digitado.
 * Trabalha sobre os dois campos do backend: responsible_user_id e
 * responsible_name -- preenche um e zera o outro.
 */
const OUTRA = '__outra__';

export default function ResponsavelField({ userId, nome, onChange, users = [], className = '', erro }) {
    const [digitando, setDigitando] = useState(Boolean(nome));

    if (digitando) {
        return (
            <div>
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        autoFocus
                        maxLength={120}
                        value={nome || ''}
                        onChange={(e) => onChange({ responsible_user_id: '', responsible_name: e.target.value })}
                        placeholder="Nome de quem executou"
                        className={className}
                    />
                    <button
                        type="button"
                        onClick={() => { setDigitando(false); onChange({ responsible_user_id: '', responsible_name: '' }); }}
                        title="Voltar para a lista de usuários do sistema"
                        className="shrink-0 rounded-md border border-slate-700 px-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                    </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Pessoa fora do sistema · <button type="button" className="text-blue-400 hover:underline" onClick={() => { setDigitando(false); onChange({ responsible_user_id: '', responsible_name: '' }); }}>escolher da lista</button></p>
                {erro && <span className="text-xs text-red-500">{erro}</span>}
            </div>
        );
    }

    return (
        <div>
            <select
                value={userId || ''}
                onChange={(e) => {
                    if (e.target.value === OUTRA) { setDigitando(true); onChange({ responsible_user_id: '', responsible_name: '' }); }
                    else onChange({ responsible_user_id: e.target.value, responsible_name: '' });
                }}
                className={className}
            >
                {/* Já vem com quem está lançando; o vazio só aparece se nada foi escolhido. */}
                {!userId && <option value="" disabled>Selecione o responsável...</option>}
                {users.map((u) => <option key={u.id} value={u.id}>{u.nickname || u.username}</option>)}
                <option value={OUTRA}>+ Outra pessoa (digitar nome)</option>
            </select>
            {erro && <span className="text-xs text-red-500">{erro}</span>}
        </div>
    );
}
