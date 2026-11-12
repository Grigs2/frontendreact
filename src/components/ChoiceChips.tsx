import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Linha de apoio (ex.: dia da semana na faixa de datas). */
  caption?: string;
}

interface ChoiceChipsProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Faixa horizontal rolável (datas) em vez de quebra de linha. */
  scroll?: boolean;
  accessibilityLabel?: string;
}

/** Escolha única em pílulas: ativa em primary (texto ink), inativa com borda neutra. Alvo mínimo 48 px. */
export default function ChoiceChips<T extends string>({ options, value, onChange, scroll, accessibilityLabel }: ChoiceChipsProps<T>) {
  const items = options.map((o) => {
    const selected = o.value === value;
    return (
      <Pressable
        key={o.value}
        onPress={() => onChange(o.value)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={[o.label, o.caption].filter(Boolean).join(', ')}
        style={({ pressed }) => [
          styles.chip,
          o.caption ? styles.chipTall : null,
          selected ? styles.selected : styles.idle,
          pressed && !selected && styles.pressed,
        ]}
      >
        {!!o.caption && (
          <Text style={[styles.caption, selected && styles.textSelected]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {o.caption}
          </Text>
        )}
        <Text style={[styles.label, selected && styles.textSelected]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {o.label}
        </Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
      >
        {items}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.row, styles.wrap]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
  chip: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borders.hairline,
  },
  chipTall: { minHeight: 64, paddingHorizontal: spacing.md, borderRadius: radius.card },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { backgroundColor: colors.pressedNeutral },
  label: { ...typography.label, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  textSelected: { color: colors.ink },
});
