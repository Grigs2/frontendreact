import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder } from 'react-native';

/** Tamanhos do mapa: 0 = oculto, 1 = pequeno (topo), 2 = tela cheia. */
export type NivelMapa = 0 | 1 | 2;

/**
 * Mapa dinâmico (seção 07 do Design Pattern): tocar no mapa amplia um nível; tocar numa área
 * não clicável fora do mapa reduz um nível. `minimo` limita a redução (o Responsável não tem modo oculto).
 */
export function useNivelMapa(inicial: NivelMapa = 1, minimo: NivelMapa = 0) {
  const [nivel, setNivel] = useState<NivelMapa>(inicial);
  const ampliar = useCallback(() => setNivel((n) => (n < 2 ? ((n + 1) as NivelMapa) : n)), []);
  const reduzir = useCallback(() => setNivel((n) => (n > minimo ? ((n - 1) as NivelMapa) : n)), [minimo]);
  return { nivel, setNivel, ampliar, reduzir };
}

/** Distância máxima (px) para um gesto ainda contar como toque. */
const LIMITE_TOQUE = 10;
/** Distância mínima (px) para um deslize horizontal trocar de item. */
const LIMITE_DESLIZE = 50;

interface AreaToqueOpcoes {
  /** Toque num ponto sem botão (os botões e cards clicáveis respondem antes, por serem mais internos). */
  onToque?: () => void;
  onDeslizarEsquerda?: () => void;
  onDeslizarDireita?: () => void;
}

/**
 * Handlers para a área fora do mapa: distingue toque (reduz o mapa) de deslize horizontal (troca de aluno).
 * Espalhar o retorno na View da área: `<View {...area.panHandlers}>`.
 */
export function useAreaToque(opcoes: AreaToqueOpcoes) {
  const ref = useRef(opcoes);
  ref.current = opcoes;
  return useMemo(
    () =>
      PanResponder.create({
        // Só recebe o toque quando nenhum filho clicável o pegou.
        onStartShouldSetPanResponder: () => !!ref.current.onToque,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          const { onToque, onDeslizarEsquerda, onDeslizarDireita } = ref.current;
          if (Math.abs(g.dx) < LIMITE_TOQUE && Math.abs(g.dy) < LIMITE_TOQUE) onToque?.();
          else if (g.dx < -LIMITE_DESLIZE) onDeslizarEsquerda?.();
          else if (g.dx > LIMITE_DESLIZE) onDeslizarDireita?.();
        },
      }),
    [],
  );
}
