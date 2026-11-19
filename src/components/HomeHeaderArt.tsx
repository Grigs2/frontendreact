import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

/** Largura de referência da arte (seção 07 do Design Pattern); a arte escala com a tela. */
const LARGURA = 220;
const ALTURA = 96;
const Y_TRILHO = 82;
/** Paradas do trilho: as duas primeiras já percorridas; a terceira é onde o pino do logo está. */
const PARADAS = [20, 72, 124, 172, 208];
const PARADA_LOGO = 2;

/**
 * Cabeçalho do Início do Responsável: o logo do app (pino com a perua) passando por uma parada
 * de um trilho de paradas, como em mapas de metrô. Substitui a saudação "Olá, Nome".
 */
export default function HomeHeaderArt() {
  const xLogo = PARADAS[PARADA_LOGO];
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="Tio da Perua">
      <Text style={styles.marca} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Tio da{'\n'}Perua
      </Text>
      <Svg width="100%" height={ALTURA} viewBox={`0 0 ${LARGURA} ${ALTURA}`} style={styles.svg} preserveAspectRatio="xMidYMax meet">
        {/* trilho: futuro (cinza) e percorrido (tinta) */}
        <Line x1={PARADAS[0]} y1={Y_TRILHO} x2={PARADAS[PARADAS.length - 1]} y2={Y_TRILHO} stroke={colors.border} strokeWidth={6} strokeLinecap="round" />
        <Line x1={PARADAS[0]} y1={Y_TRILHO} x2={xLogo} y2={Y_TRILHO} stroke={colors.ink} strokeWidth={6} strokeLinecap="round" />
        {PARADAS.map((x, i) =>
          i === PARADA_LOGO ? null : (
            <Circle key={x} cx={x} cy={Y_TRILHO} r={7} fill={i < PARADA_LOGO ? colors.ink : colors.surface} stroke={colors.ink} strokeWidth={3} />
          ),
        )}
        {/* parada atual: anel amarelo sob a ponta do pino */}
        <Circle cx={xLogo} cy={Y_TRILHO} r={11} fill={colors.primary} stroke={colors.ink} strokeWidth={3} />
        {/* pino do logo */}
        <Path
          d={`M${xLogo} ${Y_TRILHO - 6} C${xLogo} ${Y_TRILHO - 6} ${xLogo - 24} ${Y_TRILHO - 36} ${xLogo - 24} ${Y_TRILHO - 56} A24 24 0 0 1 ${xLogo + 24} ${Y_TRILHO - 56} C${xLogo + 24} ${Y_TRILHO - 36} ${xLogo} ${Y_TRILHO - 6} ${xLogo} ${Y_TRILHO - 6} Z`}
          fill={colors.surface}
          stroke={colors.info}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        {/* perua */}
        <Rect x={xLogo - 14} y={Y_TRILHO - 70} width={28} height={26} rx={6} fill={colors.primary} stroke={colors.ink} strokeWidth={2} />
        <Rect x={xLogo - 10} y={Y_TRILHO - 66} width={20} height={9} rx={2} fill={colors.infoTint} stroke={colors.ink} strokeWidth={1.5} />
        <Circle cx={xLogo - 8} cy={Y_TRILHO - 48} r={3} fill={colors.ink} />
        <Circle cx={xLogo + 8} cy={Y_TRILHO - 48} r={3} fill={colors.ink} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    // Deixa espaço para o sino flutuante no canto direito.
    paddingRight: layout.minTouch + spacing.sm,
  },
  marca: { ...typography.heading, color: colors.ink, marginBottom: spacing.sm },
  svg: { flex: 1, maxWidth: LARGURA * 1.4 },
});
