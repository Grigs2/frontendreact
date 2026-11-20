import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { localizacaoService } from '../services/localizacaoService';
import { RotaViagemDTO } from '../types';

/** O backend recalcula a rota no máximo uma vez por minuto; buscar mais que isso não traz nada novo. */
const INTERVALO_ROTA_MS = 60000;

/**
 * Rota e previsão de chegada da viagem em andamento.
 * @param posicao  só o motorista passa: a rota sai da posição do aparelho
 * @param gatilho  muda quando algo na rota muda (ex.: um embarque) para buscar na hora
 */
export function useRotaViagem(
  viagemDiaId: number | null | undefined,
  ativo: boolean,
  posicao?: { latitude: number; longitude: number } | null,
  gatilho?: string | number,
) {
  const [rota, setRota] = useState<RotaViagemDTO | null>(null);
  const posicaoRef = useRef(posicao);
  posicaoRef.current = posicao;
  const temPosicao = !!posicao;

  useEffect(() => {
    if (!ativo || !viagemDiaId) {
      setRota(null);
      return undefined;
    }
    let vivo = true;
    const buscar = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const p = posicaoRef.current;
        const r = await localizacaoService.rota(viagemDiaId, p ? { latitude: p.latitude, longitude: p.longitude } : null);
        if (vivo) setRota(r);
      } catch {
        // Sem rota (rede, consentimento ou servidor antigo): o mapa continua só com o veículo.
        if (vivo) setRota(null);
      }
    };
    buscar();
    const timer = setInterval(buscar, INTERVALO_ROTA_MS);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
    // A primeira posição do GPS também dispara a busca, para a rota sair do lugar certo.
  }, [viagemDiaId, ativo, gatilho, temPosicao]);

  return rota;
}
