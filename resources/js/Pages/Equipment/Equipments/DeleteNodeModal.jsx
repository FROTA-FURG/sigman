import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';

export default function DeleteNodeModal({ isOpen, onClose, nodeData }) {
    const [mounted, setMounted] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted || !nodeData) return null;

    const handleDelete = () => {
        setIsDeleting(true);
        // Dispara a requisição DELETE para o backend
        router.delete(route('equipments.destroy', nodeData.id), {
            onSuccess: () => {
                setIsDeleting(false);
                onClose();
            },
            onError: () => {
                setIsDeleting(false);
            }
        });
    };

    return createPortal(
        <>
            <style>{`
                @keyframes overlayFade { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
                @keyframes modalBounce { 
                    0% { opacity: 0; transform: scale(0.9); } 
                    50% { transform: scale(1.02); }
                    100% { opacity: 1; transform: scale(1); } 
                }
                .animate-overlay { animation: overlayFade 0.3s ease-out forwards; }
                .animate-modal-bounce { animation: modalBounce 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md animate-overlay p-4">
                <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700 animate-modal-bounce text-center p-6">
                    
                    {/* Ícone de Alerta */}
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-8 ring-red-500/5">
                        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">Excluir Item?</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Você tem certeza que deseja excluir o item <strong className="text-slate-200">{nodeData.name}</strong>? 
                        Essa ação é permanente e <strong className="text-red-400">removerá todos os sub-itens</strong> que dependem dele.
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row justify-center">
                        <button 
                            onClick={onClose} 
                            disabled={isDeleting}
                            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 flex justify-center items-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 ring-1 ring-inset ring-red-500 disabled:opacity-50"
                        >
                            {isDeleting ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                "Sim, excluir agora"
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </>,
        document.body
    );
}