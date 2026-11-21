import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Chip } from './ui';
import { ParadaProgresso } from '../utils/progressoViagem';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

/** Largura de cada estação e altura da faixa da linha. */
const W = 84;
const H = 48;
const Y = 24;

interface Props {
  paradas: ParadaProgresso[];
  /** Índice da parada para onde o veículo está indo (-1: viagem terminada). */
  indiceAtual: number;
  /** Motivo exibido no selo (ex.: "Localização indisponível"). */
  motivo?: string;
  /** Ocupa o espaço do pai (tela cheia). */
  preencher?: boolean;
  altura?: number;
  /** Toque na arte: amplia, como no mapa. */
  onPress?: () => void;
}

/**
 * Mapa alternativo (seção 07 do Design Pattern): quando a localização não está disponível, mostra a viagem
 * como uma linha de metrô — paradas concluídas, o veículo entre a última feita e a próxima, a parada do aluno
 * em destaque e as futuras. Paradas de outros alunos aparecem sem nome.
 */
export default function MetroProgressMap({ paradas, indiceAtual, motivo = 'Localização indisponível', preencher, altura = 220, onPress }: Props) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const n = paradas.length;
  const terminou = indiceAtual < 0;
  // O veículo fica no meio do trecho entre a última parada feita e a próxima.
  const xVeiculo = terminou ? (n - 1) * W + W / 2 : indiceAtual <= 0 ? W / 2 : (indiceAtual - 0.5) * W + W / 2;

  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, xVeiculo - W * 1.5), animated: true });
  }, [xVeiculo]);

  const corTrecho = (i: number) => {
    // Trecho entre a estação i e i+1.
    const proxima = paradas[i + 1];
    if (!proxima) return null;
    if (proxima.estado === 'concluida') return 'feito';
    if (i + 1 === indiceAtual) return 'emCurso';
    return 'futuro';
  };

  const resumo = terminou
    ? 'Viagem concluída.'
    : `Indo para ${paradas[indiceAtual]?.rotulo ?? 'a próxima parada'}.`;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.wrap, preencher ? styles.preencher : { height: Math.min(altura, layout.topAreaMax) }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${motivo}. Progresso da viagem: ${paradas.filter((p) => p.estado === 'concluida').length} de ${n} paradas feitas. ${resumo}`}
      accessibilityHint={onPress ? 'Amplia o mapa' : undefined}
    >
      <View style={styles.cabecalho}>
        <Chip label={motivo} tone="warning" icon="map" size="sm" />
        <Text style={styles.apoio} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          Progresso pelas paradas registradas pelo motorista.
        </Text>
      </View>

      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trilho}>
        <View>
          <Svg width={n * W} height={H}>
            {paradas.map((_, i) => {
              const tipo = corTrecho(i);
              if (!tipo) return null;
              const x1 = i * W + W / 2;
              const x2 = x1 + W;
              return (
                <Line
                  key={`t${i}`}
                  x1={x1}
                  y1={Y}
                  x2={x2}
                  y2={Y}
                  stroke={tipo === 'futuro' ? colors.border : colors.ink}
                  strokeWidth={tipo === 'emCurso' ? 4 : 8}
                  strokeDasharray={tipo === 'emCurso' ? '6 6' : undefined}
                  strokeLinecap="round"
                />
              );
            })}
            {paradas.map((p, i) => {
              const cx = i * W + W / 2;
              const escola = p.parada.tipoParada === 'ESCOLA';
              if (p.estado === 'concluida') return <Circle key={`e${i}`} cx={cx} cy={Y} r={8} fill={colors.ink} />;
              if (p.estado === 'atual')
                return <Circle key={`e${i}`} cx={cx} cy={Y} r={12} fill={p.doAluno ? colors.primaryTint : colors.surface} stroke={colors.ink} strokeWidth={4} />;
              return escola ? (
                <Rect key={`e${i}`} x={cx - 9} y={Y - 9} width={18} height={18} rx={4} fill={colors.surface} stroke={p.doAluno ? colors.ink : colors.border} strokeWidth={3} />
              ) : (
                <Circle key={`e${i}`} cx={cx} cy={Y} r={8} fill={colors.surface} stroke={p.doAluno ? colors.ink : colors.border} strokeWidth={3} />
              );
            })}
            {/* veículo */}
            <Circle cx={xVeiculo} cy={Y} r={17} fill={colors.primary} stroke={colors.ink} strokeWidth={3} />
            <Rect x={xVeiculo - 9} y={Y - 7} width={18} height={12} rx={3} fill={colors.ink} />
            <Rect x={xVeiculo - 6} y={Y - 5} width={12} height={4} rx={1} fill={colors.primaryTint} />
          </Svg>
          <View style={styles.rotulos}>
            {paradas.map((p, i) => (
              <View key={`r${i}`} style={styles.rotulo}>
                <Text
                  style={[styles.rotuloTexto, (p.doAluno || p.estado === 'atual') && styles.rotuloForte]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {p.rotulo}
                </Text>
                {p.estado === 'atual' && (
                  <Text style={styles.rotuloApoio} maxFontSizeMultiplier={maxFontSizeMultiplier}>próxima</Text>
                )}
                {p.doAluno && p.estado !== 'atual' && p.estado !== 'concluida' && (
                  <Text style={styles.rotuloApoio} maxFontSizeMultiplier={maxFontSizeMultiplier}>seu aluno</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Text style={styles.legenda} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        ● feita   ◉ veículo   ◯ próxima   ○ futura
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: colors.surface, paddingVertical: spacing.md, gap: spacing.sm, justifyContent: 'center' },
  preencher: { flex: 1 },
  cabecalho: { paddingHorizontal: layout.screenMargin, gap: spacing.xs, alignItems: 'flex-start' },
  apoio: { ...typography.caption, color: colors.slate500 },
  trilho: { paddingHorizontal: spacing.sm },
  rotulos: { flexDirection: 'row' },
  rotulo: { width: W, alignItems: 'center', paddingHorizontal: 2 },
  rotuloTexto: { ...typography.caption, color: colors.slate500, textAlign: 'center' },
  rotuloForte: { ...typography.captionBold, color: colors.ink },
  rotuloApoio: { ...typography.caption, color: colors.slate700 },
  legenda: { ...typography.caption, color: colors.slate700, paddingHorizontal: layout.screenMargin },
});
