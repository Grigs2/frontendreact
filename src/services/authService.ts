import { api, API_ENDPOINTS } from './api';
import { authSession } from './authSession';
import { AutenticacaoResponseDTO, EscolaDTO, MotoristaDTO, ResponsavelDTO, TipoPerfil } from '../types';

export type AppRole = 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA';
export type AppUser = MotoristaDTO | ResponsavelDTO | EscolaDTO;

export interface SessaoCarregada {
  user: AppUser;
  role: AppRole;
}

export class PerfilNaoSuportadoError extends Error {
  constructor(tipoPerfil: string) {
    super(`O perfil ${tipoPerfil} não tem acesso pelo aplicativo.`);
    this.name = 'PerfilNaoSuportadoError';
  }
}

const PERFIL_ENDPOINT: Record<AppRole, string> = {
  MOTORISTA: API_ENDPOINTS.perfilMotorista,
  RESPONSAVEL: API_ENDPOINTS.perfilResponsavel,
  ESCOLA: API_ENDPOINTS.perfilEscola,
};

const isAppRole = (tipo: TipoPerfil | string): tipo is AppRole => tipo in PERFIL_ENDPOINT;

export const authService = {
  /** Carrega o perfil completo do usuário autenticado (GET /{Perfil}/Perfil). */
  carregarPerfil: async (tipoPerfil: TipoPerfil | string): Promise<SessaoCarregada> => {
    if (!isAppRole(tipoPerfil)) throw new PerfilNaoSuportadoError(tipoPerfil);
    const response = await api.get<AppUser>(PERFIL_ENDPOINT[tipoPerfil]);
    return { user: response.data, role: tipoPerfil };
  },

  /** Login com JWT: POST /Autenticacao/Entrar e, em seguida, carrega o perfil. */
  entrar: async (email: string, senha: string): Promise<SessaoCarregada> => {
    const response = await api.post<AutenticacaoResponseDTO>(API_ENDPOINTS.entrar, { email, senha });
    await authSession.start(response.data);
    try {
      return await authService.carregarPerfil(response.data.perfil.tipoPerfil);
    } catch (error) {
      await authService.sair();
      throw error;
    }
  },

  /** Restaura a sessão salva (refresh token) ao abrir o app. Retorna null quando não há sessão válida. */
  restaurarSessao: async (): Promise<SessaoCarregada | null> => {
    if (!(await authSession.getRefreshToken())) return null;
    try {
      const session = await authSession.refresh();
      return await authService.carregarPerfil(session.perfil.tipoPerfil);
    } catch {
      return null;
    }
  },

  /** Encerra a sessão no backend (revoga o refresh token) e descarta os tokens locais. */
  sair: async () => {
    const refreshToken = await authSession.getRefreshToken();
    try {
      if (refreshToken && authSession.getAccessToken()) {
        await api.post(API_ENDPOINTS.sair, { refreshToken });
      }
    } catch (error) {
      console.warn('[authService] Falha ao encerrar sessão no servidor:', error);
    } finally {
      await authSession.clear();
    }
  },

  /** Troca de senha do usuário autenticado. O backend revoga todas as sessões; é preciso entrar novamente. */
  alterarSenha: async (senhaAtual: string, novaSenha: string) => {
    await api.post(API_ENDPOINTS.alterarSenha, { senhaAtual, novaSenha });
  },

  /** Sempre responde com mensagem genérica (o backend não revela se o e-mail existe). */
  solicitarRedefinicaoSenha: async (email: string): Promise<string> => {
    const response = await api.post<{ mensagem?: string }>(API_ENDPOINTS.solicitarRedefinicaoSenha, { email });
    return (
      response.data?.mensagem ||
      'Se houver uma conta e o pedido puder ser processado, enviaremos instruções para redefinir a senha.'
    );
  },

  redefinirSenha: async (token: string, novaSenha: string) => {
    await api.post(API_ENDPOINTS.redefinirSenha, { token, novaSenha });
  },
};
