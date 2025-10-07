import { StatusFolga, Aprovacao, FeriasStatus, TipoEvento, TipoDoc } from './types';

export const POSTOS_GRADS = ['Sd 2ª Cl', 'Sd 1ª Cl', 'Cb', '3º Sgt', '2º Sgt', '1º Sgt', 'Subten', '2º Ten', '1º Ten', 'Cap', 'Maj'];

export const STATUS_COLORS: Record<StatusFolga, string> = {
  [StatusFolga.ATIVA]: 'bg-green-100 text-green-800',
  [StatusFolga.TROCADA]: 'bg-yellow-100 text-yellow-800',
  [StatusFolga.EXCLUIDA]: 'bg-red-100 text-red-800',
  [StatusFolga.CANCELADA]: 'bg-gray-100 text-gray-800',
};

export const APROVACAO_COLORS: Record<Aprovacao, string> = {
  [Aprovacao.RASCUNHO]: 'bg-gray-200 text-gray-800',
  [Aprovacao.ENVIADA_SARGENTO]: 'bg-blue-100 text-blue-800',
  [Aprovacao.APROVADA_SARGENTO]: 'bg-cyan-100 text-cyan-800',
  [Aprovacao.NEGADA_SARGENTO]: 'bg-orange-100 text-orange-800',
  [Aprovacao.VALIDADA_ADMIN]: 'bg-green-100 text-green-800',
  [Aprovacao.REPROVADA_ADMIN]: 'bg-red-100 text-red-800',
};

export const APROVACAO_LABELS: Record<Aprovacao, string> = {
  [Aprovacao.RASCUNHO]: 'Rascunho',
  [Aprovacao.ENVIADA_SARGENTO]: 'Pendente Sgt.',
  [Aprovacao.APROVADA_SARGENTO]: 'Aprovada Sgt.',
  [Aprovacao.NEGADA_SARGENTO]: 'Negada Sgt.',
  [Aprovacao.VALIDADA_ADMIN]: 'Validada Adm.',
  [Aprovacao.REPROVADA_ADMIN]: 'Reprovada Adm.',
};

export const STATUS_OPTIONS = [
  { value: StatusFolga.ATIVA, label: 'Ativa' },
  { value: StatusFolga.TROCADA, label: 'Trocada' },
  { value: StatusFolga.EXCLUIDA, label: 'Excluída' },
];

export const FERIAS_STATUS_COLORS: Record<FeriasStatus, string> = {
    [FeriasStatus.AGENDADA]: 'bg-green-100 text-green-800',
    [FeriasStatus.CONCLUIDA]: 'bg-blue-100 text-blue-800',
    [FeriasStatus.CANCELADA]: 'bg-red-100 text-red-800',
    [FeriasStatus.SOLICITANDO_ALTERACAO]: 'bg-yellow-100 text-yellow-800',
};

export const FERIAS_STATUS_LABELS: Record<FeriasStatus, string> = {
    [FeriasStatus.AGENDADA]: 'Agendada',
    [FeriasStatus.CONCLUIDA]: 'Concluída',
    [FeriasStatus.CANCELADA]: 'Cancelada',
    [FeriasStatus.SOLICITANDO_ALTERACAO]: 'Solicitando Alteração',
};

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
    [TipoEvento.CURSO]: 'Curso',
    [TipoEvento.EAP]: 'EAP',
    [TipoEvento.OPERACAO]: 'Operação',
    [TipoEvento.LICENCA_PREMIO]: 'Licença Prêmio',
    [TipoEvento.OUTRO]: 'Outro',
};

export const TIPO_EVENTO_COLORS: Record<TipoEvento, string> = {
    [TipoEvento.CURSO]: 'bg-indigo-100 text-indigo-800',
    [TipoEvento.EAP]: 'bg-purple-100 text-purple-800',
    [TipoEvento.OPERACAO]: 'bg-red-100 text-red-800',
    [TipoEvento.LICENCA_PREMIO]: 'bg-teal-100 text-teal-800',
    [TipoEvento.OUTRO]: 'bg-gray-200 text-gray-800',
};


export const DEFAULT_UPDATED_BY = "14º BPM/M - 2ª CIA";

export const NOME_CIA = "2ª Cia PM";
export const CODIGO_CIA = "200";

export const TIPOS_DOCUMENTO: TipoDoc[] = [
  TipoDoc.OFICIO,
  TipoDoc.PARTE,
  TipoDoc.MEMORANDO,
  TipoDoc.AESTORIGEM,
  TipoDoc.ATESTADO,
  TipoDoc.CERTIDAO,
  TipoDoc.DECLARACAO,
  TipoDoc.DESPACHO,
  TipoDoc.INFORMACAO,
  TipoDoc.ORDEM_SERVICO,
  TipoDoc.RELATORIO,
  TipoDoc.PTAC,
  TipoDoc.GUIA,
  TipoDoc.NOTA_SERVICO,
  TipoDoc.EMAIL,
  TipoDoc.RAIA,
  TipoDoc.FMM,
  TipoDoc.INVPRELIMINAR,
];