import { api, API_ENDPOINTS } from './api';
import { DependenteDTO } from '../types';

export const dependenteService = {
  alterarInfos: async (data: DependenteDTO & { senha?: string }): Promise<DependenteDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarInfosDependente, data);
    return response.data;
  },
};
