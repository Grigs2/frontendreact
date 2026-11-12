import { api, API_ENDPOINTS } from './api';
import { CategoriaVinculoResponsavel, ConviteResponsavelDTO, VinculoResponsavelDTO } from '../types';

export const CATEGORIAS_VINCULO: { value: CategoriaVinculoResponsavel; label: string }[] = [
  { value: 'PAI', label: 'Pai' },
  { value: 'MAE', label: 'Mãe' },
  { value: 'RESPONSAVEL_LEGAL', label: 'Responsável legal' },
  { value: 'OUTRO', label: 'Outro' },
];

export const categoriaLabel = (categoria?: string | null) =>
  CATEGORIAS_VINCULO.find((c) => c.value === categoria)?.label ?? 'Responsável';

export const redeResponsaveisService = {
  /** Só o responsável criador convida; o convidado precisa ter conta de responsável. Expira em 7 dias. */
  convidar: async (
    idDependente: number,
    email: string,
    categoria: CategoriaVinculoResponsavel,
  ): Promise<ConviteResponsavelDTO> =>
    (await api.post(API_ENDPOINTS.convitesDependente(idDependente), { email: email.trim().toLowerCase(), categoria })).data,

  /** Convites recebidos pelo usuário autenticado. */
  pendentes: async (): Promise<ConviteResponsavelDTO[]> =>
    (await api.get(API_ENDPOINTS.convitesPendentes)).data ?? [],

  historicoConvites: async (idDependente: number): Promise<ConviteResponsavelDTO[]> =>
    (await api.get(API_ENDPOINTS.convitesDependente(idDependente))).data ?? [],

  responsaveis: async (idDependente: number): Promise<VinculoResponsavelDTO[]> =>
    (await api.get(API_ENDPOINTS.responsaveisDependente(idDependente))).data ?? [],

  aceitar: async (idConvite: number): Promise<ConviteResponsavelDTO> =>
    (await api.put(API_ENDPOINTS.responderConvite(idConvite, 'Aceitar'))).data,

  recusar: async (idConvite: number): Promise<ConviteResponsavelDTO> =>
    (await api.put(API_ENDPOINTS.responderConvite(idConvite, 'Recusar'))).data,

  revogar: async (idDependente: number, idResponsavel: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.revogarResponsavel(idDependente, idResponsavel));
  },
};
