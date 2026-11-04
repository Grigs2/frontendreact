import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { layout, maxFontSizeMultiplier, radius, spacing, statusColors, StatusTone, typography } from '../../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface ChipProps {
  label: string;
  tone?: StatusTone;
  icon?: FeatherIconName;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// Selo de status: sempre com texto — a cor nunca é o único sinal.
export default function Chip({ label, tone = 'neutral', icon, size = 'md', style, textStyle }: ChipProps) {
  const palette = statusColors[tone];

  // O wrapper em linha mantém a largura intrínseca em pais em coluna e
  // respeita o alignItems de pais em linha (centraliza verticalmente).
  return (
    <View style={styles.wrapper}>
      <View style={[styles.base, size === 'sm' && styles.sm, { backgroundColor: palette.bg }, style]}>
        {icon && <Feather name={icon} size={14} color={palette.text} />}
        <Text
          style={[styles.text, { color: palette.text }, textStyle]}
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.chip,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  sm: {
    minHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  text: {
    ...typography.captionBold,
  },
});
