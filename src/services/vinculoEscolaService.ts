import { api, API_ENDPOINTS } from './api';
import { HistoricoVinculoEscolaDTO, MotoristaBuscaDTO, StatusVinculoEscola, VinculoEscolaDTO } from '../types';

/** Motivo é opcional ao aprovar/aceitar/reativar e obrigatório ao recusar/suspender/encerrar (máx. 500). */
const corpoMotivo = (motivo?: string) => (motivo?.trim() ? { motivo: motivo.trim() } : {});

export const MOTIVO_VINCULO_MAX = 500;

export const VINCULOS_ATIVOS: StatusVinculoEscola[] = ['ATIVO', 'SUSPENSO'];
export const VINCULOS_PENDENTES: StatusVinculoEscola[] = ['PENDENTE_ESCOLA', 'PENDENTE_MOTORISTA'];
export const VINCULOS_ENCERRADOS: StatusVinculoEscola[] = ['RECUSADO', 'ENCERRADO'];

export const vinculoEscolaService = {
  // ---- Motorista ----
  solicitar: async (cnpj: string): Promise<VinculoEscolaDTO> =>
    (await api.post(API_ENDPOINTS.solicitarVinculoEscola, { cnpj })).data,

  listarMotorista: async (): Promise<VinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.vinculosMotorista)).data ?? [],

  /** Convites da escola aguardando a resposta do motorista. */
  pendentesMotorista: async (): Promise<VinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.vinculosMotoristaPendentes)).data ?? [],

  historicoMotorista: async (id: number): Promise<HistoricoVinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.historicoVinculoMotorista(id))).data ?? [],

  aceitar: async (id: number, motivo?: string): Promise<VinculoEscolaDTO> =>
    (await api.post(API_ENDPOINTS.acaoVinculoMotorista(id, 'Aceitar'), corpoMotivo(motivo))).data,

  recusarMotorista: async (id: number, motivo: string): Promise<VinculoEscolaDTO> =>
    (await api.post(API_ENDPOINTS.acaoVinculoMotorista(id, 'Recusar'), corpoMotivo(motivo))).data,

  encerrarMotorista: async (id: number, motivo: string): Promise<VinculoEscolaDTO> =>
    (await api.post(API_ENDPOINTS.acaoVinculoMotorista(id, 'Encerrar'), corpoMotivo(motivo))).data,

  // ---- Escola ----
  /** Correspondência exata por e-mail OU CPF; devolve só id e nome. */
  buscarMotorista: async (filtro: { email: string } | { cpf: string }): Promise<MotoristaBuscaDTO[]> =>
    (await api.post(API_ENDPOINTS.buscarMotoristaEscola, filtro)).data ?? [],

  convidar: async (motoristaId: number): Promise<VinculoEscolaDTO> =>
    (await api.post(API_ENDPOINTS.vinculosEscola, { motoristaId })).data,

  listarEscola: async (): Promise<VinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.vinculosEscola)).data ?? [],

  pendentesEscola: async (): Promise<VinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.vinculosEscolaPendentes)).data ?? [],

  historicoEscola: async (id: number): Promise<HistoricoVinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.historicoVinculoEscola(id))).data ?? [],

  acaoEscola: async (
    id: number,
    acao: 'Aprovar' | 'Recusar' | 'Suspender' | 'Reativar' | 'Encerrar',
    motivo?: string,
  ): Promise<VinculoEscolaDTO> => (await api.post(API_ENDPOINTS.acaoVinculoEscola(id, acao), corpoMotivo(motivo))).data,
};
