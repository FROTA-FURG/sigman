import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Imagens já usadas numa região (hull_region_images): quem e quando enviou,
 * último ajuste de posição, se está em uso ou quando saiu de uso. O olho
 * abre a pré-visualização; uma antiga pode voltar a ser usada.
 */

const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function IconeOlho() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function Previa({ item, podeMapear, onFechar, onReutilizar }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onFechar();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onFechar]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={onFechar}>
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b203c] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-5 py-3">
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-white">{item.nome}</h3>
                        <p className="text-xs text-slate-400">Enviada por {item.enviadaPor || '—'} em {dataHora(item.enviadaEm)} · {item.larguraPx}×{item.alturaPx} px</p>
                    </div>
                    <button onClick={onFechar} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-slate-950 p-4">
                    <img src={item.url} alt={item.nome} className="mx-auto max-h-[70vh] w-auto rounded bg-white object-contain" />
                </div>
                {!item.emUso && podeMapear && (
                    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 px-5 py-3">
                        <button type="button" onClick={() => { onReutilizar(item); onFechar(); }}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                            Usar esta imagem novamente
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

export default function ImageHistory({ regiao, podeMapear, onReutilizar }) {
    const [previa, setPrevia] = useState(null);
    const historico = regiao.historico ?? [];

    return (
        <section className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-white">Imagens usadas · {regiao.nome}</h4>
                <span className="text-[11px] text-slate-500">
                    {regiao.atualizadaEm
                        ? <>Última atualização da imagem: <span className="text-slate-300">{regiao.atualizadaPor || '—'}</span> em <span className="text-slate-300">{dataHora(regiao.atualizadaEm)}</span></>
                        : 'Nenhuma imagem enviada ainda'}
                </span>
            </div>

            {historico.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700 px-4 py-5 text-center text-xs text-slate-500">
                    Suba a primeira imagem desta região no modo <span className="font-semibold text-slate-300">Imagem</span>.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg ring-1 ring-slate-800">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/70 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="w-10 px-3 py-2"><span className="sr-only">Ver</span></th>
                                <th className="px-3 py-2">Imagem</th>
                                <th className="px-3 py-2">Enviada por</th>
                                <th className="px-3 py-2">Enviada em</th>
                                <th className="px-3 py-2">Último ajuste</th>
                                <th className="px-3 py-2">Situação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {historico.map((item) => (
                                <tr key={item.id} className={item.emUso ? 'bg-blue-500/5' : ''}>
                                    <td className="px-3 py-2">
                                        <button type="button" onClick={() => setPrevia(item)} className="rounded p-1 text-slate-400 transition hover:bg-slate-700 hover:text-white" title="Pré-visualizar">
                                            <IconeOlho />
                                        </button>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2.5">
                                            <img src={item.url} alt="" loading="lazy" className="h-9 w-16 shrink-0 rounded bg-white object-contain ring-1 ring-slate-700" />
                                            <span className="max-w-[16rem] truncate text-slate-200" title={item.nome}>{item.nome}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">{item.enviadaPor || '—'}</td>
                                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{dataHora(item.enviadaEm)}</td>
                                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{item.posicionadaEm ? <>{item.posicionadaPor || '—'} · {dataHora(item.posicionadaEm)}</> : '—'}</td>
                                    <td className="whitespace-nowrap px-3 py-2">
                                        {item.emUso ? (
                                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">Em uso</span>
                                        ) : (
                                            <span className="text-slate-500">{item.removidaPor ? `Removida por ${item.removidaPor}` : 'Substituída'} em {dataHora(item.substituidaEm)}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {previa && <Previa item={previa} podeMapear={podeMapear} onFechar={() => setPrevia(null)} onReutilizar={onReutilizar} />}
        </section>
    );
}
