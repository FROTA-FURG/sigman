import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// Quanto tempo o sino fica balançando ao chegar uma notificação nova
const SHAKE_DURATION_MS = 5000;

// De quanto em quanto tempo o front pergunta ao back se chegou notificação nova
const POLL_INTERVAL_MS = 30000;

// Sino de notificações do perfil. Mostra as OS disparadas para o usuário logado.
export default function NotificationBell() {
    const { notifications } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const containerRef = useRef(null);

    // Guarda a última notificação já vista, para saber se a que chegou é realmente nova
    const lastSeenIdRef = useRef(null);
    const shakeTimeoutRef = useRef(null);

    const items = notifications?.items ?? [];
    const unreadCount = notifications?.unread_count ?? 0;
    const newestId = items[0]?.id ?? null;

    // Busca notificações novas de tempos em tempos, sem recarregar a página inteira
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['notifications'] });
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    // Chegou notificação nova? Balança o sino por 5 segundos.
    useEffect(() => {
        const isFirstRender = lastSeenIdRef.current === null;
        const hasNewNotification = newestId !== null && newestId !== lastSeenIdRef.current;

        lastSeenIdRef.current = newestId;

        // No primeiro carregamento da página o sino não balança:
        // só balança quando a notificação chega com o usuário já na tela.
        if (isFirstRender || !hasNewNotification) return;

        setIsShaking(true);
        clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => setIsShaking(false), SHAKE_DURATION_MS);
    }, [newestId]);

    // Limpa o timer se o componente sair da tela no meio do balanço
    useEffect(() => () => clearTimeout(shakeTimeoutRef.current), []);

    // Fecha o painel ao clicar fora dele
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!notifications) return null;

    // Abre a OS da notificação na tela dedicada (não no painel de métricas)
    const openWorkOrder = (notification) => {
        if (!notification.read_at) {
            router.post(route('notifications.read', notification.id), {}, { preserveScroll: true });
        }
        setIsOpen(false);
        router.visit(route('work-orders.show', notification.data.work_order_id));
    };

    const markAllAsRead = () => {
        router.post(route('notifications.read-all'), {}, { preserveScroll: true });
    };

    // O stopPropagation impede que o clique no "apagar" também abra a OS
    const deleteNotification = (event, notificationId) => {
        event.stopPropagation();
        router.delete(route('notifications.destroy', notificationId), { preserveScroll: true });
    };

    const deleteAll = () => {
        router.delete(route('notifications.destroy-all'), { preserveScroll: true });
    };

    const formatDate = (value) =>
        new Date(value).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });

    return (
        <div ref={containerRef} className="fixed right-6 top-5 z-50">
            {/* BOTÃO DO SINO */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-300 shadow-lg backdrop-blur transition hover:border-blue-500/50 hover:text-white"
            >
                <svg
                    className={`h-5 w-5 origin-top ${isShaking ? 'animate-bell-shake text-blue-400' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1h6z" />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* PAINEL DE NOTIFICAÇÕES */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-4 py-3">
                        <h3 className="text-sm font-bold text-white">Notificações</h3>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-xs font-medium text-blue-400 hover:text-blue-300">
                                    Marcar todas como lidas
                                </button>
                            )}
                            {items.length > 0 && (
                                <button onClick={deleteAll} className="text-xs font-medium text-slate-500 hover:text-red-400">
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {items.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma notificação por aqui.</p>
                        ) : (
                            items.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => openWorkOrder(notification)}
                                    className={`group flex cursor-pointer gap-3 border-b border-slate-800 px-4 py-3 transition hover:bg-slate-800/60 ${
                                        notification.read_at ? 'opacity-60' : ''
                                    }`}
                                >
                                    {/* Bolinha de não lida */}
                                    <span
                                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                            notification.read_at ? 'bg-slate-700' : 'bg-blue-500'
                                        }`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {notification.data.title}
                                        </p>
                                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                                            {notification.data.message}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-600">
                                            {formatDate(notification.created_at)}
                                        </p>
                                    </div>

                                    {/* APAGAR NOTIFICAÇÃO */}
                                    <button
                                        onClick={(event) => deleteNotification(event, notification.id)}
                                        title="Apagar notificação"
                                        className="h-fit shrink-0 rounded p-1 text-slate-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
