import { api, API_ENDPOINTS } from './api';
import { ViagemDTO, DependenteDTO, SolicitacaoDTO, ViagemDiaDTO, ParadaViagemDTO } from '../types';

export const viagemService = {
  criar: async (idMotorista: number, periodo: string): Promise<ViagemDTO> => {
    const response = await api.post(API_ENDPOINTS.criarViagem(idMotorista), { periodo });
    return response.data;
  },

  visualizar: async (idViagem: number): Promise<any> => {
    const response = await api.get(API_ENDPOINTS.visualizarViagem(idViagem));
    return response.data;
  },

  listarDependentesDisponiveis: async (idViagem: number): Promise<DependenteDTO[]> => {
    const response = await api.get(API_ENDPOINTS.dependentesDisponiveis(idViagem));
    return response.data;
  },

  solicitarDependente: async (idViagem: number, idDependente: number): Promise<SolicitacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.solicitarDependente(idViagem, idDependente));
    return response.data;
  },

  iniciarViagemDia: async (idViagem: number): Promise<ViagemDiaDTO> => {
    const response = await api.post(API_ENDPOINTS.iniciarViagemDia(idViagem));
    return response.data;
  },

  alterarStatusViagemDia: async (idViagemDia: number, novoStatus: string): Promise<ViagemDiaDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarStatusViagemDia, { idViagemDia, novoStatus });
    return response.data;
  },

  alterarStatusPresenca: async (idViagemDia: number, idDependente: number, novoStatus: string): Promise<ParadaViagemDTO[]> => {
    const response = await api.put(API_ENDPOINTS.alterarStatusPresenca, { idViagemDia, idDependente, novoStatus });
    return response.data;
  },

  buscarParadasViagemDia: async (idViagemDia: number): Promise<ParadaViagemDTO[]> => {
    const response = await api.get(API_ENDPOINTS.buscarParadasViagemDia(idViagemDia));
    return response.data;
  },

  visualizarViagemDia: async (idViagemDia: number): Promise<ViagemDiaDTO> => {
    const response = await api.get(API_ENDPOINTS.visualizarViagemDia(idViagemDia));
    return response.data;
  },

  listarViagens: async (idMotorista: number): Promise<ViagemDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarViagens(idMotorista));
    return response.data;
  },

  desativarViagem: async (idViagem: number): Promise<void> => {
    await api.put(API_ENDPOINTS.desativarViagem(idViagem));
  },

  historico: async (idMotorista: number): Promise<ViagemDiaDTO[]> => {
    const response = await api.get(API_ENDPOINTS.historicoViagens(idMotorista));
    return response.data;
  },

  consultarMotorista: async (idViagemDia: number): Promise<any> => {
    const response = await api.get(API_ENDPOINTS.consultarMotoristaViagem(idViagemDia));
    return response.data;
  },
};
