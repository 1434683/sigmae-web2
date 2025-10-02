import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Policial, Folga, Historico, User, StatusFolga, Aprovacao, EventoHistorico, LeaveLedgerEntry, Ferias, FeriasStatus, AgendaEvento, Notificacao, Comentario, Grupo, ProtocoloDocumento } from '../types';
import { api } from './api';

interface DataState {
  policiais: Policial[];
  folgas: Folga[];
  historico: Historico[];
  users: User[];
  leaveLedger: LeaveLedgerEntry[];
  ferias: Ferias[];
  agendaEventos: AgendaEvento[];
  notificacoes: Notificacao[];
  comentarios: Comentario[];
  grupos: Grupo[];
  protocoloDocs: ProtocoloDocumento[];
}

interface DataContextType extends DataState {
    loading: boolean;
    addFolga: (folgaData: { policialld: number; data: string; motivo: string; }, currentUser: User) => Promise<void>;
    updateFolga: (folgald: string, updates: Partial<Folga>, currentUser: User) => Promise<void>;
    addPolicial: (policialData: Omit<Policial, 'id'>, currentUser: User) => Promise<void>;
    updatePolicial: (policialData: Policial, currentUser: User) => Promise<void>;
    deletePolicial: (policialId: number, currentUser: User) => Promise<void>;
    bulkUpsertPoliciais: (policiaisData: (Omit<Policial, 'id'> & { re: string })[], currentUser: User) => Promise<void>;
    adminAddLeaveCredits: (opts: { policialId: number; year: number; delta: number; reason?: string; }, currentUser: User) => Promise<void>;
    getBalanceFor: (policialId: number, year: number) => number;
    getCreditsFor: (policialId: number, year: number) => number;
    countUsedFolgasFor: (policialId: number, year: number) => number;
    canRequestFolga: (args: { policialId: number, dateISO: string, allowOverride?: boolean }) => { ok: boolean; error?: string; balance: number; warn?: string };
    addFerias: (feriasData: Omit<Ferias, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => Promise<void>;
    updateFerias: (feriasId: string, updates: Partial<Ferias>, currentUser: User) => Promise<void>;
    addAgendaEvento: (eventoData: Omit<AgendaEvento, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => Promise<void>;
    updateAgendaEvento: (eventoId: string, updates: Partial<AgendaEvento>, currentUser: User) => Promise<void>;
    deleteAgendaEvento: (eventoId: string, currentUser: User) => Promise<void>;
    markNotificacoesAsRead: (targetId: number) => Promise<void>;
    addComentario: (folgald: string, mensagem: string, currentUser: User) => Promise<void>;
    addGrupo: (nome: string, currentUser: User) => Promise<void>;
    updateGrupo: (grupo: Grupo, currentUser: User) => Promise<void>;
    deleteGrupo: (id: number, currentUser: User) => Promise<void>;
    addProtocoloDoc: (docData: Omit<ProtocoloDocumento, 'id'|'numero'|'ano'|'sequencial'|'criadoEm'>, currentUser: User) => Promise<ProtocoloDocumento>;
    adminResetProtocoloCounter: (currentUser: User) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [state, setState] = useState<DataState>({
        policiais: [], folgas: [], historico: [], users: [], leaveLedger: [], ferias: [], agendaEventos: [], notificacoes: [], comentarios: [], grupos: [], protocoloDocs: [],
    });

    const refetchData = useCallback(async () => {
        const allData = await api.getAllData();
        setState(allData as DataState);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                await refetchData();
            } catch (error) {
                console.error("Failed to fetch initial data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refetchData]);
    
    const addAndPushNotifications = useCallback(async (notifications: Notificacao[]) => {
        if (!notifications || notifications.length === 0) return;
        await api.addNotificacoes(notifications);
        refetchData();

        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        notifications.forEach(n => {
            registration.showNotification('Atualização SIGMA-E', {
                body: n.mensagem, icon: '/vite.svg', data: { url: n.link || '/dashboard' }, tag: `sigma-notif-${n.id}`
            });
        });
    }, [refetchData]);

    const getYearFromISODate = (iso: string) => Number(iso.slice(0, 4));
    
    const folgaContaConsumo = (f: Folga): boolean => {
      const isApprovedAndActive = f.aprovacao === Aprovacao.VALIDADA_ADMIN && f.status === StatusFolga.ATIVA;
      if (!isApprovedAndActive) return false;
      return f.motivo === 'Folga Cmt Geral';
    };
    
    const getCreditsFor = useCallback((policialId: number, year: number) => {
        return state.leaveLedger.filter(e => e.policialId === policialId && e.year === year).reduce((sum, e) => sum + e.delta, 0);
    }, [state.leaveLedger]);

    const countUsedFolgasFor = useCallback((policialId: number, year: number) => {
        return state.folgas.filter(f => f.policialld === policialId && getYearFromISODate(f.data) === year && folgaContaConsumo(f)).length;
    }, [state.folgas]);

    const getBalanceFor = useCallback((policialId: number, year: number) => {
        return getCreditsFor(policialId, year) - countUsedFolgasFor(policialId, year);
    }, [getCreditsFor, countUsedFolgasFor]);

    const canRequestFolga = useCallback((args: { policialId: number; dateISO: string; allowOverride?: boolean; }) => {
        const year = getYearFromISODate(args.dateISO);
        const balance = getBalanceFor(args.policialId, year);
        if (balance > 0) return { ok: true, balance };
        if (args.allowOverride) return { ok: true, balance, warn: "Sem saldo, mas a criação foi permitida pelo perfil do usuário." };
        return { ok: false, error: `Sem saldo de folgas para o ano de ${year}.`, balance };
    }, [getBalanceFor]);

    // --- MUTATOR FUNCTIONS ---

    const addFolga = useCallback(async (folgaData: {policialld: number, data: string, motivo: string}, currentUser: User) => {
        if (folgaData.motivo === 'Folga Cmt Geral') {
            const newFolgaDate = new Date(folgaData.data + 'T12:00:00');
            const existing = state.folgas.find(f => {
                if (f.policialld !== folgaData.policialld || f.motivo !== 'Folga Cmt Geral') return false;
                const isCountable = f.status !== StatusFolga.EXCLUIDA && f.status !== StatusFolga.CANCELADA && f.aprovacao !== Aprovacao.NEGADA_SARGENTO && f.aprovacao !== Aprovacao.REPROVADA_ADMIN;
                if (!isCountable) return false;
                const existingDate = new Date(f.data + 'T12:00:00');
                return existingDate.getFullYear() === newFolgaDate.getFullYear() && existingDate.getMonth() === newFolgaDate.getMonth();
            });
            if (existing) throw new Error(`Este policial já possui uma Folga Cmt Geral neste mês.`);
        }

        const policial = state.policiais.find(p => p.id === folgaData.policialld);
        if (!policial) throw new Error("Policial não encontrado.");

        const { role } = currentUser;
        let aprovacao: Aprovacao;
        let sargentoResponsavelld: number | undefined;

        if (role === 'SUBORDINADO') {
            aprovacao = Aprovacao.ENVIADA_SARGENTO;
            sargentoResponsavelld = state.users.find(u => u.role === 'SARGENTO' && u.pelotao === policial.pelotao && u.ativo)?.id;
        } else if (role === 'SARGENTO') {
            aprovacao = Aprovacao.APROVADA_SARGENTO;
        } else {
            aprovacao = Aprovacao.VALIDADA_ADMIN;
        }

        const newFolga: Omit<Folga, 'folgald' | 'criadoEm'> & {criadoEm?: string, folgald?: string} = {
            policialld: policial.id, nome: policial.nome, re: policial.re, pelotao: policial.pelotao, data: folgaData.data,
            motivo: folgaData.motivo, status: StatusFolga.ATIVA, aprovacao, criadaPorld: currentUser.id, atualizadoEm: new Date().toISOString(),
            trocadaPara: null, sargentoResponsavelld
        };
        
        await api.createFolga(newFolga, currentUser);
        await refetchData();

        const sargento = state.users.find(u => u.id === sargentoResponsavelld);
        if(sargento){
            await addAndPushNotifications([{
                id: Date.now(), policialId: sargento.id,
                mensagem: `${policial.postoGrad} ${policial.nome} solicitou uma folga.`, lida: false,
                link: `/folgas?aprovacao=${Aprovacao.ENVIADA_SARGENTO}`, criadoEm: new Date().toISOString()
            }]);
        }
    }, [state, refetchData, addAndPushNotifications]);

    const updateFolga = useCallback(async (folgald: string, updates: Partial<Folga>, currentUser: User) => {
        await api.updateFolga(folgald, updates, currentUser);
        const updatedFolga = { ...state.folgas.find(f => f.folgald === folgald)!, ...updates };
        await refetchData();
        
        const newNotifications: Notificacao[] = [];
        const userDoPolicial = state.users.find(u => u.policialId === updatedFolga.policialld);
        const sargentoDoPelotao = state.users.find(u => u.role === 'SARGENTO' && u.pelotao === updatedFolga.pelotao && u.ativo);

        // Logic for sending notifications based on the update...
        if (updates.aprovacao && userDoPolicial) {
            newNotifications.push({ id: Date.now(), policialId: userDoPolicial.id, mensagem: `Sua folga teve o status alterado para ${updatedFolga.aprovacao}`, lida: false, link: '/folgas', criadoEm: new Date().toISOString()});
        }
        if (updates.aprovacao === Aprovacao.APROVADA_SARGENTO) {
             state.users.filter(u => u.role === 'ADMIN').forEach(admin => newNotifications.push({ id: Date.now()+admin.id, policialId: admin.id, mensagem: `Folga de ${updatedFolga.nome} aguardando sua validação.`, lida: false, link: `/folgas?aprovacao=${Aprovacao.APROVADA_SARGENTO}`, criadoEm: new Date().toISOString()}));
        }
        if (updates.aprovacao === Aprovacao.VALIDADA_ADMIN && sargentoDoPelotao) {
             newNotifications.push({ id: Date.now()+1, policialId: sargentoDoPelotao.id, mensagem: `Folga de ${updatedFolga.nome} foi validada.`, lida: false, link: '/folgas', criadoEm: new Date().toISOString()});
        }
        if (newNotifications.length > 0) await addAndPushNotifications(newNotifications);

    }, [state, refetchData, addAndPushNotifications]);

    const addPolicial = useCallback(async (policialData: Omit<Policial, 'id'>, currentUser: User) => {
        await api.createPolicial(policialData, currentUser);
        await refetchData();
    }, [refetchData]);

    const updatePolicial = useCallback(async (policialData: Policial, currentUser: User) => {
        await api.updatePolicial(policialData, currentUser);
        await refetchData();
    }, [refetchData]);
    
    const deletePolicial = useCallback(async (policialId: number, currentUser: User) => {
        await api.deletePolicial(policialId, currentUser);
        await refetchData();
    }, [refetchData]);
    
    const bulkUpsertPoliciais = useCallback(async (policiaisData: (Omit<Policial, 'id'> & { re: string })[], currentUser: User) => {
        await api.bulkUpsertPoliciais(policiaisData, currentUser);
        await refetchData();
    }, [refetchData]);
    
    const adminAddLeaveCredits = useCallback(async (opts: { policialId: number; year: number; delta: number; reason?: string }, currentUser: User) => {
        await api.addLeaveCredit(opts, currentUser);
        await refetchData();
    }, [refetchData]);

    const addFerias = useCallback(async (feriasData: Omit<Ferias, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => {
        await api.createFerias(feriasData, currentUser);
        await refetchData();
    }, [refetchData]);

    const updateFerias = useCallback(async (feriasId: string, updates: Partial<Ferias>, currentUser: User) => {
        await api.updateFerias(feriasId, updates, currentUser);
        await refetchData();
    }, [refetchData]);

    const addAgendaEvento = useCallback(async (eventoData: Omit<AgendaEvento, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => {
        // Fix: Explicitly type `createdEvent` to avoid properties being typed as 'unknown'.
        const createdEvent = await api.createAgendaEvento(eventoData, currentUser) as AgendaEvento;
        await refetchData();

        const userMap = new Map(state.users.map(u => [u.policialId, u]));
        const notifications: Notificacao[] = createdEvent.policiaisIds.map((policialId, index) => {
            const user = userMap.get(policialId);
            if (!user) return null;
            return {
                // Fix: Accessing `user.id` is now safe because `user` is correctly typed as `User`.
                id: Date.now() + index, policialId: user.id,
                mensagem: `Você foi escalado para: "${createdEvent.titulo}" em ${new Date(createdEvent.data + 'T12:00:00').toLocaleDateString()}.`,
                lida: false, link: '/calendario', criadoEm: new Date().toISOString()
            };
        // Fix: Replaced the problematic type predicate with a simple `Boolean` filter, which correctly removes nulls and satisfies type checking.
        }).filter(Boolean) as Notificacao[];
        await addAndPushNotifications(notifications);
    }, [refetchData, addAndPushNotifications, state.users]);

    const updateAgendaEvento = useCallback(async (eventoId: string, updates: Partial<AgendaEvento>, currentUser: User) => {
        const original = state.agendaEventos.find(e => e.id === eventoId)!;
        // Fix: Explicitly type `updated` to avoid properties being typed as 'unknown'.
        const updated = await api.updateAgendaEvento(eventoId, updates, currentUser) as AgendaEvento;
        await refetchData();
        
        const originalIds = new Set(original.policiaisIds);
        const addedPoliciais = (updated.policiaisIds || []).filter(id => !originalIds.has(id));
        if (addedPoliciais.length > 0) {
            const userMap = new Map(state.users.map(u => [u.policialId, u]));
            const notifications: Notificacao[] = addedPoliciais.map((policialId, index) => {
                const user = userMap.get(policialId);
                if (!user) return null;
                return {
                    // Fix: Accessing `user.id` is now safe because `user` is correctly typed as `User`.
                    id: Date.now() + index, policialId: user.id,
                    mensagem: `Você foi escalado para: "${updated.titulo}" em ${new Date(updated.data + 'T12:00:00').toLocaleDateString()}.`,
                    lida: false, link: '/calendario', criadoEm: new Date().toISOString()
                };
            // Fix: Replaced the problematic type predicate with a simple `Boolean` filter.
            }).filter(Boolean) as Notificacao[];
            await addAndPushNotifications(notifications);
        }
    }, [refetchData, addAndPushNotifications, state.agendaEventos, state.users]);

    const deleteAgendaEvento = useCallback(async (eventoId: string, currentUser: User) => {
        await api.deleteAgendaEvento(eventoId, currentUser);
        await refetchData();
    }, [refetchData]);

    const markNotificacoesAsRead = useCallback(async (targetId: number) => {
        await api.markNotificacoesAsRead(targetId);
        await refetchData();
    }, [refetchData]);

    const addComentario = useCallback(async (folgald: string, mensagem: string, currentUser: User) => {
        if (!mensagem.trim()) return;
        const folga = state.folgas.find(f => f.folgald === folgald);
        if(!folga) return;
        
        await api.createComentario({ folgald, mensagem }, currentUser);
        await refetchData();

        const sargento = state.users.find(u => u.role === 'SARGENTO' && u.pelotao === folga.pelotao && u.ativo);
        const userDoPolicial = state.users.find(u => u.policialId === folga.policialld);
        
        let targetUser: User | undefined;
        let notifMessage = '';
        if (currentUser.role === 'SUBORDINADO' && sargento) {
            targetUser = sargento;
            notifMessage = `${currentUser.nome} comentou na folga de ${folga.nome}.`;
        } else if (currentUser.role === 'SARGENTO' && userDoPolicial) {
            targetUser = userDoPolicial;
            notifMessage = `Seu sargento comentou em sua folga.`;
        }

        if(targetUser) {
            await addAndPushNotifications([{
                id: Date.now(), policialId: targetUser.id, mensagem: notifMessage,
                lida: false, link: `/folgas`, criadoEm: new Date().toISOString()
            }]);
        }
    }, [refetchData, state.folgas, state.users, addAndPushNotifications]);

    const addGrupo = useCallback(async (nome: string, currentUser: User) => {
        await api.createGrupo(nome, currentUser);
        await refetchData();
    }, [refetchData]);

    const updateGrupo = useCallback(async (grupo: Grupo, currentUser: User) => {
        await api.updateGrupo(grupo, currentUser);
        await refetchData();
    }, [refetchData]);

    const deleteGrupo = useCallback(async (id: number, currentUser: User) => {
        await api.deleteGrupo(id, currentUser);
        await refetchData();
    }, [refetchData]);

    const addProtocoloDoc = useCallback(async (docData: Omit<ProtocoloDocumento, 'id'|'numero'|'ano'|'sequencial'|'criadoEm'>, currentUser: User) => {
        const newDoc = await api.createProtocoloDoc(docData, currentUser) as ProtocoloDocumento;
        await refetchData();
        return newDoc;
    }, [refetchData]);

    const adminResetProtocoloCounter = useCallback(async (currentUser: User) => {
        await api.resetProtocoloCounter(currentUser);
        await refetchData();
    }, [refetchData]);

    const value: DataContextType = {
        ...state,
        loading,
        addFolga,
        updateFolga,
        addPolicial,
        updatePolicial,
        deletePolicial,
        bulkUpsertPoliciais,
        adminAddLeaveCredits,
        getBalanceFor,
        getCreditsFor,
        countUsedFolgasFor,
        canRequestFolga,
        addFerias,
        updateFerias,
        addAgendaEvento,
        updateAgendaEvento,
        deleteAgendaEvento,
        markNotificacoesAsRead,
        addComentario,
        addGrupo,
        updateGrupo,
        deleteGrupo,
        addProtocoloDoc,
        adminResetProtocoloCounter,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
