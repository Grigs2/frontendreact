import { api, API_ENDPOINTS } from './api';
import { NotificacaoDTO } from '../types';

export const notificacaoService = {
  enviar: async (data: NotificacaoDTO): Promise<NotificacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.enviarNotificacao, data);
    return response.data;
  },

  listar: async (idUsuario: number): Promise<NotificacaoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarNotificacoes(idUsuario));
    return response.data;
  },
};
