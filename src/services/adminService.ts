import { api, API_ENDPOINTS } from './api';
import {
  AdminAuditoriaDTO,
  AdminEscolaResumoDTO,
  AdminUsuarioResumoDTO,
  AdminVinculoMotoristaEscolaDTO,
  AdminVinculoResponsavelDTO,
  DependenteResponsavelCriadorPendenteDTO,
  DocumentoMotoristaDTO,
  Page,
  StatusDocumento,
  StatusVinculoEscola,
} from '../types';

export const TAMANHO_PAGINA_ADMIN = 20;

/** Remove filtros vazios para não enviar parâmetros em branco. */
const limpar = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

const pagina = <T,>(data: Page<T> | undefined): Page<T> => ({
  content: data?.content ?? [],
  totalElements: data?.totalElements ?? 0,
  totalPages: data?.totalPages ?? 0,
  number: data?.number ?? 0,
  size: data?.size ?? TAMANHO_PAGINA_ADMIN,
});

export const adminService = {
  documentosPendentes: async (): Promise<DocumentoMotoristaDTO[]> =>
    (await api.get(API_ENDPOINTS.adminDocumentosPendentes)).data ?? [],

  revisarDocumento: async (
    id: number,
    status: Extract<StatusDocumento, 'APROVADO' | 'RECUSADO'>,
    motivoRecusa?: string,
  ): Promise<DocumentoMotoristaDTO> =>
    (await api.put(API_ENDPOINTS.adminRevisarDocumento(id), { status, motivoRecusa: motivoRecusa?.trim() || null })).data,

  criadorPendentes: async (): Promise<DependenteResponsavelCriadorPendenteDTO[]> =>
    (await api.get(API_ENDPOINTS.adminCriadorPendentes)).data ?? [],

  atribuirCriador: async (idDependente: number, responsavelId: number): Promise<void> => {
    await api.put(API_ENDPOINTS.adminAtribuirCriador(idDependente), { responsavelId });
  },

  usuarios: async (filtro: {
    id?: number;
    tipoPerfil?: string;
    email?: string;
    suspensa?: boolean;
    pagina?: number;
  }): Promise<Page<AdminUsuarioResumoDTO>> =>
    pagina((await api.get(API_ENDPOINTS.adminUsuarios, {
      params: limpar({ ...filtro, email: filtro.email?.trim().toLowerCase(), tamanho: TAMANHO_PAGINA_ADMIN }),
    })).data),

  escolas: async (filtro: { nome?: string; cnpj?: string; suspensa?: boolean; pagina?: number }): Promise<Page<AdminEscolaResumoDTO>> =>
    pagina((await api.get(API_ENDPOINTS.adminEscolas, {
      params: limpar({ ...filtro, nome: filtro.nome?.trim(), tamanho: TAMANHO_PAGINA_ADMIN }),
    })).data),

  vinculosMotoristaEscola: async (filtro: {
    escolaId?: number;
    motoristaId?: number;
    status?: StatusVinculoEscola;
    pagina?: number;
  }): Promise<Page<AdminVinculoMotoristaEscolaDTO>> =>
    pagina((await api.get(API_ENDPOINTS.adminVinculosMotoristaEscola, {
      params: limpar({ ...filtro, tamanho: TAMANHO_PAGINA_ADMIN }),
    })).data),

  vinculosResponsavel: async (filtro: {
    dependenteId?: number;
    responsavelId?: number;
    pagina?: number;
  }): Promise<Page<AdminVinculoResponsavelDTO>> =>
    pagina((await api.get(API_ENDPOINTS.adminVinculosResponsavel, {
      params: limpar({ ...filtro, tamanho: TAMANHO_PAGINA_ADMIN }),
    })).data),

  auditoria: async (filtro: {
    atorId?: number;
    acao?: string;
    tipoAlvo?: string;
    alvoId?: number;
    inicio?: Date;
    fim?: Date;
    pagina?: number;
  }): Promise<Page<AdminAuditoriaDTO>> =>
    pagina((await api.get(API_ENDPOINTS.adminAuditoria, {
      params: limpar({
        ...filtro,
        acao: filtro.acao?.trim(),
        tipoAlvo: filtro.tipoAlvo?.trim(),
        inicio: filtro.inicio?.toISOString(),
        fim: filtro.fim?.toISOString(),
        tamanho: TAMANHO_PAGINA_ADMIN,
      }),
    })).data),

  /** Motivo obrigatório (máx. 1000). Revoga as sessões de refresh do usuário. */
  suspender: async (idUsuario: number, motivo: string): Promise<void> => {
    await api.put(API_ENDPOINTS.adminSuspender(idUsuario), { motivo: motivo.trim() });
  },

  reativar: async (idUsuario: number, motivo?: string): Promise<void> => {
    await api.put(API_ENDPOINTS.adminReativar(idUsuario), motivo?.trim() ? { motivo: motivo.trim() } : {});
  },
};
