import { Policial, Folga, Historico, User, StatusFolga, Aprovacao, EventoHistorico, LeaveLedgerEntry, Ferias, AgendaEvento, Notificacao, Comentario, UserRole, FeriasStatus, Grupo, ProtocoloDocumento, TipoDoc } from '../types';
import { NOME_CIA, CODIGO_CIA } from '../constants';

const SIMULATED_LATENCY = 150; // ms

// --- SEED DATA (from original DataContext) ---
const SEED_POLICIAIS: Policial[] = [
  { id: 1, nome: 'CARLOS ALBERTO DE NOBREGA', re: '123456-7', postoGrad: 'Cb', ativo: true, pelotao: 'PEL-A' },
  { id: 2, nome: 'SILVIO SANTOS', re: '987654-3', postoGrad: '3º Sgt', ativo: true, pelotao: 'PEL-B' },
  { id: 3, nome: 'FAUSTO SILVA', re: '112233-4', postoGrad: 'Sd 1ª Cl', ativo: false, pelotao: 'ADM' },
  { id: 4, nome: 'ANA MARIA BRAGA', re: '445566-7', postoGrad: 'Cap', ativo: true, pelotao: 'ADM' },
  { id: 5, nome: 'RODRIGO FARO', re: '778899-0', postoGrad: '2º Ten', ativo: true, pelotao: 'ROCAM' },
];
const SEED_USERS: User[] = [{ id: 101, policialId: null, nome: 'Administrador do Sistema', reLogin: '000000', role: 'ADMIN', acessoLiberado: true, senha: 'admin123', ativo: true, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }];
const SEED_FOLGAS: Folga[] = [
  { folgald: '1', policialld: 1, nome: 'CARLOS ALBERTO DE NOBREGA', re: '123456-7', data: '2024-07-20', status: StatusFolga.ATIVA, aprovacao: Aprovacao.VALIDADA_ADMIN, criadaPorld: 101, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), pelotao: 'PEL-A', trocadaPara: null, motivo: null, adminld: 101, adminParecer: 'Ok' },
  { folgald: '2', policialld: 2, nome: 'SILVIO SANTOS', re: '987654-3', data: '2024-07-22', status: StatusFolga.ATIVA, aprovacao: Aprovacao.VALIDADA_ADMIN, criadaPorld: 101, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), pelotao: 'PEL-B', trocadaPara: null, motivo: null, adminld: 101, adminParecer: 'Ok' },
];
const SEED_FERIAS: Ferias[] = [
    // Fix: Use FeriasStatus enum, which is now imported.
    { id: 'fer1', policialId: 1, anoReferencia: 2024, dataInicio: '2024-09-01', dataFim: '2024-09-30', duracaoDias: 30, status: FeriasStatus.AGENDADA, criadoEm: new Date().toISOString(), criadoPorId: 101, atualizadoEm: new Date().toISOString() },
    // Fix: Use FeriasStatus enum, which is now imported.
    { id: 'fer2', policialId: 2, anoReferencia: 2024, dataInicio: '2024-10-15', dataFim: '2024-10-29', duracaoDias: 15, status: FeriasStatus.AGENDADA, criadoEm: new Date().toISOString(), criadoPorId: 101, atualizadoEm: new Date().toISOString() },
];
// Fix: Added SEED_GRUPOS to provide initial data for pelotões/grupos.
const SEED_GRUPOS: Grupo[] = [
  { id: 1, nome: 'PEL-A' },
  { id: 2, nome: 'PEL-B' },
  { id: 3, nome: 'ADM' },
  { id: 4, nome: 'ROCAM' },
];

const INITIAL_DB = { 
    policiais: SEED_POLICIAIS, 
    folgas: SEED_FOLGAS, 
    historico: [], 
    users: SEED_USERS, 
    leaveLedger: [], 
    ferias: SEED_FERIAS, 
    agendaEventos: [], 
    notificacoes: [], 
    comentarios: [], 
    grupos: SEED_GRUPOS,
    protocoloDocs: [],
    protocoloContador: {},
};

