import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);


const NotificationBell: React.FC = () => {
    const { currentUser } = useAuth();
    const { notificacoes, markNotificacoesAsRead } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const userNotificacoes = useMemo(() => {
        if (!currentUser) return [];
        // O target ID da notificação é sempre o ID do usuário logado.
        // O campo `policialId` na notificação armazena, na verdade, o `userId` do destinatário.
        return notificacoes
            .filter(n => n.policialId === currentUser.id)
            .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    }, [notificacoes, currentUser]);

    const unreadCount = useMemo(() => userNotificacoes.filter(n => !n.lida).length, [userNotificacoes]);
    
    const handleToggle = () => {
        const willOpen = !isOpen;
        setIsOpen(willOpen);
        if (willOpen && unreadCount > 0 && currentUser) {
            markNotificacoesAsRead(currentUser.id);
        }
    };
    
    const handleNotificationClick = (link?: string) => {
        setIsOpen(false);
        if (link) {
            navigate(link);
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={handleToggle} className={`relative p-2 rounded-full text-pm-gray-600 hover:bg-white hover:text-pm-gray-800 transition-colors`}>
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-pm-red-dark text-white text-xs flex items-center justify-center ring-2 ring-pm-gray-100">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                 <div className="absolute right-0 mt-2 w-[420px] max-w-[90vw] bg-white rounded-xl shadow-xl z-20 border border-pm-gray-200 text-pm-gray-800">
                    <div className="p-4 font-bold text-lg border-b border-pm-gray-200 flex items-center gap-3">
                        <BellIcon className="h-6 w-6 text-pm-gray-500" />
                        Notificações
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {userNotificacoes.length > 0 ? (
                             <ul className="divide-y divide-pm-gray-100">
                                {userNotificacoes.map(n => (
                                    <li key={n.id}>
                                        <button
                                            onClick={() => handleNotificationClick(n.link)}
                                            className={`w-full text-left p-4 transition-colors duration-150 group ${!n.link ? 'cursor-default' : 'hover:bg-pm-gray-50'}`}
                                            disabled={!n.link}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-3 flex-shrink-0 pt-1.5">
                                                  {!n.lida && <div className="h-2.5 w-2.5 rounded-full bg-pm-blue ring-4 ring-pm-blue-light/20" aria-label="Não lida"></div>}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-base leading-relaxed text-pm-gray-800 group-hover:text-pm-gray-900">{n.mensagem}</p>
                                                    <p className="text-sm text-pm-gray-500 mt-2">
                                                      {new Date(n.criadoEm).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                             </ul>
                        ) : (
                           <div className="text-center p-12">
                                <BellIcon className="mx-auto h-16 w-16 text-pm-gray-200" />
                                <p className="mt-5 text-lg font-semibold text-pm-gray-700">Tudo em dia!</p>
                                <p className="mt-1 text-base text-pm-gray-500">Você não tem novas notificações.</p>
                           </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Layout: React.FC = () => {
    const { currentUser } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-pm-gray-100">
            {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" aria-hidden="true" />}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex-shrink-0 w-full flex justify-between md:justify-end items-center py-4 px-4 sm:px-8 z-20">
                    <button className="text-pm-gray-600 md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                     {currentUser && (
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-pm-gray-700 hidden sm:inline">Notificações</span>
                            <NotificationBell />
                        </div>
                    )}
                </header>
                <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;