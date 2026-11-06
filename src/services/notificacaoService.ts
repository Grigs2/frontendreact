import { api, API_ENDPOINTS } from './api';
import { GrupoNotificacao, NotificacaoDTO, NotificacaoCreateDTO, UsuarioResumoDTO } from '../types';

export interface FiltroCentral {
  /** NAO_LIDAS (padrão) ou TODAS */
  status?: 'NAO_LIDAS' | 'TODAS';
  grupo?: GrupoNotificacao;
  /** a partir de 0 */
  pagina?: number;
  tamanho?: number;
}

export const TAMANHO_PAGINA_NOTIFICACOES = 30;

export const notificacaoService = {
  /** Sem filtro: só as não lidas (comportamento antigo). */
  listar: async (idUsuario: number): Promise<NotificacaoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarNotificacoes(idUsuario));
    return response.data;
  },

  /** Central de notificações: lidas e não lidas, filtro por grupo e paginação. */
  listarCentral: async (idUsuario: number, filtro: FiltroCentral = {}): Promise<NotificacaoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarNotificacoes(idUsuario), {
      params: {
        status: filtro.status ?? 'NAO_LIDAS',
        grupo: filtro.grupo,
        pagina: filtro.pagina ?? 0,
        tamanho: filtro.tamanho ?? TAMANHO_PAGINA_NOTIFICACOES,
      },
    });
    return response.data;
  },

  contarNaoLidas: async (): Promise<number> => {
    const response = await api.get<{ naoLidas: number }>(API_ENDPOINTS.contarNaoLidas);
    return response.data?.naoLidas ?? 0;
  },

  marcarTodasLidas: async (): Promise<number> => {
    const response = await api.put<{ marcadas: number }>(API_ENDPOINTS.marcarTodasLidas);
    return response.data?.marcadas ?? 0;
  },

  visualizar: async (idNotificacao: number): Promise<void> => {
    await api.put(API_ENDPOINTS.visualizarNotificacao(idNotificacao));
  },

  listarUsuarios: async (): Promise<UsuarioResumoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarUsuariosNotificacao);
    return response.data;
  },

  enviar: async (dto: NotificacaoCreateDTO): Promise<NotificacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.enviarNotificacao, dto);
    return response.data;
  },

  registrarDispositivo: async (expoToken: string, plataforma: string): Promise<void> => {
    await api.post(API_ENDPOINTS.registrarDispositivo, { expoToken, plataforma });
  },

  removerDispositivo: async (expoToken: string): Promise<void> => {
    await api.post(API_ENDPOINTS.removerDispositivo, { expoToken });
  },
};
