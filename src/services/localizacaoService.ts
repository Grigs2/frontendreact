import { api, API_ENDPOINTS } from './api';
import {
  AtualizarLocalizacaoDTO,
  ConsentimentoLocalizacaoDTO,
  EstadoConsentimentoLocalizacaoDTO,
  LocalizacaoViagemDTO,
  Page,
  RotaViagemDTO,
} from '../types';

/** Intervalo mínimo aceito pelo backend entre duas posições. */
export const INTERVALO_GPS_MS = 15000;
/** Após esse tempo sem posição nova o backend marca a localização como desatualizada. */
export const LIMITE_DESATUALIZADA_MS = 45000;
/** Prazo de retenção do histórico de posições no servidor. */
export const RETENCAO_GPS_DIAS = 7;

const toNumber = (value: unknown) => (typeof value === 'string' ? Number(value) : (value as number));

const normalizar = (dto: LocalizacaoViagemDTO): LocalizacaoViagemDTO => ({
  ...dto,
  latitude: toNumber(dto.latitude),
  longitude: toNumber(dto.longitude),
});

export const localizacaoService = {
  consentirMotorista: async (aceito: boolean): Promise<ConsentimentoLocalizacaoDTO> =>
    (await api.put(API_ENDPOINTS.consentimentoMotorista, { aceito })).data,

  consentirDependente: async (idDependente: number, aceito: boolean): Promise<ConsentimentoLocalizacaoDTO> =>
    (await api.put(API_ENDPOINTS.consentimentoDependente(idDependente), { aceito })).data,

  /** Se o responsável logado já autorizou ver a localização nas viagens deste aluno. */
  consentimentoDependente: async (idDependente: number): Promise<ConsentimentoLocalizacaoDTO> =>
    (await api.get(API_ENDPOINTS.consentimentoDependente(idDependente))).data,

  /** Rota e previsão de chegada. O motorista pode mandar a posição do aparelho para a rota sair dela. */
  rota: async (idViagemDia: number, posicao?: { latitude: number; longitude: number } | null): Promise<RotaViagemDTO> =>
    (await api.get(API_ENDPOINTS.rotaViagemDia(idViagemDia), { params: posicao ?? undefined })).data,

  estadoConsentimento: async (idViagemDia: number): Promise<EstadoConsentimentoLocalizacaoDTO> =>
    (await api.get(API_ENDPOINTS.consentimentoExecucao(idViagemDia))).data,

  enviarPosicao: async (dto: AtualizarLocalizacaoDTO): Promise<LocalizacaoViagemDTO> =>
    normalizar((await api.put(API_ENDPOINTS.atualizarLocalizacao, dto)).data),

  posicaoAtual: async (idViagemDia: number): Promise<LocalizacaoViagemDTO | null> => {
    const response = await api.get(API_ENDPOINTS.localizacaoAtual(idViagemDia));
    return response.data ? normalizar(response.data) : null;
  },

  /** Intervalo dentro dos últimos 7 dias; tamanho de 1 a 500. */
  historico: async (
    idViagemDia: number,
    inicio: Date,
    fim: Date,
    pagina = 0,
    tamanho = 100,
  ): Promise<Page<LocalizacaoViagemDTO>> => {
    const response = await api.get(API_ENDPOINTS.historicoLocalizacao(idViagemDia), {
      params: { inicio: inicio.toISOString(), fim: fim.toISOString(), pagina, tamanho },
    });
    const page = response.data as Page<LocalizacaoViagemDTO>;
    return { ...page, content: (page?.content ?? []).map(normalizar) };
  },
};
