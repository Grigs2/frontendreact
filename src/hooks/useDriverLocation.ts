import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { INTERVALO_GPS_MS, LIMITE_DESATUALIZADA_MS, localizacaoService } from '../services/localizacaoService';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';

// Envio da posição do motorista durante a execução EM_ANDAMENTO (7.1 da listagem).
// - só "durante o uso" (sem coleta em segundo plano nesta versão);
// - intervalo de 15 s exigido pelo backend; 409 de intervalo é ignorado;
// - consentimento ausente/revogado (409) ou servidor sem política (503) param o envio e viram aviso;
// - GPS nunca vai para a fila offline.

export type EstadoGps =
  | 'inativo'
  | 'solicitando'
  | 'negado'
  | 'desligado'
  | 'ativo'
  | 'sem_sinal'
  | 'bloqueado';

export interface PosicaoLocal {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export function useDriverLocation(idViagemDia: number | null | undefined, ativo: boolean) {
  const [estado, setEstado] = useState<EstadoGps>('inativo');
  const [posicao, setPosicao] = useState<PosicaoLocal | null>(null);
  const [ultimoEnvio, setUltimoEnvio] = useState<Date | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const ultimoEnvioRef = useRef(0);
  const bloqueadoRef = useRef(false);
  const assinatura = useRef<Location.LocationSubscription | null>(null);

  const parar = useCallback(() => {
    assinatura.current?.remove();
    assinatura.current = null;
  }, []);

  const enviar = useCallback(
    async (coords: Location.LocationObject) => {
      if (!idViagemDia || bloqueadoRef.current) return;
      const agoraMs = Date.now();
      if (agoraMs - ultimoEnvioRef.current < INTERVALO_GPS_MS) return;
      ultimoEnvioRef.current = agoraMs;
      try {
        await localizacaoService.enviarPosicao({
          idViagemDia,
          latitude: coords.coords.latitude,
          longitude: coords.coords.longitude,
          // O backend recusa instantes no futuro: nunca adiantar o relógio do GPS.
          instanteDispositivo: new Date(Math.min(coords.timestamp, agoraMs)).toISOString(),
        });
        setUltimoEnvio(new Date());
        setEstado('ativo');
        setMensagem(null);
      } catch (error) {
        const status = getApiStatus(error);
        const texto = getApiErrorMessage(error, 'Não foi possível enviar a localização.');
        if (status === 409 && /aguarde/i.test(texto)) return;
        if (status === 409 || status === 503 || status === 403) {
          bloqueadoRef.current = true;
          setEstado('bloqueado');
          setMensagem(
            status === 503
              ? 'Localização desativada pelo servidor. A viagem e a presença continuam funcionando.'
              : texto,
          );
          parar();
          return;
        }
        // Sem rede ou erro pontual: segue tentando no próximo ciclo.
        setEstado('sem_sinal');
      }
    },
    [idViagemDia, parar],
  );

  const iniciar = useCallback(async () => {
    if (!idViagemDia || assinatura.current) return;
    bloqueadoRef.current = false;
    setEstado('solicitando');
    try {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (permissao.status !== 'granted') {
        setEstado('negado');
        return;
      }
      if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) {
        setEstado('desligado');
        return;
      }
      assinatura.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: INTERVALO_GPS_MS, distanceInterval: 0 },
        (loc) => {
          setPosicao({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: loc.timestamp });
          enviar(loc);
        },
      );
      setEstado('ativo');
    } catch {
      setEstado('sem_sinal');
    }
  }, [enviar, idViagemDia]);

  // Liga/desliga conforme a execução (encerra ao finalizar, interromper ou cancelar).
  useEffect(() => {
    if (ativo && idViagemDia) iniciar();
    else {
      parar();
      setEstado('inativo');
    }
    return parar;
  }, [ativo, idViagemDia, iniciar, parar]);

  // Ao voltar para o app, revalida GPS desligado/permissão.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && ativo && (estado === 'desligado' || estado === 'negado')) iniciar();
    });
    return () => sub.remove();
  }, [ativo, estado, iniciar]);

  // Relógio para calcular "desatualizada".
  useEffect(() => {
    if (!ativo) return undefined;
    const timer = setInterval(() => setAgora(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [ativo]);

  const desatualizada =
    estado === 'ativo' && !!ultimoEnvio && agora - ultimoEnvio.getTime() > LIMITE_DESATUALIZADA_MS;

  return {
    estado: desatualizada ? ('sem_sinal' as EstadoGps) : estado,
    posicao,
    ultimoEnvio,
    mensagem,
    tentarNovamente: () => {
      parar();
      iniciar();
    },
    abrirConfiguracoes: () => Linking.openSettings().catch(() => undefined),
  };
}

export const MENSAGEM_GPS: Record<EstadoGps, string> = {
  inativo: 'Localização desligada',
  solicitando: 'Ativando a localização…',
  negado: 'Permita o acesso à localização nas configurações do aparelho.',
  desligado: 'Ative a localização (GPS) do aparelho.',
  ativo: 'Localização ao vivo',
  sem_sinal: 'Localização desatualizada. Verifique o sinal do GPS e a internet.',
  bloqueado: 'Localização indisponível nesta viagem.',
};
