import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  error?: string | null;
}

export default function Checkbox({ checked, onChange, label, error }: CheckboxProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.boxChecked, !!error && !checked && styles.boxError]}>
          {checked && <Feather name="check" size={18} color={colors.onPrimary} />}
        </View>
        <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {label}
        </Text>
      </Pressable>
      {!!error && (
        <Text style={styles.error} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouch },
  box: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: borders.alert,
    borderColor: colors.slate500,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxError: { borderColor: colors.danger },
  label: { ...typography.body, color: colors.ink, flex: 1 },
  error: { ...typography.caption, color: colors.danger },
});
