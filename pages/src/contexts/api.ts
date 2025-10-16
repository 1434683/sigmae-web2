// src/contexts/api.ts
import { supabase } from '../lib/supabase';
import type {
  Policial, Folga, Historico, User, LeaveLedgerEntry, Ferias,
  AgendaEvento, Notificacao, Comentario, Grupo, ProtocoloDocumento
} from '../types';

// NOME DA TABELA NO SUPABASE
const TBL_POLICIAIS = 'policiais';

// -----------------------
// POLICIAIS (Supabase)
// -----------------------
async function sbGetPoliciais(): Promise<Policial[]> {
  const { data, error } = await supabase
    .from(TBL_POLICIAIS)
    .select('*')
    .order('nome', { ascending: true });
  if (error) throw new Error(error.message);
  // data vem como any[]; garantimos tipos
  return (data || []) as Policial[];
}

async function sbCreatePolicial(p: Omit<Policial, 'id'>, _currentUser?: User): Promise<void> {
  const row = { ...p, id: Date.now() }; // mesmo padrão do seu front
  const { error } = await supabase.from(TBL_POLICIAIS).insert(row);
  if (error) throw new Error(error.message);
}

async function sbUpdatePolicial(p: Policial, _currentUser?: User): Promise<void> {
  const { id, ...patch } = p;
  const { error } = await supabase.from(TBL_POLICIAIS).update(patch).eq('id', Number(id));
  if (error) throw new Error(error.message);
}

async function sbDeletePolicial(policialId: string, _currentUser?: User): Promise<void> {
  const { error } = await supabase.from(TBL_POLICIAIS).delete().eq('id', Number(policialId));
  if (error) throw new Error(error.message);
}

async function sbBulkUpsertPoliciais(lista: (Omit<Policial, 'id'> & { re: string })[], _currentUser?: User): Promise<void> {
  // gera IDs no cliente (compatível com seu front)
  const rows = lista.map((p) => ({ ...p, id: Date.now() + Math.floor(Math.random() * 100000) }));
  const { error } = await supabase
    .from(TBL_POLICIAIS)
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
  if (error) throw new Error(error.message);
}

// -----------------------
// API PÚBLICA USADA PELO DataContext
// -----------------------
export const api = {
  // chamado no DataContext para carregar tudo
  async getAllData(): Promise<{
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
  }> {
    const policiais = await sbGetPoliciais();
    // o resto fica vazio por enquanto (não quebra a UI)
    return {
      policiais,
      folgas: [],
      historico: [],
      users: [],
      leaveLedger: [],
      ferias: [],
      agendaEventos: [],
      notificacoes: [],
      comentarios: [],
      grupos: [],
      protocoloDocs: [],
    };
  },

  // === POLICIAIS ===
  async createPolicial(p: Omit<Policial, 'id'>, currentUser: User) {
    await sbCreatePolicial(p, currentUser);
  },
  async updatePolicial(p: Policial, currentUser: User) {
    await sbUpdatePolicial(p, currentUser);
  },
  async deletePolicial(policialId: string, currentUser: User) {
    await sbDeletePolicial(policialId, currentUser);
  },
  async bulkUpsertPoliciais(lista: (Omit<Policial, 'id'> & { re: string })[], currentUser: User) {
    await sbBulkUpsertPoliciais(lista, currentUser);
  },

  // === STUBS (a implementar depois, se/quando usar as telas) ===
  async addNotificacoes(_n: Omit<Notificacao,'id'>[]) { /* noop */ },
  async createFolga(_d: any, _u: User) { /* noop */ },
  async updateFolga(_id: string, _u: any, _cu: User) { return Promise.resolve({} as any); },
  async addLeaveCredit(_opts: any, _cu: User) { /* noop */ },
  async createFerias(_d: any, _cu: User) { /* noop */ },
  async updateFerias(_id: string, _u: any, _cu: User) { /* noop */ },
  async createAgendaEvento(_d: any, _cu: User) { return Promise.resolve({} as any); },
  async updateAgendaEvento(_id: string, _u: any, _cu: User) { return Promise.resolve({} as any); },
  async deleteAgendaEvento(_id: string, _cu: User) { /* noop */ },
  async markNotificacoesAsRead(_targetId: string) { /* noop */ },
  async createComentario(_d: any, _cu: User) { /* noop */ },
  async createGrupo(_nome: string, _cu: User) { /* noop */ },
  async updateGrupo(_g: Grupo, _cu: User) { /* noop */ },
  async deleteGrupo(_id: string, _cu: User) { /* noop */ },
  async createProtocoloDoc(_d: any, _cu: User) { return Promise.resolve({} as any); },
  async resetProtocoloCounter(_cu: User) { /* noop */ },

  // Se seu AuthContext usa api.login/grantAccess/etc, você pode manter stubs temporários:
  async login(_re: string, _senha: string) { return Promise.resolve({ id: '1', nome: 'Admin', role: 'ADMIN' } as unknown as User); },
  async grantAccess() { return Promise.resolve(); },
  async resetPassword() { return Promise.resolve(); },
  async revokeAccess() { return Promise.resolve(); },
};
