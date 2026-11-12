import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { authSession } from '../services/authSession';
import { EventoFila, offlineQueue } from '../services/offlineQueue';
import { ResultadoEventoPresencaDTO } from '../types';

// Estado de conexão e da fila offline de presença (8.1 e 8.3 da listagem).

interface ConnectivityContextType {
  online: boolean;
  /** Eventos ainda não enviados. */
  pendentes: number;
  /** Eventos que o servidor não aplicou (conflito ou rejeição). */
  problemas: EventoFila[];
  sincronizando: boolean;
  ultimaSincronizacao: Date | null;
  erroSincronizacao: string | null;
  sincronizar: () => Promise<ResultadoEventoPresencaDTO[]>;
  descartar: (idEvento: string) => Promise<void>;
  /** Marca o aparelho como offline após um erro de rede de uma requisição. */
  marcarFalhaDeRede: () => void;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

const estaOnline = (state: NetInfoState) => state.isConnected !== false && state.isInternetReachable !== false;

const usuarioAtual = () => {
  const perfil = authSession.getPerfil();
  return perfil?.tipoPerfil === 'MOTORISTA' ? perfil.usuarioId : null;
};

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [fila, setFila] = useState<EventoFila[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(null);
  const [erroSincronizacao, setErro] = useState<string | null>(null);
  const onlineRef = useRef(true);

  const recarregarFila = useCallback(async () => {
    const usuarioId = usuarioAtual();
    setFila(usuarioId ? await offlineQueue.listar(usuarioId) : []);
  }, []);

  const sincronizar = useCallback(async () => {
    const usuarioId = usuarioAtual();
    if (!usuarioId) return [];
    setSincronizando(true);
    setErro(null);
    try {
      const resultados = await offlineQueue.sincronizar(usuarioId);
      setUltimaSincronizacao(new Date());
      return resultados;
    } catch (error: any) {
      if (!error?.response) {
        onlineRef.current = false;
        setOnline(false);
      }
      setErro('Não foi possível enviar os registros. Tente novamente.');
      throw error;
    } finally {
      setSincronizando(false);
      await recarregarFila();
    }
  }, [recarregarFila]);

  // Escuta a rede; ao voltar a conexão envia os pendentes (8.3.1–8.3.2).
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const agora = estaOnline(state);
      const voltou = agora && !onlineRef.current;
      onlineRef.current = agora;
      setOnline(agora);
      if (voltou) sincronizar().catch(() => undefined);
    });
    return unsubscribe;
  }, [sincronizar]);

  useEffect(() => {
    recarregarFila();
    return offlineQueue.subscribe(() => {
      recarregarFila();
    });
  }, [recarregarFila]);

  const descartar = useCallback(async (idEvento: string) => {
    const usuarioId = usuarioAtual();
    if (usuarioId) await offlineQueue.descartar(usuarioId, idEvento);
  }, []);

  const marcarFalhaDeRede = useCallback(() => {
    onlineRef.current = false;
    setOnline(false);
    // Confirma com o NetInfo: se a rede estiver ok, volta ao normal e sincroniza.
    NetInfo.refresh().then((state) => {
      if (estaOnline(state)) {
        onlineRef.current = true;
        setOnline(true);
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      online,
      pendentes: fila.filter((e) => e.situacao === 'PENDENTE').length,
      problemas: fila.filter((e) => e.situacao !== 'PENDENTE'),
      sincronizando,
      ultimaSincronizacao,
      erroSincronizacao,
      sincronizar,
      descartar,
      marcarFalhaDeRede,
    }),
    [online, fila, sincronizando, ultimaSincronizacao, erroSincronizacao, sincronizar, descartar, marcarFalhaDeRede],
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export const useConnectivity = () => {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error('useConnectivity must be used within a ConnectivityProvider');
  return ctx;
};
