import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import CreateUserModal from './components/CreateUserModal';
import EditUserModal from './components/EditUserModal';
import UserHistoryModal from './components/UserHistoryModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ConfirmRestoreModal from './components/ConfirmRestoreModal';

const roleMap = {
    'coordinator': 'Coordenador',
    'intern': 'Estagiário',
    'Technician': 'Técnico',
    'engineer': 'Engenheiro',
    'seaman': 'Marinheiro',
    'dev': 'Desenvolvedor'
};

export default function Index({ users, roles, vessels, historyUsers }) {
    const { auth } = usePage().props;
    
    const loggedInUser = users?.find(user => user.id === auth?.user?.id);
    const currentUserRoleName = loggedInUser?.role?.name || '';
    const canManageUsers = ['dev', 'Coordinator', 'Engineer'].includes(currentUserRoleName);

    console.log("Nome da Role: ", currentUserRoleName);
    console.log("Pode gerenciar usuários? ", canManageUsers);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [userToRestore, setUserToRestore] = useState(null);
    
    const [selectedUser, setSelectedUser] = useState(null);

    const openEditModal = (user) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const requestDelete = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = () => {
        if (userToDelete) {
            router.delete(route('crew.destroy', userToDelete.id), {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                }
            });
        }
    };

    const requestRestore = (user) => {
        setUserToRestore(user);
        setIsRestoreModalOpen(true);
    };

    const executeRestore = () => {
        if (userToRestore) {
            router.post(route('crew.restore', userToRestore.id), {}, {
                onSuccess: () => {
                    setIsRestoreModalOpen(false);
                    setUserToRestore(null);
                }
            });
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.substring(0, 2).toUpperCase();
    };

    const renderStatusBadge = (status) => {
        const currentStatus = status || 'Active'; 
        
        switch (currentStatus) {
            case 'Active': 
                return (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]"></span>
                        Ativo
                    </span>
                );
            case 'Embarked': 
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Embarcado
                    </span>
                );
            case 'Off Duty': 
                return (
                    <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                        Em Folga
                    </span>
                );
            case 'On Leave': 
                return (
                    <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 ring-1 ring-inset ring-orange-500/20">
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Férias
                    </span>
                );
            case 'Terminated': 
                return (
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_#ef4444]"></span>
                        Desligado
                    </span>
                );
            default: 
                return null;
        }
    };

    const filteredUsers = users ? users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const username = (user.username || '').toLowerCase();
        const nickname = (user.nickname || '').toLowerCase();
        const roleName = user.role ? (roleMap[user.role.name] || user.role.name).toLowerCase() : '';
        
        return username.includes(query) || nickname.includes(query) || roleName.includes(query);
    }) : [];

    const sortedUsers = [...filteredUsers].sort((a, b) => (a.username || '').localeCompare(b.username || ''));

    return (
        <SIGMANLayout>
            <Head title="Tripulação e Equipe | SIGMAN" />

            {canManageUsers && (
                <>
                    <CreateUserModal 
                        isOpen={isCreateModalOpen} 
                        onClose={() => setIsCreateModalOpen(false)} 
                        roles={roles}
                        vessels={vessels}
                    />
                    
                    <EditUserModal 
                        isOpen={isEditModalOpen} 
                        onClose={() => setIsEditModalOpen(false)} 
                        user={selectedUser} 
                        roles={roles}
                        vessels={vessels}
                    />

                    <UserHistoryModal 
                        isOpen={isHistoryModalOpen} 
                        onClose={() => setIsHistoryModalOpen(false)} 
                        historyUsers={historyUsers}
                        onRestore={requestRestore}
                    />

                    <ConfirmDeleteModal 
                        isOpen={isDeleteModalOpen}
                        onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
                        onConfirm={executeDelete}
                        user={userToDelete}
                    />

                    <ConfirmRestoreModal 
                        isOpen={isRestoreModalOpen}
                        onClose={() => { setIsRestoreModalOpen(false); setUserToRestore(null); }}
                        onConfirm={executeRestore}
                        user={userToRestore}
                    />
                </>
            )}

            <div className="flex h-full flex-col space-y-6">
                
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white">Tripulação e Equipe Técnica</h2>
                        <p className="text-xs text-slate-400">Gerencie os funcionários, cargos e alocações da frota.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <input 
                                type="text" 
                                placeholder="Buscar por nome" 
                                className="w-64 rounded-md border-slate-700 bg-slate-900 py-1.5 pl-3 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        {canManageUsers && (
                            <>
                                <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-700 transition hover:bg-slate-700">
                                    <svg className="mr-2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Histórico
                                </button>

                                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500">
                                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                    Adicionar Membro
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
                    <div className="overflow-x-auto h-full custom-scrollbar">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-10 bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 ring-1 ring-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Funcionário</th>
                                    <th className="px-6 py-4 font-semibold">Cargo</th>
                                    <th className="px-6 py-4 font-semibold">Embarcação Base</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    {canManageUsers && <th className="px-6 py-4 font-semibold text-right">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {sortedUsers.map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-slate-800/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white ring-2 ring-slate-700">
                                                    {getInitials(user.nickname || user.username)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">{user.nickname || user.username}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-300 font-medium">
                                                {user.role ? (roleMap[user.role.name] || user.role.name) : 'Cargo não definido'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-slate-500">
                                                <svg className="mr-2 h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                {user.vessel ? user.vessel.name : 'Não Alocado'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderStatusBadge(user.status)}
                                        </td>
                                        
                                        {canManageUsers && (
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openEditModal(user)} className="text-slate-400 hover:text-blue-400 transition-colors mr-3">
                                                    <svg className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button onClick={() => requestDelete(user)} className="text-slate-400 hover:text-red-400 transition-colors">
                                                    <svg className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {sortedUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={canManageUsers ? "5" : "4"} className="px-6 py-8 text-center text-slate-500">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </SIGMANLayout>
    );
}