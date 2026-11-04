import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: FeatherIconName;
}

interface RadioCardGroupProps<T extends string> {
  options: RadioCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Escolha única em cartões (ícone + título + descrição). Selecionado: borda ink 2px + fundo primaryTint. */
export default function RadioCardGroup<T extends string>({ options, value, onChange, accessibilityLabel }: RadioCardGroupProps<T>) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.description ? `${option.label}, ${option.description}` : option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && !selected && styles.cardPressed]}
          >
            {option.icon && (
              <View style={[styles.iconSlot, selected && styles.iconSlotSelected]}>
                <Feather name={option.icon} size={20} color={colors.ink} />
              </View>
            )}
            <View style={styles.texts}>
              <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>{option.label}</Text>
              {!!option.description && (
                <Text style={styles.description} maxFontSizeMultiplier={maxFontSizeMultiplier}>{option.description}</Text>
              )}
            </View>
            <Feather name={selected ? 'check-circle' : 'circle'} size={22} color={selected ? colors.ink : colors.slate500} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonLg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardSelected: { borderWidth: borders.alert, borderColor: colors.ink, backgroundColor: colors.primaryTint },
  cardPressed: { backgroundColor: colors.background },
  iconSlot: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  iconSlotSelected: { backgroundColor: colors.primary },
  texts: { flex: 1, gap: 2 },
  label: { ...typography.label, color: colors.ink },
  description: { ...typography.caption, color: colors.slate500 },
});
