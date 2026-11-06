import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { AutenticacaoResponseDTO, PerfilAutenticadoDTO } from '../types';

// Sessão JWT do backend:
// - access token (15 min) fica apenas em memória;
// - refresh token (30 dias, rotativo) é persistido no armazenamento seguro do aparelho
//   (Keychain/Keystore via expo-secure-store). No web, onde não há armazenamento seguro, usa AsyncStorage.

const REFRESH_TOKEN_KEY = 'tioDaPerua.refreshToken';

const storage = {
  get: async (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  set: async (key: string, value: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  remove: async (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let perfil: PerfilAutenticadoDTO | null = null;
// Versão dos termos mudou desde o último aceite: o app pede um novo aceite antes de seguir.
let termosPendentes = false;
let refreshInFlight: Promise<AutenticacaoResponseDTO> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

// Cliente sem interceptores, para não entrar em laço ao renovar.
const plain = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

export const authSession = {
  getAccessToken: () => accessToken,
  getPerfil: () => perfil,
  getTermosPendentes: () => termosPendentes,
  async setTermosPendentes(valor: boolean) {
    termosPendentes = valor;
  },

  /** true quando o access token vence nos próximos `marginMs` (renovação proativa antes de enviar). */
  isAccessTokenExpiring: (marginMs = 30000) => !!accessToken && Date.now() >= accessTokenExpiresAt - marginMs,

  async start(response: AutenticacaoResponseDTO) {
    accessToken = response.accessToken;
    accessTokenExpiresAt = Date.now() + (response.accessTokenExpiresIn || 0) * 1000;
    perfil = response.perfil;
    termosPendentes = !!response.termosPendentes;
    try {
      await storage.set(REFRESH_TOKEN_KEY, response.refreshToken);
    } catch (error) {
      // Sem persistência a sessão continua válida enquanto o app estiver aberto.
      console.warn('[authSession] Não foi possível salvar o refresh token:', error);
    }
  },

  async getRefreshToken() {
    try {
      return await storage.get(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async clear() {
    accessToken = null;
    accessTokenExpiresAt = 0;
    perfil = null;
    termosPendentes = false;
    try {
      await storage.remove(REFRESH_TOKEN_KEY);
    } catch {
      // ignorado: nada a remover
    }
  },

  /**
   * Renova a sessão com o refresh token salvo. Chamadas simultâneas compartilham a mesma requisição,
   * pois o backend invalida o refresh token a cada uso (reapresentar um token já usado revoga a sessão).
   */
  refresh(): Promise<AutenticacaoResponseDTO> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const refreshToken = await authSession.getRefreshToken();
        if (!refreshToken) throw new Error('Sem sessão salva.');
        try {
          const { data } = await plain.post<AutenticacaoResponseDTO>('/Autenticacao/Renovar', { refreshToken });
          await authSession.start(data);
          return data;
        } catch (error: any) {
          // Só descarta a sessão quando o backend recusa o token; falha de rede mantém para nova tentativa.
          if (error?.response) await authSession.clear();
          throw error;
        }
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  },

  setSessionExpiredHandler(handler: (() => void) | null) {
    sessionExpiredHandler = handler;
  },

  notifySessionExpired() {
    sessionExpiredHandler?.();
  },
};
