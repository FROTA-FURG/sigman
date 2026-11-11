import { PRIORIDADES } from '../lib/os';

/*
 * Prioridade da OS como matriz de prazos: cada nível mostra em quanto tempo
 * a OS deve ser resolvida. Clicar escolhe (substitui o select).
 */
export default function PriorityMatrix({ value, onChange, disabled = false }) {
    return (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {PRIORIDADES.map((p) => {
                const ativa = value === p.valor;
                return (
                    <button
                        key={p.valor}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(p.valor)}
                        className={`rounded-md px-2 py-1.5 text-left ring-1 ring-inset transition disabled:cursor-not-allowed ${ativa ? `${p.fundo} ring-2` : 'bg-slate-950 ring-slate-700 hover:ring-slate-500'} ${disabled && !ativa ? 'opacity-40' : ''}`}
                    >
                        <span className={`block text-xs font-bold ${ativa ? p.cor : 'text-slate-300'}`}>{p.rot}</span>
                        <span className="block text-[10px] text-slate-500">{p.prazo === 'Sem prazo definido' ? p.prazo : `Resolver em ${p.prazo}`}</span>
                    </button>
                );
            })}
        </div>
    );
}
