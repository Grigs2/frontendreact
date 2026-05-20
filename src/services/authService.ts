import { api, API_ENDPOINTS } from './api';
import { MotoristaDTO, ResponsavelDTO, EscolaDTO } from '../types';

export const authService = {
  loginMotorista: async (email: string, senha: string): Promise<MotoristaDTO> => {
    console.log('[authService] Iniciando loginMotorista para:', email);
    // Usando POST pois GET com @RequestBody não é suportado por padrão em muitos navegadores/clientes
    // Se o backend realmente exigir GET, o contrato precisaria ser revisto para @RequestParam ou similar.
    const response = await api.post(API_ENDPOINTS.autenticarMotorista, { email, senha });
    return response.data;
  },

  loginResponsavel: async (email: string, senha: string): Promise<ResponsavelDTO> => {
    console.log('[authService] Iniciando loginResponsavel para:', email);
    const response = await api.post(API_ENDPOINTS.autenticarResponsavel, { email, senha });
    return response.data;
  },

  loginEscola: async (email: string, senha: string): Promise<EscolaDTO> => {
    console.log('[authService] Iniciando loginEscola para:', email);
    const response = await api.post(API_ENDPOINTS.autenticarEscola, { email, senha });
    return response.data;
  },
};
