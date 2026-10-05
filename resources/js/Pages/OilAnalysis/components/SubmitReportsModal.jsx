import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';

/*
 * Submissão de laudos em lote (só PDF). Os arquivos são guardados no servidor
 * (oil_analysis_reports) como "aguardando leitura": a leitura automática dos
 * PDFs ainda não existe. Abaixo do envio, a lista dos laudos já submetidos.
 */

const STATUS_LAUDO = {
    aguardando_leitura: { rot: 'Aguardando leitura', cls: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
    processado: { rot: 'Processado', cls: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
};

const dataHora = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ehPdf = (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function SubmitReportsModal({ aberto, onClose, embarcacao, laudos = [] }) {
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState(null);
    const [qtdEnviada, setQtdEnviada] = useState(0);
    const [arquivos, setArquivos] = useState([]);
    const [recusados, setRecusados] = useState([]);
    const [arrastando, setArrastando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (aberto) { setArquivos([]); setRecusados([]); setEnviado(false); setErro(null); }
    }, [aberto]);

    useEffect(() => {
        if (!aberto) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [aberto, onClose]);

    if (!aberto) return null;

    const adicionar = (lista) => {
        const todos = Array.from(lista || []);
        const pdfs = todos.filter(ehPdf);
        setRecusados(todos.filter((f) => !ehPdf(f)).map((f) => f.name));
        setArquivos((atual) => {
            const chaves = new Set(atual.map((f) => `${f.name}-${f.size}`));
            return [...atual, ...pdfs.filter((f) => !chaves.has(`${f.name}-${f.size}`))];
        });
        setEnviado(false);
    };

    const enviar = () => {
        setEnviando(true);
        setErro(null);
        router.post(route('oil-analysis.reports.store', embarcacao.tag), { laudos: arquivos }, {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => { setQtdEnviada(arquivos.length); setArquivos([]); setEnviado(true); },
            onError: (e) => setErro(Object.values(e).join(' ') || 'erro desconhecido.'),
            onFinish: () => setEnviando(false),
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b203c] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex shrink-0 items-start justify-between border-b border-slate-800 px-5 py-3">
                    <div>
                        <h3 className="text-base font-bold text-white">Submeter laudos</h3>
                        <p className="text-xs text-slate-400">{embarcacao?.tag} — {embarcacao?.nome} · somente arquivos PDF</p>
                    </div>
                    <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {enviado ? (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                            <p className="font-semibold">{qtdEnviada} laudo{qtdEnviada === 1 ? '' : 's'} recebido{qtdEnviada === 1 ? '' : 's'} e guardado{qtdEnviada === 1 ? '' : 's'}.</p>
                            <p className="mt-1 text-xs text-emerald-200/80">
                                Ficam como "aguardando leitura" até a leitura automática dos laudos existir.
                                Para registrar os resultados agora, use <span className="font-semibold">Nova análise</span> ou <span className="font-semibold">Importar laudo</span> na aba Análises.
                            </p>
                        </div>
                    ) : (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                            onDragLeave={() => setArrastando(false)}
                            onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
                            onClick={() => inputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${arrastando ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900/50'}`}
                        >
                            <svg className="mb-3 h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6h.1a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <p className="text-sm font-semibold text-white">Arraste os laudos aqui ou clique para escolher</p>
                            <p className="mt-1 text-xs text-slate-400">Um ou vários arquivos .pdf</p>
                            <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
                                   onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
                        </div>
                    )}

                    {recusados.length > 0 && (
                        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                            Recusado{recusados.length === 1 ? '' : 's'} (não é PDF): {recusados.join(', ')}
                        </p>
                    )}

                    {arquivos.length > 0 && (
                        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                            {arquivos.map((f) => (
                                <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 px-3 py-2 text-xs">
                                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">PDF</span>
                                    <span className="min-w-0 flex-1 truncate text-slate-200" title={f.name}>{f.name}</span>
                                    <span className="shrink-0 text-slate-500">{tamanho(f.size)}</span>
                                    {!enviado && (
                                        <button onClick={() => setArquivos((l) => l.filter((x) => x !== f))} className="shrink-0 text-slate-500 hover:text-red-400" aria-label={`Remover ${f.name}`}>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {!enviado && (
                        <p className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] leading-relaxed text-blue-200/80">
                            Os laudos ficam guardados no sistema. A leitura automática ainda está em desenvolvimento: até lá eles aparecem como "aguardando leitura".
                        </p>
                    )}

                    {erro && <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">Não foi possível enviar: {erro}</p>}

                    {/* Laudos já submetidos desta embarcação */}
                    <section>
                        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Laudos submetidos ({laudos.length})</h4>
                        {laudos.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-700 px-3 py-2.5 text-xs text-slate-500">Nenhum laudo submetido ainda.</p>
                        ) : (
                            <ul className="max-h-56 divide-y divide-slate-800 overflow-y-auto rounded-lg border border-slate-800">
                                {laudos.map((l) => {
                                    const st = STATUS_LAUDO[l.status] || STATUS_LAUDO.aguardando_leitura;
                                    return (
                                        <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                                            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">PDF</span>
                                            <div className="min-w-0 flex-1">
                                                <a href={l.url} target="_blank" rel="noreferrer" className="block truncate text-slate-200 hover:text-blue-300 hover:underline" title={l.nome}>{l.nome}</a>
                                                <p className="text-[10px] text-slate-500">{dataHora(l.enviadoEm)}{l.enviadoPor ? ` · ${l.enviadoPor}` : ''} · {tamanho(l.tamanho)}</p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${st.cls}`}>{st.rot}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 bg-slate-900/40 px-5 py-3">
                    <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800">
                        {enviado ? 'Fechar' : 'Cancelar'}
                    </button>
                    {!enviado && (
                        <button onClick={enviar} disabled={!arquivos.length || enviando}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                            {enviando ? 'Enviando...' : `Submeter ${arquivos.length > 0 ? `${arquivos.length} laudo${arquivos.length === 1 ? '' : 's'}` : 'laudos'}`}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
