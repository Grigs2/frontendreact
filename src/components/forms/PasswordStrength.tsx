import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';
import { passwordRules, passwordStrength } from '../../utils/validators';

const LEVELS = [
  { label: '', color: colors.border },
  { label: 'Fraca', color: colors.danger },
  { label: 'Razoável', color: colors.primaryPressed },
  { label: 'Boa', color: colors.info },
  { label: 'Forte', color: colors.success },
];

/** Barra de força + checklist dos critérios da senha (texto e ícone, nunca só cor). */
export default function PasswordStrength({ value }: { value: string }) {
  const level = passwordStrength(value);
  const rules = passwordRules(value);

  return (
    <View style={styles.container} accessibilityLabel={`Força da senha: ${LEVELS[level].label || 'vazia'}`}>
      <View style={styles.barRow}>
        <View style={styles.bars}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.bar, { backgroundColor: i <= level ? LEVELS[level].color : colors.border }]} />
          ))}
        </View>
        {!!value && (
          <Text style={styles.levelText} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {LEVELS[level].label}
          </Text>
        )}
      </View>
      {rules.map((rule) => (
        <View key={rule.key} style={styles.rule}>
          <Feather name={rule.ok ? 'check-circle' : 'circle'} size={16} color={rule.ok ? colors.success : colors.slate500} />
          <Text style={[styles.ruleText, rule.ok && styles.ruleOk]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  bars: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: 6, borderRadius: radius.pill },
  levelText: { ...typography.captionBold, color: colors.slate700, minWidth: 64, textAlign: 'right' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ruleText: { ...typography.caption, color: colors.slate500 },
  ruleOk: { color: colors.ink },
});
