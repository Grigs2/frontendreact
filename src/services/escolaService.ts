import { api, API_ENDPOINTS } from './api';
import { EscolaDTO } from '../types';

export const escolaService = {
  cadastrar: async (data: EscolaDTO): Promise<EscolaDTO> => {
    const response = await api.post(API_ENDPOINTS.cadastrarEscola, data);
    return response.data;
  },

  alterarInfos: async (data: EscolaDTO): Promise<EscolaDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarInfosEscola, data);
    return response.data;
  },
};
