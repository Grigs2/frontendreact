import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

/**
 * Versão compacta (seção 07 do Design Pattern, revisão de 20/11/2026): ocupa o lugar do subtítulo
 * do ScreenHeader, com a mesma altura de linha, para o título ficar na mesma posição das outras abas.
 */
const LARGURA = 240;
const ALTURA = 28;
const Y_TRILHO = 22;
/** Paradas do trilho: as duas primeiras já percorridas; a do meio é onde o pino do logo está. */
const PARADAS = [6, 60, 114, 168, 222];
const PARADA_LOGO = 2;

/**
 * Cabeçalho do Início do Responsável: título "Tio da Perua" no padrão dos títulos das outras abas e,
 * abaixo, o logo (pino com a perua) passando por uma parada de um trilho de paradas, como em mapas de metrô.
 */
export default function HomeHeaderArt() {
  const x = PARADAS[PARADA_LOGO];
  const topoPino = Y_TRILHO - 22;
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="Tio da Perua">
      <Text style={styles.titulo} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Tio da Perua
      </Text>
      <Svg width="100%" height={ALTURA} viewBox={`0 0 ${LARGURA} ${ALTURA}`} style={styles.svg} preserveAspectRatio="xMinYMid meet">
        {/* trilho: futuro (cinza) e percorrido (tinta) */}
        <Line x1={PARADAS[0]} y1={Y_TRILHO} x2={PARADAS[PARADAS.length - 1]} y2={Y_TRILHO} stroke={colors.border} strokeWidth={4} strokeLinecap="round" />
        <Line x1={PARADAS[0]} y1={Y_TRILHO} x2={x} y2={Y_TRILHO} stroke={colors.ink} strokeWidth={4} strokeLinecap="round" />
        {PARADAS.map((px, i) =>
          i === PARADA_LOGO ? null : (
            <Circle key={px} cx={px} cy={Y_TRILHO} r={4.5} fill={i < PARADA_LOGO ? colors.ink : colors.surface} stroke={colors.ink} strokeWidth={2} />
          ),
        )}
        {/* parada atual: anel amarelo sob a ponta do pino */}
        <Circle cx={x} cy={Y_TRILHO} r={5.5} fill={colors.primary} stroke={colors.ink} strokeWidth={2} />
        {/* pino do logo (cabeça de raio 9, ponta na parada) */}
        <Path
          d={`M${x} ${Y_TRILHO - 3} C${x} ${Y_TRILHO - 3} ${x - 9} ${topoPino + 14} ${x - 9} ${topoPino + 9} A9 9 0 0 1 ${x + 9} ${topoPino + 9} C${x + 9} ${topoPino + 14} ${x} ${Y_TRILHO - 3} ${x} ${Y_TRILHO - 3} Z`}
          fill={colors.surface}
          stroke={colors.info}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* perua, menor que na versão anterior */}
        <Rect x={x - 5} y={topoPino + 4} width={10} height={8} rx={2} fill={colors.primary} stroke={colors.ink} strokeWidth={1} />
        <Rect x={x - 3.5} y={topoPino + 5.5} width={7} height={2.5} rx={0.5} fill={colors.infoTint} />
        <Circle cx={x - 2.8} cy={topoPino + 12} r={1.2} fill={colors.ink} />
        <Circle cx={x + 2.8} cy={topoPino + 12} r={1.2} fill={colors.ink} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mesmo bloco do ScreenHeader com subtítulo: título "title", espaço xs e linha de apoio;
  // marginBottom completa o espaçamento de 24 do ScreenHeader (o HomeScroll já tem gap de 16).
  wrap: { gap: spacing.xs, paddingRight: layout.bellReserve, marginBottom: spacing.sm },
  titulo: { ...typography.title, color: colors.ink },
  svg: { maxWidth: LARGURA },
});
