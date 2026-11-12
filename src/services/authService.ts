import axios from 'axios';
import { api, API_ENDPOINTS } from './api';
import { authSession } from './authSession';
import { pushService } from './pushService';
import { BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { AutenticacaoResponseDTO, EscolaDTO, MotoristaDTO, ResponsavelDTO, TipoPerfil } from '../types';

export type AppRole = 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA' | 'ADMIN';

/** O ADMIN não tem endpoint de perfil: usa o perfil devolvido pelo login/renovação. */
export interface AdminUser {
  id: number;
  usuarioId: number;
  nome: string;
  tipoPerfil: 'ADMIN';
}

export type AppUser = MotoristaDTO | ResponsavelDTO | EscolaDTO | AdminUser;

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

const PERFIL_ENDPOINT: Record<Exclude<AppRole, 'ADMIN'>, string> = {
  MOTORISTA: API_ENDPOINTS.perfilMotorista,
  RESPONSAVEL: API_ENDPOINTS.perfilResponsavel,
  ESCOLA: API_ENDPOINTS.perfilEscola,
};

const isAppRole = (tipo: TipoPerfil | string): tipo is AppRole => tipo === 'ADMIN' || tipo in PERFIL_ENDPOINT;

export const authService = {
  /** Carrega o perfil completo do usuário autenticado (GET /{Perfil}/Perfil). */
  carregarPerfil: async (tipoPerfil: TipoPerfil | string): Promise<SessaoCarregada> => {
    if (!isAppRole(tipoPerfil)) throw new PerfilNaoSuportadoError(tipoPerfil);
    if (tipoPerfil === 'ADMIN') {
      const perfil = authSession.getPerfil();
      if (!perfil) throw new Error('Sessão administrativa sem perfil.');
      return {
        user: { id: perfil.id, usuarioId: perfil.usuarioId, nome: perfil.nome, tipoPerfil: 'ADMIN' },
        role: 'ADMIN',
      };
    }
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

  /**
   * Descarta os tokens locais primeiro e só depois pede ao backend para revogar o refresh token (sem esperar).
   * Assim a tela de login, aberta logo em seguida, não encontra a sessão antiga e não entra de novo sozinha.
   */
  sair: async () => {
    const refreshToken = await authSession.getRefreshToken();
    const accessToken = authSession.getAccessToken();
    const pushToken = pushService.getToken();
    pushService.esquecer();
    await authSession.clear();
    if (pushToken && accessToken) {
      // Este aparelho para de receber push da conta que saiu.
      axios
        .post(`${BASE_URL}${API_ENDPOINTS.removerDispositivo}`, { expoToken: pushToken }, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: REQUEST_TIMEOUT_MS,
        })
        .catch((error) => console.warn('[authService] Falha ao remover o aparelho do push:', error));
    }
    if (refreshToken && accessToken) {
      axios
        .post(`${BASE_URL}${API_ENDPOINTS.sair}`, { refreshToken }, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: REQUEST_TIMEOUT_MS,
        })
        .catch((error) => console.warn('[authService] Falha ao encerrar sessão no servidor:', error));
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

  /** Novo aceite da versão vigente dos termos (quando o login devolve termosPendentes = true). */
  aceitarTermos: async () => {
    await api.post(API_ENDPOINTS.aceitarTermos);
    await authSession.setTermosPendentes(false);
  },

  /** Versão vigente e caminho do PDF dos termos (rota pública). */
  termosVigente: async (): Promise<{ versao: string | null; caminhoPdf: string }> => {
    const response = await api.get(API_ENDPOINTS.termosVigente);
    return response.data;
  },
};
