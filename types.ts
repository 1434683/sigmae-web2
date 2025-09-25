export interface Policial {
  id: number;
  nome: string;
  re: string;
  postoGrad: string;
  ativo: boolean;
  pelotao: string;
}

export type UserRole = 'ADMIN' | 'SARGENTO' | 'SUBORDINADO';

export interface User {
  id: number;
  policialId: number | null; // Vínculo com o cadastro de policial
  nome: string;
  reLogin: string; // RE normalizado sem dígito (ex: "123456")
  role: UserRole;
  acessoLiberado: boolean; // Flag que controla se o usuário pode logar
  senha: string; // Em produção, isso seria um hash
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  // Fix: Add optional properties to User to hold related Policial info, resolving type errors.
  pelotao?: string;
  postoGrad?: string;
}

export enum Aprovacao {
  RASCUNHO = 'RASCUNHO',
  ENVIADA_SARGENTO = 'ENVIADA_SARGENTO',
  APROVADA_SARGENTO = 'APROVADA_SARGENTO',
  NEGADA_SARGENTO = 'NEGADA_SARGENTO',
  VALIDADA_ADMIN = 'VALIDADA_ADMIN',
  REPROVADA_ADMIN = 'REPROVADA_ADMIN',
}

export enum StatusFolga {
  ATIVA = 'ATIVA',
  TROCADA = 'TROCADA',
  EXCLUIDA = 'EXCLUIDA',
  CANCELADA = 'CANCELADA',
}

export interface Folga {
  folgald: string;
  policialld: number;
  nome: string;
  re: string;
  data: string; // YYYY-MM-DD
  status: StatusFolga;
  aprovacao: Aprovacao;
  // Workflow fields
  criadaPorld: number;
  sargentoResponsavelld?: number;
  sargentold?: number;
  adminld?: number;
  trocadaPara: string | null; // YYYY-MM-DD
  motivo: string | null;
  sargentoParecer?: string | null;
  adminParecer?: string | null;
  criadoEm: string; // ISO 8601
  atualizadoEm: string; // ISO 8601
  atualizadoPorld?: number;
  pelotao: string;

  // for frontend logic
  actionType?: 'aprovar' | 'negar';
}

export interface Comentario {
  id: string;
  folgald: string;
  actorId: number;
  actorNome: string;
  actorPostoGrad?: string;
  mensagem: string;
  timestamp: string; // ISO 8601
}

export enum EventoHistorico {
  CREATE_FOLGA = 'CREATE_FOLGA',
  ACIONAR_FOLGA = 'ACIONAR_FOLGA',
  ENVIAR_SARGENTO = 'ENVIAR_SARGENTO',
  APROVAR_SARGENTO = 'APROVAR_SARGENTO',
  NEGAR_SARGENTO = 'NEGAR_Sargento',
  VALIDAR_ADMIN = 'VALIDAR_ADMIN',
  REPROVAR_ADMIN = 'REPROVAR_ADMIN',
  TROCA_FOLGA = 'TROCA_FOLGA',
  EXCLUIR_FOLGA = 'EXCLUIR_FOLGA',
  RESTAURAR_FOLGA = 'RESTAURAR_FOLGA',
  CREATE_POLICIAL = 'CREATE_POLICIAL',
  UPDATE_POLICIAL = 'UPDATE_POLICIAL',
  DELETE_POLICIAL = 'DELETE_POLICIAL',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  BULK_UPSERT_POLICIAIS = 'BULK_UPSERT_POLICIAIS',
  CREATE_FERIAS = 'CREATE_FERIAS',
  UPDATE_FERIAS = 'UPDATE_FERIAS',
  CREATE_AGENDA_EVENTO = 'CREATE_AGENDA_EVENTO',
  UPDATE_AGENDA_EVENTO = 'UPDATE_AGENDA_EVENTO',
  DELETE_AGENDA_EVENTO = 'DELETE_AGENDA_EVENTO',
  CREATE_GRUPO = 'CREATE_GRUPO',
  UPDATE_GRUPO = 'UPDATE_GRUPO',
  DELETE_GRUPO = 'DELETE_GRUPO',
  CREATE_PROTOCOLO = 'CREATE_PROTOCOLO',
  RESET_PROTOCOLO_COUNTER = 'RESET_PROTOCOLO_COUNTER',
}