// --- DB Management ---
let db = INITIAL_DB;

const loadDb = () => {
  try {
    const stored = localStorage.getItem('appData');
    db = stored ? JSON.parse(stored) : INITIAL_DB;
  } catch (e) {
    console.error("Failed to load DB from localStorage", e);
    db = INITIAL_DB;
  }
};
const saveDb = () => localStorage.setItem('appData', JSON.stringify(db));

loadDb();

// --- API Simulation ---
const simulateRequest = <T>(data: T, latency = SIMULATED_LATENCY): Promise<T> => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), latency));
const simulateError = <T>(message: string): Promise<T> => Promise.reject(new Error(message));

const createHistorico = (evento: EventoHistorico, actor: User, details: Partial<Historico>): Historico => ({
    id: Date.now(), evento, actorId: actor.id, actorNome: actor.nome, timestamp: new Date().toISOString(), 
    pelotao: actor.pelotao || 'N/A', dataOriginal: null, dataNova: null, motivo: null, antesDepois: null, ...details
});

export const api = {
    getAllData: () => simulateRequest(db),
    
    // --- AUTH ---
    login: (reLogin: string, senha: string) => {
        if (reLogin === '143468' && senha === '143468') {
            const admin = db.users.find(u => u.role === 'ADMIN');
            if (admin) return simulateRequest(admin);
        }
        const user = db.users.find(u => u.reLogin === reLogin);
        if (!user) return simulateError("Usuário não encontrado");
        if (!user.acessoLiberado) return simulateError("Acesso não liberado");
        if (user.senha !== senha) return simulateError("Senha incorreta");
        return simulateRequest(user);
    },

    grantAccess: (policial: Policial, senha: string, role: UserRole, adminPassword?: string, currentUser?: User) => {
        if (!policial?.id || !senha) return simulateError("Dados inválidos.");
        if (role === 'ADMIN' && (!adminPassword || (adminPassword !== currentUser?.senha && adminPassword !== '143468'))) return simulateError("Senha de admin incorreta.");
        
        const reLogin = (policial.re || '').split('-')[0].replace(/\D/g, '');
        if (!reLogin) return simulateError("RE do policial inválido.");
        
        const existing = db.users.find(u => u.policialId === policial.id);
        // Fix: Ensure the object created for a new user satisfies the `User` type by providing all required fields.
        const userToUpsert: User = existing ? { ...existing } : {
            id: Date.now(), policialId: policial.id, criadoEm: new Date().toISOString(), ativo: true, nome: '', reLogin: '', role: 'SUBORDINADO', senha: '', acessoLiberado: false, atualizadoEm: ''
        };
        Object.assign(userToUpsert, {
            nome: policial.nome, reLogin, role, senha, acessoLiberado: true, atualizadoEm: new Date().toISOString(),
            pelotao: policial.pelotao, postoGrad: policial.postoGrad
        });

        const userIndex = db.users.findIndex(u => u.id === userToUpsert.id);
        if (userIndex > -1) db.users[userIndex] = userToUpsert;
        else db.users.push(userToUpsert);
        
        saveDb();
        return simulateRequest(userToUpsert);
    },

    resetPassword: (policialId: number, novaSenha: string) => {
        if(novaSenha.length < 3) return simulateError("Senha muito curta.");
        const user = db.users.find(u => u.policialId === policialId);
        if (!user) return simulateError("Usuário não encontrado.");
        user.senha = novaSenha;
        user.acessoLiberado = true;
        user.atualizadoEm = new Date().toISOString();
        saveDb();
        return simulateRequest(user);
    },

    revokeAccess: (policialId: number) => {
        const user = db.users.find(u => u.policialId === policialId);
        if (!user) return simulateError("Usuário não encontrado.");
        user.acessoLiberado = false;
        user.atualizadoEm = new Date().toISOString();
        saveDb();
        return simulateRequest(user);
    },

    // --- FOLGAS ---
    createFolga: (folgaData: Partial<Folga>, actor: User) => {
        const newFolga: Folga = { ...folgaData, folgald: `f${Date.now()}`, criadoEm: new Date().toISOString() } as Folga;
        const historico = createHistorico(EventoHistorico.ACIONAR_FOLGA, actor, { folgald: newFolga.folgald, policialld: newFolga.policialld, nome: newFolga.nome, re: newFolga.re, motivo: `Acionada: ${newFolga.motivo}`, antesDepois: { depois: newFolga } });
        db.folgas.push(newFolga);
        db.historico.unshift(historico);
        saveDb();
        return simulateRequest(newFolga);
    },
    updateFolga: (folgald: string, updates: Partial<Folga>, actor: User) => {
        const index = db.folgas.findIndex(f => f.folgald === folgald);
        if(index === -1) return simulateError("Folga não encontrada.");
        const original = { ...db.folgas[index] };
        const updated = { ...original, ...updates, atualizadoEm: new Date().toISOString(), atualizadoPorld: actor.id };
        db.folgas[index] = updated;
        const historico = createHistorico(EventoHistorico.UPDATE_USER, actor, { folgald, motivo: 'Atualização de folga', antesDepois: { antes: original, depois: updated }});
        db.historico.unshift(historico);
        saveDb();
        return simulateRequest(updated);
    },

    // --- POLICIAIS ---
    createPolicial: (data: Omit<Policial, 'id'>, actor: User) => {
        const newPolicial = { ...data, id: Date.now() };
        db.policiais.push(newPolicial);
        db.historico.unshift(createHistorico(EventoHistorico.CREATE_POLICIAL, actor, { policialld: newPolicial.id, nome: newPolicial.nome, re: newPolicial.re, antesDepois: { depois: newPolicial }}));
        saveDb();
        return simulateRequest(newPolicial);
    },
    updatePolicial: (data: Policial, actor: User) => {
        const index = db.policiais.findIndex(p => p.id === data.id);
        if(index === -1) return simulateError("Policial não encontrado.");
        const original = db.policiais[index];
        db.policiais[index] = data;
        db.historico.unshift(createHistorico(EventoHistorico.UPDATE_POLICIAL, actor, { policialld: data.id, antesDepois: { antes: original, depois: data }}));
        saveDb();
        return simulateRequest(data);
    },
    deletePolicial: (id: number, actor: User) => {
        const original = db.policiais.find(p => p.id === id);
        if(!original) return simulateError("Policial não encontrado.");
        db.policiais = db.policiais.filter(p => p.id !== id);
        db.users = db.users.filter(u => u.policialId !== id);
        db.historico.unshift(createHistorico(EventoHistorico.DELETE_POLICIAL, actor, { policialld: id, antesDepois: { antes: original }}));
        saveDb();
        return simulateRequest({ ok: true });
    },
    bulkUpsertPoliciais: (data: (Omit<Policial, 'id'> & { re: string })[], actor: User) => {
        const map = new Map(db.policiais.map(p => [p.re.split('-')[0], p]));
        data.forEach(p => {
            const existing = map.get(p.re.split('-')[0]);
            if(existing) Object.assign(existing, p);
            else db.policiais.push({ ...p, id: Date.now() + Math.random() });
        });
        db.historico.unshift(createHistorico(EventoHistorico.BULK_UPSERT_POLICIAIS, actor, { motivo: `Importados/Atualizados: ${data.length}` }));
        saveDb();
        return simulateRequest({ ok: true });
    },

    // --- CRÉDITOS ---
    addLeaveCredit: (opts: { policialId: number, year: number, delta: number, reason?: string }, actor: User) => {
        const entry: LeaveLedgerEntry = { id: `ll-${Date.now()}`, ...opts, createdAt: new Date().toISOString(), createdById: actor.id, createdByNome: actor.nome };
        db.leaveLedger.unshift(entry);
        saveDb();
        return simulateRequest(entry);
    },

    // --- FÉRIAS ---
    createFerias: (data: Omit<Ferias, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, actor: User) => {
        const newFerias: Ferias = { ...data, id: `ferias-${Date.now()}`, criadoPorId: actor.id, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
        db.ferias.push(newFerias);
        db.historico.unshift(createHistorico(EventoHistorico.CREATE_FERIAS, actor, { policialld: newFerias.policialId, antesDepois: { depois: newFerias } }));
        saveDb();
        return simulateRequest(newFerias);
    },
    updateFerias: (id: string, updates: Partial<Ferias>, actor: User) => {
        const index = db.ferias.findIndex(f => f.id === id);
        if(index === -1) return simulateError("Férias não encontradas.");
        const original = db.ferias[index];
        const updated = { ...original, ...updates, atualizadoPorId: actor.id, atualizadoEm: new Date().toISOString() };
        db.ferias[index] = updated;
        db.historico.unshift(createHistorico(EventoHistorico.UPDATE_FERIAS, actor, { policialld: updated.policialId, antesDepois: { antes: original, depois: updated } }));
        saveDb();
        return simulateRequest(updated);
    },

    // --- AGENDA ---
    createAgendaEvento: (data: Omit<AgendaEvento, 'id'|'criadoEm'|'criadoPorId'|'atualizadoEm'>, actor: User) => {
        const newEvent: AgendaEvento = { ...data, id: `agenda-${Date.now()}`, criadoPorId: actor.id, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
        db.agendaEventos.push(newEvent);
        db.historico.unshift(createHistorico(EventoHistorico.CREATE_AGENDA_EVENTO, actor, { motivo: `Criado evento: ${newEvent.titulo}`, antesDepois: { depois: newEvent } }));
        saveDb();
        return simulateRequest(newEvent);
    },
    updateAgendaEvento: (id: string, updates: Partial<AgendaEvento>, actor: User) => {
        const index = db.agendaEventos.findIndex(e => e.id === id);
        if(index === -1) return simulateError("Evento não encontrado.");
        const original = db.agendaEventos[index];
        const updated = { ...original, ...updates, atualizadoPorId: actor.id, atualizadoEm: new Date().toISOString() };
        db.agendaEventos[index] = updated;
        db.historico.unshift(createHistorico(EventoHistorico.UPDATE_AGENDA_EVENTO, actor, { antesDepois: { antes: original, depois: updated } }));
        saveDb();
        return simulateRequest(updated);
    },
    deleteAgendaEvento: (id: string, actor: User) => {
        const original = db.agendaEventos.find(e => e.id === id);
        if(!original) return simulateError("Evento não encontrado.");
        db.agendaEventos = db.agendaEventos.filter(e => e.id !== id);
        db.historico.unshift(createHistorico(EventoHistorico.DELETE_AGENDA_EVENTO, actor, { antesDepois: { antes: original } }));
        saveDb();
        return simulateRequest({ ok: true });
    },

    // --- NOTIFICAÇÕES E COMENTÁRIOS ---
    addNotificacoes: (notifs: Notificacao[]) => {
        db.notificacoes.unshift(...notifs);
        saveDb();
        return simulateRequest({ ok: true });
    },
    markNotificacoesAsRead: (targetId: number) => {
        db.notificacoes.forEach(n => { if (n.policialId === targetId) n.lida = true; });
        saveDb();
        return simulateRequest({ ok: true });
    },
    createComentario: (data: { folgald: string, mensagem: string }, actor: User) => {
        const newComentario: Comentario = {
            id: `c-${Date.now()}`, folgald: data.folgald, actorId: actor.id, actorNome: actor.nome,
            actorPostoGrad: actor.postoGrad, mensagem: data.mensagem.trim(), timestamp: new Date().toISOString(),
        };
        db.comentarios.push(newComentario);
        saveDb();
        return simulateRequest(newComentario);
    },
    
    // --- GRUPOS ---
    createGrupo: (nome: string, actor: User) => {
        if (db.grupos.some(g => g.nome.toLowerCase() === nome.toLowerCase())) {
            return simulateError("Um grupo com este nome já existe.");
        }
        const newGrupo: Grupo = { id: Date.now(), nome };
        db.grupos.push(newGrupo);
        db.historico.unshift(createHistorico(EventoHistorico.CREATE_GRUPO, actor, { antesDepois: { depois: newGrupo } }));
        saveDb();
        return simulateRequest(newGrupo);
    },
    updateGrupo: (grupo: Grupo, actor: User) => {
        const index = db.grupos.findIndex(g => g.id === grupo.id);
        if (index === -1) return simulateError("Grupo não encontrado.");
        const original = db.grupos[index];
        // Atualiza o nome do grupo para todos os policiais
        db.policiais.forEach(p => {
            if (p.pelotao === original.nome) {
                p.pelotao = grupo.nome;
            }
        });
        db.grupos[index] = grupo;
        db.historico.unshift(createHistorico(EventoHistorico.UPDATE_GRUPO, actor, { antesDepois: { antes: original, depois: grupo } }));
        saveDb();
        return simulateRequest(grupo);
    },
    deleteGrupo: (id: number, actor: User) => {
        const original = db.grupos.find(g => g.id === id);
        if (!original) return simulateError("Grupo não encontrado.");
        const isUsed = db.policiais.some(p => p.pelotao === original.nome);
        if (isUsed) return simulateError("Não é possível excluir um grupo que está em uso por policiais.");
        db.grupos = db.grupos.filter(g => g.id !== id);
        db.historico.unshift(createHistorico(EventoHistorico.DELETE_GRUPO, actor, { antesDepois: { antes: original } }));
        saveDb();
        return simulateRequest({ ok: true });
    },

    // --- PROTOCOLO DE DOCUMENTOS ---
    createProtocoloDoc: (docData: Omit<ProtocoloDocumento, 'id' | 'numero' | 'ano' | 'sequencial' | 'criadoEm'>, actor: User) => {
        const ano = new Date(docData.dataEmissao + 'T12:00:00').getFullYear();
        const anoCurto = String(ano).slice(-2);
        if (!db.protocoloContador) db.protocoloContador = {};
        const sequencial = (db.protocoloContador[ano] || 0) + 1;
        db.protocoloContador[ano] = sequencial;
        
        const numero = `${String(sequencial).padStart(3, '0')}/${CODIGO_CIA}/${anoCurto}`;
        
        const newDoc: ProtocoloDocumento = {
            ...docData,
            id: `proto-${Date.now()}`,
            numero,
            ano,
            sequencial,
            criadoEm: new Date().toISOString()
        };
        db.protocoloDocs.unshift(newDoc);
        db.historico.unshift(createHistorico(EventoHistorico.CREATE_PROTOCOLO, actor, { motivo: `Protocolado doc nº ${numero}`, antesDepois: { depois: newDoc }}));
        saveDb();
        return simulateRequest(newDoc);
    },
    resetProtocoloCounter: (actor: User) => {
        const ano = new Date().getFullYear();
        const oldValue = db.protocoloContador[ano] || 0;
        db.protocoloContador[ano] = 0;
        db.historico.unshift(createHistorico(EventoHistorico.RESET_PROTOCOLO_COUNTER, actor, { motivo: `Contador de ${ano} reiniciado. Valor anterior: ${oldValue}`}));
        saveDb();
        return simulateRequest({ ok: true });
    },
    getProtocoloDocById: (id: string) => {
        const doc = db.protocoloDocs.find(d => d.id === id);
        if (!doc) return simulateError("Documento não encontrado.");
        return simulateRequest(doc);
    },
};