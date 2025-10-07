import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Policial, Folga, Historico, User, StatusFolga, Aprovacao, LeaveLedgerEntry, Ferias, FeriasStatus, AgendaEvento, Notificacao, Comentario, Grupo, ProtocoloDocumento, EventoHistorico } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { NOME_CIA, CODIGO_CIA } from '../constants';


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

// Helper to create a history entry
const createHistorico = (evento: EventoHistorico, actor: User, details: Partial<Historico>): Omit<Historico, 'id'> => ({
    evento, actorId: actor.id, actorNome: actor.nome, timestamp: new Date().toISOString(), 
    pelotao: actor.pelotao || 'N/A', dataOriginal: null, dataNova: null, motivo: null, antesDepois: null, ...details
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [state, setState] = useState<DataState>({
        policiais: [], folgas: [], historico: [], users: [], leaveLedger: [], ferias: [], agendaEventos: [], notificacoes: [], comentarios: [], grupos: [], protocoloDocs: [],
    });

    useEffect(() => {
        const collections: (keyof DataState)[] = ['policiais', 'folgas', 'historico', 'users', 'leaveLedger', 'ferias', 'agendaEventos', 'notificacoes', 'comentarios', 'grupos', 'protocoloDocs'];
        const unsubscribes = collections.map(collectionName => {
            const q = query(collection(db, collectionName));
            return onSnapshot(q, querySnapshot => {
                const data = querySnapshot.docs.map(doc => {
                    const docData = doc.data();
                    // Firestore Timestamps need to be converted
                    Object.keys(docData).forEach(key => {
                        if (docData[key]?.toDate) {
                            docData[key] = docData[key].toDate().toISOString();
                        }
                    });
                    
                    if (collectionName === 'folgas') return { ...docData, folgald: doc.id };
                    return { ...docData, id: doc.id };
                });
                setState(prevState => ({ ...prevState, [collectionName]: data }));
                setLoading(false);
            }, error => {
                console.error(`Error fetching ${collectionName}:`, error);
                setLoading(false);
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, []);
    
    const addAndPushNotifications = useCallback(async (notifications: Omit<Notificacao, 'id'>[]) => {
        if (!notifications || notifications.length === 0) return;
        const batch = writeBatch(db);
        notifications.forEach(notif => {
            const newNotifRef = doc(collection(db, 'notificacoes'));
            batch.set(newNotifRef, notif);
        });
        await batch.commit();

        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        notifications.forEach((n, i) => {
            registration.showNotification('Atualização SIGMA-E', {
                body: n.mensagem, icon: '/vite.svg', data: { url: n.link || '/dashboard' }, tag: `sigma-notif-${Date.now() + i}`
            });
        });
    }, []);

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
            trocadaPara: null, sargentoResponsavelld, criadoEm: new Date().toISOString()
        };
        const newFolgaRef = await addDoc(collection(db, "folgas"), newFolgaData);
        await addDoc(collection(db, "historico"), createHistorico(EventoHistorico.ACIONAR_FOLGA, currentUser, { folgald: newFolgaRef.id, policialld: policial.id, nome: policial.nome, re: policial.re, motivo: `Acionada: ${folgaData.motivo}`, antesDepois: { depois: newFolgaData } }));
        
        const sargento = state.users.find(u => u.id === sargentoResponsavelld);
        if(sargento){
            await addAndPushNotifications([{
                policialId: sargento.id,
                mensagem: `${policial.postoGrad} ${policial.nome} solicitou uma folga.`, lida: false,
                link: `/folgas?aprovacao=${Aprovacao.ENVIADA_SARGENTO}`, criadoEm: new Date().toISOString()
            }]);
        }
    }, [state.policiais, state.users, addAndPushNotifications]);

    const updateFolga = useCallback(async (folgald: string, updates: Partial<Folga>, currentUser: User) => {
        const folgaRef = doc(db, "folgas", folgald);
        await updateDoc(folgaRef, { ...updates, atualizadoEm: new Date().toISOString(), atualizadoPorld: currentUser.id });
        
        const updatedFolga = { ...state.folgas.find(f => f.folgald === folgald)!, ...updates };
        
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
    }, [state.folgas, state.users, addAndPushNotifications]);

    const addPolicial = useCallback(async (policialData: Omit<Policial, 'id'>, currentUser: User) => {
        const newDocRef = await addDoc(collection(db, "policiais"), policialData);
        await addDoc(collection(db, "historico"), createHistorico(EventoHistorico.CREATE_POLICIAL, currentUser, { policialld: newDocRef.id, antesDepois: { depois: policialData } }));
    }, []);

    const updatePolicial = useCallback(async (policialData: Policial, currentUser: User) => {
        const { id, ...data } = policialData;
        await updateDoc(doc(db, "policiais", id), data);
        await addDoc(collection(db, "historico"), createHistorico(EventoHistorico.UPDATE_POLICIAL, currentUser, { policialld: id }));
    }, []);
    
    const deletePolicial = useCallback(async (policialId: string, currentUser: User) => {
        await updateDoc(doc(db, "policiais", policialId), { ativo: false });
        await addDoc(collection(db, "historico"), createHistorico(EventoHistorico.DELETE_POLICIAL, currentUser, { policialld: policialId }));
    }, []);
    
    const bulkUpsertPoliciais = useCallback(async (policiaisData: (Omit<Policial, 'id'> & { re: string })[], currentUser: User) => {
        const batch = writeBatch(db);
        for (const policial of policiaisData) {
            const q = query(collection(db, 'policiais'), where('re', '==', policial.re));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                const newDocRef = doc(collection(db, 'policiais'));
                batch.set(newDocRef, policial);
            } else {
                batch.update(snapshot.docs[0].ref, policial);
            }
        }
        await batch.commit();
        await addDoc(collection(db, "historico"), createHistorico(EventoHistorico.BULK_UPSERT_POLICIAIS, currentUser, { motivo: `Importados/Atualizados: ${policiaisData.length}` }));
    }, []);
    
    const adminAddLeaveCredits = useCallback(async (opts: { policialId: string; year: number; delta: number; reason?: string }, currentUser: User) => {
        const entryData = { ...opts, createdAt: new Date().toISOString(), createdById: currentUser.id, createdByNome: currentUser.nome };
        await addDoc(collection(db, 'leaveLedger'), entryData);
    }, []);

    const addFerias = useCallback(async (feriasData: Omit<Ferias, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => {
        const newFeriasData = { ...feriasData, criadoPorId: currentUser.id, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
        await addDoc(collection(db, "ferias"), newFeriasData);
        await addDoc(collection(db, "historico"), createHistorico(EventoHistorico.CREATE_FERIAS, currentUser, { policialld: newFeriasData.policialId, antesDepois: { depois: newFeriasData } }));
    }, []);

    const updateFerias = useCallback(async (feriasId: string, updates: Partial<Ferias>, currentUser: User) => {
        await updateDoc(doc(db, "ferias", feriasId), { ...updates, atualizadoPorId: currentUser.id, atualizadoEm: new Date().toISOString() });
    }, []);

    const addAgendaEvento = useCallback(async (eventoData: Omit<AgendaEvento, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser: User) => {
        const newEventData = { ...eventoData, criadoPorId: currentUser.id, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
        const newDocRef = await addDoc(collection(db, "agendaEventos"), newEventData);
        const createdEvent = { ...newEventData, id: newDocRef.id };

        const userMap = new Map(state.users.map(u => [u.policialId, u]));
        // Fix: Explicitly type the mapped notification object to conform to Omit<Notificacao, 'id'>, resolving type predicate errors.
        const notifications: Omit<Notificacao, 'id'>[] = createdEvent.policiaisIds.map(policialId => {
            const user = userMap.get(policialId);
            if (!user) return null;
            const notif: Omit<Notificacao, 'id'> = {
                policialId: user.id,
                mensagem: `Você foi escalado para: "${createdEvent.titulo}" em ${new Date(createdEvent.data + 'T12:00:00').toLocaleDateString()}.`,
                lida: false, link: '/calendario', criadoEm: new Date().toISOString()
            };
            return notif;
        // Fix: Corrected the type predicate to properly filter out null values and satisfy TypeScript's type assignability rules.
        }).filter((n): n is Omit<Notificacao, 'id'> => n !== null);
        await addAndPushNotifications(notifications);
        return createdEvent;
    }, [addAndPushNotifications, state.users]);

    const updateAgendaEvento = useCallback(async (eventoId: string, updates: Partial<AgendaEvento>, currentUser: User) => {
        const original = state.agendaEventos.find(e => e.id === eventoId)!;
        const updatedData = { ...updates, atualizadoPorId: currentUser.id, atualizadoEm: new Date().toISOString() };
        await updateDoc(doc(db, "agendaEventos", eventoId), updatedData);
        const updatedEvent = { ...original, ...updatedData };
        
        const originalIds = new Set(original.policiaisIds);
        const addedPoliciais = (updatedEvent.policiaisIds || []).filter(id => !originalIds.has(id));
        if (addedPoliciais.length > 0) {
            const userMap = new Map(state.users.map(u => [u.policialId, u]));
            // Fix: Explicitly type the mapped notification object to conform to Omit<Notificacao, 'id'>, resolving type predicate errors.
            const notifications: Omit<Notificacao, 'id'>[] = addedPoliciais.map(policialId => {
                const user = userMap.get(policialId);
                if (!user) return null;
                const notif: Omit<Notificacao, 'id'> = {
                    policialId: user.id,
                    mensagem: `Você foi escalado para: "${updatedEvent.titulo}" em ${new Date(updatedEvent.data + 'T12:00:00').toLocaleDateString()}.`,
                    lida: false, link: '/calendario', criadoEm: new Date().toISOString()
                };
                return notif;
            // Fix: Corrected the type predicate to properly filter out null values and satisfy TypeScript's type assignability rules.
            }).filter((n): n is Omit<Notificacao, 'id'> => n !== null);
            await addAndPushNotifications(notifications);
        }
        return updatedEvent;
    }, [addAndPushNotifications, state.agendaEventos, state.users]);

    const deleteAgendaEvento = useCallback(async (eventoId: string, currentUser: User) => {
        await updateDoc(doc(db, "agendaEventos", eventoId), { policiaisIds: [] }); // Soft delete
    }, []);

    const markNotificacoesAsRead = useCallback(async (targetId: string) => {
        const q = query(collection(db, "notificacoes"), where("policialId", "==", targetId), where("lida", "==", false));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.update(d.ref, { lida: true }));
        await batch.commit();
    }, []);

    const addComentario = useCallback(async (folgald: string, mensagem: string, currentUser: User) => {
        if (!mensagem.trim()) return;
        const folga = state.folgas.find(f => f.folgald === folgald);
        if(!folga) return;
        
        await addDoc(collection(db, "comentarios"), { folgald, mensagem, actorId: currentUser.id, actorNome: currentUser.nome, actorPostoGrad: currentUser.postoGrad, timestamp: new Date().toISOString() });

        const sargento = state.users.find(u => u.role === 'SARGENTO' && u.pelotao === folga.pelotao && u.ativo);
        const userDoPolicial = state.users.find(u => u.policialId === folga.policialld);
        
        let targetUser: User | undefined, notifMessage = '';
        if (currentUser.role === 'SUBORDINADO' && sargento) { targetUser = sargento; notifMessage = `${currentUser.nome} comentou na folga de ${folga.nome}.`; }
        else if (currentUser.role === 'SARGENTO' && userDoPolicial) { targetUser = userDoPolicial; notifMessage = `Seu sargento comentou em sua folga.`; }
        if(targetUser) await addAndPushNotifications([{ policialId: targetUser.id, mensagem: notifMessage, lida: false, link: `/folgas`, criadoEm: new Date().toISOString() }]);
    }, [state.folgas, state.users, addAndPushNotifications]);

    const addGrupo = useCallback(async (nome: string, currentUser: User) => {
        await addDoc(collection(db, "grupos"), { nome });
    }, []);

    const updateGrupo = useCallback(async (grupo: Grupo, currentUser: User) => {
        const { id, ...data } = grupo;
        await updateDoc(doc(db, "grupos", id), data);
    }, []);

    const deleteGrupo = useCallback(async (id: string, currentUser: User) => {
        const isUsed = state.policiais.some(p => p.pelotao === state.grupos.find(g => g.id === id)?.nome);
        if (isUsed) throw new Error("Não é possível excluir um grupo que está em uso por policiais.");
        await updateDoc(doc(db, "grupos", id), { nome: `_DELETADO_${Date.now()}` }); // Soft delete
    }, [state.policiais, state.grupos]);

    const addProtocoloDoc = useCallback(async (docData: Omit<ProtocoloDocumento, 'id'|'numero'|'ano'|'sequencial'|'criadoEm'>, currentUser: User) => {
        const ano = new Date(docData.dataEmissao + 'T12:00:00').getFullYear();
        const anoCurto = String(ano).slice(-2);
        const counterRef = doc(db, 'metadata', `protocolo_${ano}`);
        let sequencial = 1;

        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            if (counterDoc.exists()) {
                sequencial = counterDoc.data().valor + 1;
            }
            transaction.set(counterRef, { valor: sequencial }, { merge: true });
        });
        
        const numero = `${String(sequencial).padStart(3, '0')}/${CODIGO_CIA}/${anoCurto}`;
        const newDocData = { ...docData, numero, ano, sequencial, criadoEm: new Date().toISOString() };
        const newDocRef = await addDoc(collection(db, "protocoloDocs"), newDocData);
        await addDoc(collection(db, "historico"), createHistorico(EventoHistorico.CREATE_PROTOCOLO, currentUser, { motivo: `Protocolado doc nº ${numero}`, antesDepois: { depois: newDocData }}));
        return { ...newDocData, id: newDocRef.id };
    }, []);

    const adminResetProtocoloCounter = useCallback(async (currentUser: User) => {
        const ano = new Date().getFullYear();
        const counterRef = doc(db, 'metadata', `protocolo_${ano}`);
        await updateDoc(counterRef, { valor: 0 });
    }, []);

    const value: DataContextType = {
        ...state, loading, addFolga, updateFolga, addPolicial, updatePolicial, deletePolicial, bulkUpsertPoliciais, adminAddLeaveCredits,
        getBalanceFor, getCreditsFor, countUsedFolgasFor, canRequestFolga, addFerias, updateFerias, addAgendaEvento, updateAgendaEvento,
        deleteAgendaEvento, markNotificacoesAsRead, addComentario, addGrupo, updateGrupo, deleteGrupo, addProtocoloDoc, adminResetProtocoloCounter,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