export interface Historico {
  id: number;
  evento: EventoHistorico;
  folgald?: string;
  policialld?: number;
  nome?: string;
  re?: string;
  dataOriginal: string | null; // YYYY-MM-DD
  dataNova: string | null; // YYYY-MM-DD
  motivo: string | null;
  antesDepois: Record<string, any> | null;
  actorId: number;
  actorNome: string;
  timestamp: string; // ISO 8601
  pelotao: string;
}

export type Year = number;

// Registra créditos de folga (auditoria)
export interface LeaveLedgerEntry {
  id: string;
  policialId: number;
  year: number; // ano civil (ex.: 2025)
  delta: number; // +N créditos, -N ajustes (ADM)
  reason?: string; // motivo do ajuste/crédito
  createdAt: string; // ISO
  createdById: number; // quem lançou (geralmente ADMIN)
  createdByNome: string;
}

export enum FeriasStatus {
  AGENDADA = 'AGENDADA',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
  SOLICITANDO_ALTERACAO = 'SOLICITANDO_ALTERACAO',
}

export interface Ferias {
  id: string;
  policialId: number;
  anoReferencia: number;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  duracaoDias: 15 | 30;
  status: FeriasStatus;
  observacao?: string;
  criadoEm: string; // ISO 8601
  criadoPorId: number;
  atualizadoEm: string; // ISO 8601
  atualizadoPorId?: number;
  // Frontend fields
  nome?: string;
  re?: string;
  pelotao?: string;
}

export enum TipoEvento {
  CURSO = 'CURSO',
  EAP = 'EAP',
  OPERACAO = 'OPERACAO',
  LICENCA_PREMIO = 'LICENCA_PREMIO',
  OUTRO = 'OUTRO',
}

export interface AgendaEvento {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFim: string; // HH:MM
  local: string;
  observacoes: string;
  policiaisIds: number[];
  criadoPorId: number;
  criadoEm: string; // ISO 8601
  atualizadoEm: string; // ISO 8601
  atualizadoPorId?: number;
}

export interface Notificacao {
  id: number;
  policialId: number;
  mensagem: string;
  lida: boolean;
  link?: string;
  criadoEm: string;
}

export interface Grupo {
  id: number;
  nome: string;
}

export enum TipoDoc {
  OFICIO = 'OFÍCIO',
  PARTE = 'PARTE',
  MEMORANDO = 'MEMORANDO',
  AESTORIGEM = 'AESTORIGEM',
  ATESTADO = 'ATESTADO',
  CERTIDAO = 'CERTIDÃO',
  DECLARACAO = 'DECLARAÇÃO',
  DESPACHO = 'DESPACHO',
  INFORMACAO = 'INFORMAÇÃO',
  ORDEM_SERVICO = 'ORDEM SERVIÇO',
  RELATORIO = 'RELATÓRIO',
  PTAC = 'PTAC',
  GUIA = 'GUIA',
  NOTA_SERVICO = 'NOTA SERVIÇO',
  EMAIL = 'E-MAIL',
  RAIA = 'RAIA',
  FMM = 'FMM',
  INVPRELIMINAR = 'INVPRELIMINAR',
}

export interface ProtocoloDocumento {
  id: string;
  numero: string; // "041 / 2025 / 2ª Cia PM"
  ano: number;
  sequencial: number;
  dataEmissao: string; // YYYY-MM-DD
  tipo: TipoDoc;
  destino: string;
  assunto: string;
  docReferencia: string;
  elaboradoPorId: number;
  elaboradoPorNome: string;
  interessadoRE: string;
  observacoes: string;
  vinculoId: string | null;
  criadoEm: string;
}