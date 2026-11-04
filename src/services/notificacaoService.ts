import { api, API_ENDPOINTS } from './api';
import { NotificacaoDTO, NotificacaoCreateDTO, UsuarioResumoDTO } from '../types';

export const notificacaoService = {
  listar: async (idUsuario: number): Promise<NotificacaoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarNotificacoes(idUsuario));
    return response.data;
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
};
