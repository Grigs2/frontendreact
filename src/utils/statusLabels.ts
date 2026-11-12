import { StatusTone } from '../theme';

// Rótulos e tons de selo para todos os status do domínio (guia visual, seção 5).
// Use sempre statusInfo(...) para manter o mesmo texto e a mesma cor em todas as telas.

export interface StatusInfo {
  label: string;
  tone: StatusTone;
}

const VIAGEM_DIA: Record<string, StatusInfo> = {
  PLANEJADA: { label: 'Programada', tone: 'neutral' },
  EM_ANDAMENTO: { label: 'Em andamento', tone: 'info' },
  FINALIZADA: { label: 'Concluída', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'neutral' },
  INTERROMPIDA: { label: 'Interrompida', tone: 'danger' },
};

const PRESENCA: Record<string, StatusInfo> = {
  ESPERANDO: { label: 'Aguardando', tone: 'neutral' },
  EMBARCADO: { label: 'Embarcou', tone: 'success' },
  DESEMBARCADO: { label: 'Desembarcou', tone: 'info' },
  FALTOU: { label: 'Ausente', tone: 'danger' },
};

const DOCUMENTO: Record<string, StatusInfo> = {
  PENDENTE: { label: 'Em análise', tone: 'warning' },
  APROVADO: { label: 'Aprovado', tone: 'success' },
  RECUSADO: { label: 'Recusado', tone: 'danger' },
  VENCIDO: { label: 'Vencido', tone: 'danger' },
};

const VINCULO_ESCOLA: Record<string, StatusInfo> = {
  PENDENTE_ESCOLA: { label: 'Aguardando a escola', tone: 'warning' },
  PENDENTE_MOTORISTA: { label: 'Aguardando o motorista', tone: 'warning' },
  ATIVO: { label: 'Ativo', tone: 'success' },
  SUSPENSO: { label: 'Suspenso', tone: 'danger' },
  RECUSADO: { label: 'Recusado', tone: 'neutral' },
  ENCERRADO: { label: 'Encerrado', tone: 'neutral' },
};

const SOLICITACAO: Record<string, StatusInfo> = {
  PENDENTE: { label: 'Pendente', tone: 'warning' },
  ACEITA: { label: 'Aceito', tone: 'success' },
  ACEITO: { label: 'Aceito', tone: 'success' },
  RECUSADA: { label: 'Recusado', tone: 'neutral' },
  RECUSADO: { label: 'Recusado', tone: 'neutral' },
  EXPIRADA: { label: 'Expirado', tone: 'neutral' },
  EXPIRADO: { label: 'Expirado', tone: 'neutral' },
  REVOGADO: { label: 'Revogado', tone: 'neutral' },
};

const SINCRONIZACAO: Record<string, StatusInfo> = {
  PENDENTE: { label: 'Salvo no aparelho', tone: 'warning' },
  APLICADO: { label: 'Enviado', tone: 'success' },
  DUPLICADO: { label: 'Enviado', tone: 'success' },
  CONFLITO: { label: 'Não aplicado', tone: 'danger' },
  REJEITADO: { label: 'Não aplicado', tone: 'danger' },
};

const DOMINIOS = {
  viagemDia: VIAGEM_DIA,
  presenca: PRESENCA,
  documento: DOCUMENTO,
  vinculoEscola: VINCULO_ESCOLA,
  solicitacao: SOLICITACAO,
  sincronizacao: SINCRONIZACAO,
} as const;

export type DominioStatus = keyof typeof DOMINIOS;

const humanize = (value: string) => {
  const text = value.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const statusInfo = (dominio: DominioStatus, status?: string | null): StatusInfo => {
  if (!status) return { label: '—', tone: 'neutral' };
  return DOMINIOS[dominio][status] ?? { label: humanize(status), tone: 'neutral' };
};

/** Estado exibido de uma execução: separa "Pronta para iniciar" e "Com pendências" do PLANEJADA. */
export const statusExecucao = (
  status: string | null | undefined,
  opts: { materializada?: boolean; pronta?: boolean | null } = {},
): StatusInfo => {
  if (!status || opts.materializada === false) return { label: 'Não preparada', tone: 'neutral' };
  if (status === 'PLANEJADA') {
    if (opts.pronta === true) return { label: 'Pronta para iniciar', tone: 'warning' };
    if (opts.pronta === false) return { label: 'Com pendências', tone: 'danger' };
  }
  return statusInfo('viagemDia', status);
};

export const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  CNH: 'CNH',
  VISTORIA: 'Vistoria do veículo',
  LICENCIAMENTO: 'Licenciamento (CRLV)',
};

export const PERFIL_LABEL: Record<string, string> = {
  MOTORISTA: 'Motorista',
  RESPONSAVEL: 'Responsável',
  ESCOLA: 'Escola',
  ADMIN: 'Administrador',
};
