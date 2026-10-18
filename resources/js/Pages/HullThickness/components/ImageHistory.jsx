import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ultimaAtualizacaoImagem } from '../lib/contornos';

/*
 * Imagens já usadas numa região (futura tabela hull_region_images): quem e
 * quando enviou, último ajuste de posição, se está em uso ou quando foi
 * substituída. O olho abre a pré-visualização; uma antiga pode voltar a
 * ser usada. A última linha é sempre o desenho original do sistema.
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

/** Miniatura/visualização: imagem enviada, ou o desenho original recortado na região. */
function Visual({ item, desenho, regiao, className }) {
    if (item.original) {
        const [x1, y1, x2, y2] = desenho.regioes[regiao].caixa;
        return (
            <svg viewBox={`${x1} ${y1} ${x2 - x1} ${y2 - y1}`} className={`bg-white ${className}`}>
                <image href={desenho.imagem} x="0" y="0" width={desenho.largura} height={desenho.altura} />
            </svg>
        );
    }
    if (!item.srcVisivel) {
        return <div className={`flex items-center justify-center bg-slate-800 text-[10px] text-slate-500 ${className}`}>sem arquivo</div>;
    }
    return <img src={item.srcVisivel} alt={item.nome} className={`bg-white object-contain ${className}`} />;
}

function Previa({ item, desenho, regiao, onFechar, onReutilizar }) {
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
                        <p className="text-xs text-slate-400">
                            {item.original ? 'Desenho original do sistema' : `Enviada por ${item.enviadaPor || '—'} em ${dataHora(item.enviadaEm)}`}
                            {item.larguraPx ? ` · ${item.larguraPx}×${item.alturaPx} px` : ''}
                        </p>
                    </div>
                    <button onClick={onFechar} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-slate-950 p-4">
                    <Visual item={item} desenho={desenho} regiao={regiao} className="mx-auto max-h-[70vh] w-full rounded" />
                </div>
                {!item.emUso && (item.srcVisivel || item.original) && (
                    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 px-5 py-3">
                        <button type="button" onClick={() => { onReutilizar(item); onFechar(); }}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                            {item.original ? 'Voltar ao desenho original' : 'Usar esta imagem novamente'}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

export default function ImageHistory({ desenho, regiao, historico = [], imagemAtual, onReutilizar }) {
    const [previa, setPrevia] = useState(null);
    const ultima = ultimaAtualizacaoImagem(historico);

    const itens = [
        ...historico.map((h) => {
            const emUso = imagemAtual?.id === h.id;
            return { ...h, emUso, srcVisivel: emUso ? imagemAtual.src : h.src };
        }),
        { id: 'original', original: true, nome: 'Desenho original', emUso: !imagemAtual },
    ];

    return (
        <section className="rounded-xl border border-slate-800 bg-[#0b203c]/90 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-white">Imagens usadas · {desenho.regioes[regiao].nome}</h4>
                <span className="text-[11px] text-slate-500">
                    {ultima
                        ? <>Última atualização: <span className="text-slate-300">{ultima.quem || '—'}</span> {ultima.oque} em <span className="text-slate-300">{dataHora(ultima.quando)}</span></>
                        : 'Usando o desenho original — nenhuma imagem enviada ainda'}
                </span>
            </div>

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
                        {itens.map((item) => (
                            <tr key={item.id} className={item.emUso ? 'bg-blue-500/5' : ''}>
                                <td className="px-3 py-2">
                                    <button type="button" onClick={() => setPrevia(item)} disabled={!item.original && !item.srcVisivel}
                                            className="rounded p-1 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                            title={item.original || item.srcVisivel ? 'Pré-visualizar' : 'O arquivo desta imagem foi descartado do navegador por falta de espaço'}>
                                        <IconeOlho />
                                    </button>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2.5">
                                        <Visual item={item} desenho={desenho} regiao={regiao} className="h-9 w-16 shrink-0 rounded ring-1 ring-slate-700" />
                                        <span className="max-w-[16rem] truncate text-slate-200" title={item.nome}>{item.nome}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2">{item.original ? 'Sistema' : item.enviadaPor || '—'}</td>
                                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{item.original ? '—' : dataHora(item.enviadaEm)}</td>
                                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{item.posicionadaEm ? <>{item.posicionadaPor || '—'} · {dataHora(item.posicionadaEm)}</> : '—'}</td>
                                <td className="whitespace-nowrap px-3 py-2">
                                    {item.emUso ? (
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">Em uso</span>
                                    ) : item.original ? (
                                        <span className="text-slate-500">Disponível</span>
                                    ) : (
                                        <span className="text-slate-500">
                                            {item.removidaPor ? `Removida por ${item.removidaPor}` : 'Substituída'} em {dataHora(item.substituidaEm)}
                                            {item.arquivoDescartado && <span className="ml-1 text-amber-400/80">(arquivo descartado)</span>}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {previa && <Previa item={previa} desenho={desenho} regiao={regiao} onFechar={() => setPrevia(null)} onReutilizar={onReutilizar} />}
        </section>
    );
}
