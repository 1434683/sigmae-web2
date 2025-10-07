import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Policial, Folga, Historico, User, StatusFolga, Aprovacao, LeaveLedgerEntry, Ferias, FeriasStatus, AgendaEvento, Notificacao, Comentario, Grupo, ProtocoloDocumento, EventoHistorico } from '../types';
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
    addFolga: (folgaData: { policialld: string; data: string; motivo: string; }, currentUser: User) => Promise<void>;
    updateFolga: (folgald: string, updates: Partial<Folga>, currentUser: User) => Promise<void>;
    addPolicial: (policialData: Omit<Policial, 'id'>, currentUser: User) => Promise<void>;
    updatePolicial: (policialData: Policial, currentUser: User) => Promise<void>;
    deletePolicial: (policialId: string, currentUser: User) => Promise<void>;
    bulkUpsertPoliciais: (policiaisData: (Omit<Policial, 'id'> & { re: string })[], currentUser: User) => Promise<void>;
    adminAddLeaveCredits: (opts: { policialId: string; year: number; delta: number; reason?: string; }, currentUser: User) => Promise<void>;
    getBalanceFor: (policialId: string, year: number) => number;
    getCreditsFor: (policialId: string, year: number) => number;
    countUsedFolgasFor: (policialId: string, year: number) => number;
    canRequestFolga: (args: { policialId: string, dateISO: string, allowOverride?: boolean }) => { ok: boolean; error?: string; balance: number; warn?: string };
    addFerias: (feriasData: Omit<Ferias, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => Promise<void>;
    updateFerias: (feriasId: string, updates: Partial<Ferias>, currentUser: User) => Promise<void>;
    addAgendaEvento: (eventoData: Omit<AgendaEvento, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => Promise<AgendaEvento>;
    updateAgendaEvento: (eventoId: string, updates: Partial<AgendaEvento>, currentUser: User) => Promise<AgendaEvento>;
    deleteAgendaEvento: (eventoId: string, currentUser: User) => Promise<void>;
    markNotificacoesAsRead: (targetId: string) => Promise<void>;
    addComentario: (folgald: string, mensagem: string, currentUser: User) => Promise<void>;
    addGrupo: (nome: string, currentUser: User) => Promise<void>;
    updateGrupo: (grupo: Grupo, currentUser: User) => Promise<void>;
    deleteGrupo: (id: string, currentUser: User) => Promise<void>;
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
    
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const allData = await api.getAllData();
            setState(allData);
        } catch (error) {
            console.error("Failed to fetch data from API", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    
    const addAndPushNotifications = useCallback(async (notifications: Omit<Notificacao, 'id'>[]) => {
        if (!notifications || notifications.length === 0) return;
        const completeNotifications = notifications.map(n => ({...n, id: String(Date.now() + Math.random())}));
        await api.addNotificacoes(completeNotifications);
        await fetchData(); // Refresh data
    }, [fetchData]);

    const getYearFromISODate = (iso: string) => Number(iso.slice(0, 4));
    
    const folgaContaConsumo = (f: Folga): boolean => {
      const isApprovedAndActive = f.aprovacao === Aprovacao.VALIDADA_ADMIN && f.status === StatusFolga.ATIVA;
      if (!isApprovedAndActive) return false;
      return f.motivo === 'Folga Cmt Geral';
    };
    
    const getCreditsFor = useCallback((policialId: string, year: number) => {
        return state.leaveLedger.filter(e => e.policialId === policialId && e.year === year).reduce((sum, e) => sum + e.delta, 0);
    }, [state.leaveLedger]);

    const countUsedFolgasFor = useCallback((policialId: string, year: number) => {
        return state.folgas.filter(f => f.policialld === policialId && getYearFromISODate(f.data) === year && folgaContaConsumo(f)).length;
    }, [state.folgas]);

    const getBalanceFor = useCallback((policialId: string, year: number) => {
        return getCreditsFor(policialId, year) - countUsedFolgasFor(policialId, year);
    }, [getCreditsFor, countUsedFolgasFor]);

    const canRequestFolga = useCallback((args: { policialId: string; dateISO: string; allowOverride?: boolean; }) => {
        const year = getYearFromISODate(args.dateISO);
        const balance = getBalanceFor(args.policialId, year);
        if (balance > 0) return { ok: true, balance };
        if (args.allowOverride) return { ok: true, balance, warn: "Sem saldo, mas a criação foi permitida pelo perfil do usuário." };
        return { ok: false, error: `Sem saldo de folgas para o ano de ${year}.`, balance };
    }, [getBalanceFor]);

    const addFolga = useCallback(async (folgaData: {policialld: string, data: string, motivo: string}, currentUser: User) => {
        const policial = state.policiais.find(p => p.id === folgaData.policialld);
        if (!policial) throw new Error("Policial não encontrado.");

        const { role } = currentUser;
        let aprovacao: Aprovacao, sargentoResponsavelld: string | undefined;

        if (role === 'SUBORDINADO') {
            aprovacao = Aprovacao.ENVIADA_SARGENTO;
            sargentoResponsavelld = state.users.find(u => u.role === 'SARGENTO' && u.pelotao === policial.pelotao && u.ativo)?.id;
        } else if (role === 'SARGENTO') aprovacao = Aprovacao.APROVADA_SARGENTO;
        else aprovacao = Aprovacao.VALIDADA_ADMIN;

        const newFolgaData = {
            policialld: policial.id, nome: policial.nome, re: policial.re, pelotao: policial.pelotao, data: folgaData.data,
            motivo: folgaData.motivo, status: StatusFolga.ATIVA, aprovacao, criadaPorld: currentUser.id, atualizadoEm: new Date().toISOString(),
            trocadaPara: null, sargentoResponsavelld
        };
        await api.createFolga(newFolgaData, currentUser);
        await fetchData();
        
        const sargento = state.users.find(u => u.id === sargentoResponsavelld);
        if(sargento){
            await addAndPushNotifications([{
                policialId: sargento.id,
                mensagem: `${policial.postoGrad} ${policial.nome} solicitou uma folga.`, lida: false,
                link: `/folgas?aprovacao=${Aprovacao.ENVIADA_SARGENTO}`, criadoEm: new Date().toISOString()
            }]);
        }
    }, [state.policiais, state.users, addAndPushNotifications, fetchData]);

    const updateFolga = useCallback(async (folgald: string, updates: Partial<Folga>, currentUser: User) => {
        // Fix: Explicitly type `updatedFolga` to prevent it from being inferred as `unknown`.
        const updatedFolga: Folga = await api.updateFolga(folgald, updates, currentUser);
        await fetchData();
        
        const newNotifications: Omit<Notificacao, 'id'>[] = [];
        const userDoPolicial = state.users.find(u => u.policialId === updatedFolga.policialld);
        const sargentoDoPelotao = state.users.find(u => u.role === 'SARGENTO' && u.pelotao === updatedFolga.pelotao && u.ativo);

        if (updates.aprovacao && userDoPolicial) {
            newNotifications.push({ policialId: userDoPolicial.id, mensagem: `Sua folga teve o status alterado para ${updatedFolga.aprovacao}`, lida: false, link: '/folgas', criadoEm: new Date().toISOString()});
        }
        if (updates.aprovacao === Aprovacao.APROVADA_SARGENTO) {
             state.users.filter(u => u.role === 'ADMIN').forEach(admin => newNotifications.push({ policialId: admin.id, mensagem: `Folga de ${updatedFolga.nome} aguardando sua validação.`, lida: false, link: `/folgas?aprovacao=${Aprovacao.APROVADA_SARGENTO}`, criadoEm: new Date().toISOString()}));
        }
        if (updates.aprovacao === Aprovacao.VALIDADA_ADMIN && sargentoDoPelotao) {
             newNotifications.push({ policialId: sargentoDoPelotao.id, mensagem: `Folga de ${updatedFolga.nome} foi validada.`, lida: false, link: '/folgas', criadoEm: new Date().toISOString()});
        }
        if (newNotifications.length > 0) await addAndPushNotifications(newNotifications);
    }, [state.users, addAndPushNotifications, fetchData]);

    const addPolicial = useCallback(async (policialData: Omit<Policial, 'id'>, currentUser: User) => {
        await api.createPolicial(policialData, currentUser);
        await fetchData();
    }, [fetchData]);

    const updatePolicial = useCallback(async (policialData: Policial, currentUser: User) => {
        await api.updatePolicial(policialData, currentUser);
        await fetchData();
    }, [fetchData]);
    
    const deletePolicial = useCallback(async (policialId: string, currentUser: User) => {
        await api.deletePolicial(policialId, currentUser);
        await fetchData();
    }, [fetchData]);
    
    const bulkUpsertPoliciais = useCallback(async (policiaisData: (Omit<Policial, 'id'> & { re: string })[], currentUser: User) => {
        await api.bulkUpsertPoliciais(policiaisData, currentUser);
        await fetchData();
    }, [fetchData]);
    
    const adminAddLeaveCredits = useCallback(async (opts: { policialId: string; year: number; delta: number; reason?: string }, currentUser: User) => {
        await api.addLeaveCredit(opts, currentUser);
        await fetchData();
    }, [fetchData]);

    const addFerias = useCallback(async (feriasData: Omit<Ferias, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => {
        await api.createFerias(feriasData, currentUser);
        await fetchData();
    }, [fetchData]);

    const updateFerias = useCallback(async (feriasId: string, updates: Partial<Ferias>, currentUser: User) => {
        await api.updateFerias(feriasId, updates, currentUser);
        await fetchData();
    }, [fetchData]);

    const addAgendaEvento = useCallback(async (eventoData: Omit<AgendaEvento, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => {
        // Fix: Explicitly type `createdEvent` to prevent it from being inferred as `unknown`.
        const createdEvent: AgendaEvento = await api.createAgendaEvento(eventoData, currentUser);
        await fetchData();

        const userMap = new Map(state.users.map(u => [u.policialId, u]));
        const notifications: Omit<Notificacao, 'id'>[] = createdEvent.policiaisIds.map(policialId => {
            const user = userMap.get(policialId);
            if (!user) return null;
            const notif: Omit<Notificacao, 'id'> = {
                policialId: user.id,
                mensagem: `Você foi escalado para: "${createdEvent.titulo}" em ${new Date(createdEvent.data + 'T12:00:00').toLocaleDateString()}.`,
                lida: false, link: '/calendario', criadoEm: new Date().toISOString()
            };
            return notif;
        }).filter((n): n is Omit<Notificacao, 'id'> => n !== null);
        await addAndPushNotifications(notifications);
        return createdEvent;
    }, [addAndPushNotifications, state.users, fetchData]);

    const updateAgendaEvento = useCallback(async (eventoId: string, updates: Partial<AgendaEvento>, currentUser: User) => {
        const original = state.agendaEventos.find(e => e.id === eventoId)!;
        // Fix: Explicitly type `updatedEvent` to prevent it from being inferred as `unknown`.
        const updatedEvent: AgendaEvento = await api.updateAgendaEvento(eventoId, updates, currentUser);
        await fetchData();
        
        const originalIds = new Set(original.policiaisIds);
        const addedPoliciais = (updatedEvent.policiaisIds || []).filter(id => !originalIds.has(id));
        if (addedPoliciais.length > 0) {
            const userMap = new Map(state.users.map(u => [u.policialId, u]));
            const notifications: Omit<Notificacao, 'id'>[] = addedPoliciais.map(policialId => {
                const user = userMap.get(policialId);
                if (!user) return null;
                const notif: Omit<Notificacao, 'id'> = {
                    policialId: user.id,
                    mensagem: `Você foi escalado para: "${updatedEvent.titulo}" em ${new Date(updatedEvent.data + 'T12:00:00').toLocaleDateString()}.`,
                    lida: false, link: '/calendario', criadoEm: new Date().toISOString()
                };
                return notif;
            }).filter((n): n is Omit<Notificacao, 'id'> => n !== null);
            await addAndPushNotifications(notifications);
        }
        return updatedEvent;
    }, [addAndPushNotifications, state.agendaEventos, state.users, fetchData]);

    const deleteAgendaEvento = useCallback(async (eventoId: string, currentUser: User) => {
        await api.deleteAgendaEvento(eventoId, currentUser);
        await fetchData();
    }, [fetchData]);

    const markNotificacoesAsRead = useCallback(async (targetId: string) => {
        await api.markNotificacoesAsRead(targetId);
        await fetchData();
    }, [fetchData]);

    const addComentario = useCallback(async (folgald: string, mensagem: string, currentUser: User) => {
        if (!mensagem.trim()) return;
        const folga = state.folgas.find(f => f.folgald === folgald);
        if(!folga) return;
        
        await api.createComentario({ folgald, mensagem }, currentUser);
        await fetchData();

        const sargento = state.users.find(u => u.role === 'SARGENTO' && u.pelotao === folga.pelotao && u.ativo);
        const userDoPolicial = state.users.find(u => u.policialId === folga.policialld);
        
        let targetUser: User | undefined, notifMessage = '';
        if (currentUser.role === 'SUBORDINADO' && sargento) { targetUser = sargento; notifMessage = `${currentUser.nome} comentou na folga de ${folga.nome}.`; }
        else if (currentUser.role === 'SARGENTO' && userDoPolicial) { targetUser = userDoPolicial; notifMessage = `Seu sargento comentou em sua folga.`; }
        if(targetUser) await addAndPushNotifications([{ policialId: targetUser.id, mensagem: notifMessage, lida: false, link: `/folgas`, criadoEm: new Date().toISOString() }]);
    }, [state.folgas, state.users, addAndPushNotifications, fetchData]);

    const addGrupo = useCallback(async (nome: string, currentUser: User) => {
        await api.createGrupo(nome, currentUser);
        await fetchData();
    }, [fetchData]);

    const updateGrupo = useCallback(async (grupo: Grupo, currentUser: User) => {
        await api.updateGrupo(grupo, currentUser);
        await fetchData();
    }, [fetchData]);

    const deleteGrupo = useCallback(async (id: string, currentUser: User) => {
        await api.deleteGrupo(id, currentUser);
        await fetchData();
    }, [fetchData]);

    const addProtocoloDoc = useCallback(async (docData: Omit<ProtocoloDocumento, 'id'|'numero'|'ano'|'sequencial'|'criadoEm'>, currentUser: User) => {
        const newDoc = await api.createProtocoloDoc(docData, currentUser);
        await fetchData();
        return newDoc;
    }, [fetchData]);

    const adminResetProtocoloCounter = useCallback(async (currentUser: User) => {
        await api.resetProtocoloCounter(currentUser);
        await fetchData();
    }, [fetchData]);

    const value: DataContextType = {
        ...state, loading, addFolga, updateFolga, addPolicial, updatePolicial, deletePolicial, bulkUpsertPoliciais, adminAddLeaveCredits,
        getBalanceFor, getCreditsFor, countUsedFolgasFor, canRequestFolga, addFerias, updateFerias, addAgendaEvento, updateAgendaEvento,
        deleteAgendaEvento, markNotificacoesAsRead, addComentario, addGrupo, updateGrupo, deleteGrupo, addProtocoloDoc, adminResetProtocoloCounter,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};