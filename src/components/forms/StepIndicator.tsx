import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';

interface StepIndicatorProps {
  steps: string[];
  current: number; // índice 0-based
}

/** "Etapa 2 de 4 · Dados pessoais" + barra segmentada. */
export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Etapa ${current + 1} de ${steps.length}: ${steps[current]}`}
    >
      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Etapa {current + 1} de {steps.length}
      </Text>
      <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {steps[current]}
      </Text>
      <View style={styles.bars}>
        {steps.map((step, i) => (
          <View key={step} style={[styles.bar, i <= current && styles.barDone]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  caption: { ...typography.captionBold, color: colors.slate500 },
  title: { ...typography.heading, color: colors.ink },
  bars: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  bar: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  barDone: { backgroundColor: colors.primary },
});
