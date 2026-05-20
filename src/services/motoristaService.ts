import { api, API_ENDPOINTS } from './api';
import { MotoristaDTO, VeiculoDTO } from '../types';

export const motoristaService = {
  cadastrar: async (data: MotoristaDTO): Promise<MotoristaDTO> => {
    const response = await api.post(API_ENDPOINTS.cadastrarMotorista, data);
    return response.data;
  },

  cadastrarVeiculo: async (idMotorista: number, data: VeiculoDTO): Promise<MotoristaDTO> => {
    const response = await api.post(API_ENDPOINTS.cadastrarVeiculo(idMotorista), data);
    return response.data;
  },

  alterarInfos: async (data: MotoristaDTO): Promise<MotoristaDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarInfosMotorista, data);
    return response.data;
  },
};
