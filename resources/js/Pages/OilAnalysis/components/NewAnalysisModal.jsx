import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import AnalysisForm, { formularioParaAmostra, formularioValido, formularioVazio } from './AnalysisForm';

/*
 * Registro de uma nova análise para o equipamento selecionado.
 *   modo 'manual' -> só o formulário
 *   modo 'pdf'    -> anexa o laudo, mostra o PDF ao lado e o usuário transcreve
 *
 * Grava em oil-analysis.samples.store; o PDF vai junto (multipart) e fica
 * anexado à amostra. A leitura automática do PDF entra quando tivermos os
 * modelos de laudo dos laboratórios; até lá o preenchimento é assistido pelo
 * preview. O nº da amostra é definido pelo servidor.
 */
export default function NewAnalysisModal({ aberto, modo, onClose, onSalvo, equipamento, familia, embarcacao, proximoNumero, ultimaAmostra }) {
    const [enviando, setEnviando] = useState(false);
    const [erros, setErros] = useState({});
    const [form, setForm] = useState(() => formularioVazio(familia, ultimaAmostra));
    const [arquivo, setArquivo] = useState(null);
    const [arquivoUrl, setArquivoUrl] = useState(null);
    const [arrastando, setArrastando] = useState(false);
    const [erroArquivo, setErroArquivo] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (aberto) {
            setForm(formularioVazio(familia, ultimaAmostra));
            setArquivo(null);
            setArquivoUrl(null);
            setErroArquivo('');
            setErros({});
        }
    }, [aberto, equipamento?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!aberto) return;
        const onKey = (e) => e.key === 'Escape' && !enviando && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [aberto, enviando, onClose]);

    if (!aberto || !equipamento) return null;

    const escolherArquivo = (file) => {
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setErroArquivo('Envie o laudo em PDF.');
            return;
        }
        setErroArquivo('');
        setArquivo(file);
        if (arquivoUrl) URL.revokeObjectURL(arquivoUrl);
        setArquivoUrl(URL.createObjectURL(file)); // só pro preview; o arquivo vai pro servidor
    };

    const podeSalvar = formularioValido(form) && (modo === 'manual' || !!arquivo) && !enviando;

    const salvar = () => {
        if (!podeSalvar) return;
        const amostra = formularioParaAmostra(form, familia, equipamento.limites, proximoNumero);
        delete amostra.numero; // o servidor numera
        setEnviando(true);
        router.post(route('oil-analysis.samples.store', equipamento.id), {
            ...amostra,
            ...(arquivo ? { laudo: arquivo } : {}),
        }, {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => { if (arquivoUrl) URL.revokeObjectURL(arquivoUrl); onSalvo(); },
            onError: (e) => setErros(e),
            onFinish: () => setEnviando(false),
        });
    };

    const comPdf = modo === 'pdf';

    // Portal no body: o modal não herda altura/overflow do <main> do layout.
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => !enviando && onClose()}>
            <div
                className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b203c] shadow-2xl ${comPdf ? "h-full max-w-7xl" : "max-w-4xl"}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-start justify-between border-b border-slate-800 px-5 py-3">
                    <div>
                        <h3 className="text-base font-bold text-white">
                            {comPdf ? 'Importar laudo de análise (PDF)' : 'Nova análise — lançamento manual'}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {embarcacao?.tag} · {equipamento.nome} · <span className="font-mono text-slate-300">{equipamento.tag}</span> · Amostra nº {proximoNumero}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className={`min-h-0 flex-1 overflow-y-auto ${comPdf ? 'grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden' : ''}`}>
                    {comPdf && (
                        <div className="flex min-h-[320px] flex-col border-b border-slate-800 p-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                            {!arquivo ? (
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                                    onDragLeave={() => setArrastando(false)}
                                    onDrop={(e) => { e.preventDefault(); setArrastando(false); escolherArquivo(e.dataTransfer.files?.[0]); }}
                                    onClick={() => inputRef.current?.click()}
                                    className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${arrastando ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900/50'}`}
                                >
                                    <svg className="mb-3 h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6h.1a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className="text-sm font-semibold text-white">Arraste o laudo aqui ou clique para escolher</p>
                                    <p className="mt-1 text-xs text-slate-400">Somente PDF</p>
                                    {erroArquivo && <p className="mt-2 text-xs font-semibold text-red-400">{erroArquivo}</p>}
                                    <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
                                </div>
                            ) : (
                                <>
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="truncate text-xs text-slate-300" title={arquivo.name}>
                                            <span className="mr-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">PDF</span>
                                            {arquivo.name} · {(arquivo.size / 1024).toFixed(0)} KB
                                        </span>
                                        <button onClick={() => { setArquivo(null); setArquivoUrl(null); }} className="shrink-0 text-xs text-slate-400 underline hover:text-white">
                                            Trocar arquivo
                                        </button>
                                    </div>
                                    <iframe src={arquivoUrl} title="Laudo" className="min-h-[420px] w-full flex-1 lg:min-h-0 rounded-md border border-slate-800 bg-white" />
                                </>
                            )}
                            <p className="mt-3 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] leading-relaxed text-blue-200/80">
                                Leitura automática do laudo ainda não habilitada — ela será configurada a partir dos modelos de laudo dos laboratórios.
                                Por enquanto, transcreva os valores no formulário ao lado; o PDF fica anexado à amostra.
                            </p>
                        </div>
                    )}

                    <div className={`p-5 ${comPdf ? 'lg:min-h-0 lg:overflow-y-auto' : ''}`}>
                        <AnalysisForm form={form} setForm={setForm} familia={familia} limites={equipamento.limites} compacto={comPdf} />
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/40 px-5 py-3">
                    <p className="text-[11px] text-slate-500">
                        {!podeSalvar && (comPdf && !arquivo ? 'Anexe o PDF do laudo. ' : '')}
                        {!formularioValido(form) && 'Informe a data da coleta e ao menos um resultado.'}
                        {Object.keys(erros).length > 0 && (
                            <span className="block font-semibold text-red-400">Não foi possível salvar: {Object.values(erros).join(' ')}</span>
                        )}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800">Cancelar</button>
                        <button
                            onClick={salvar}
                            disabled={!podeSalvar}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {enviando ? 'Salvando...' : 'Registrar análise'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
