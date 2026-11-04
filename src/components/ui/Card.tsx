import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { borders, colors, layout, radius } from '../../theme';

export type CardVariant = 'default' | 'alert' | 'selected' | 'muted';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<CardVariant, ViewStyle> = {
  default: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: borders.hairline },
  alert: { backgroundColor: colors.dangerTint, borderColor: colors.danger, borderWidth: borders.alert },
  selected: { backgroundColor: colors.primaryTint, borderColor: colors.primaryPressed, borderWidth: borders.alert },
  muted: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: borders.hairline },
};

// Superfície padrão do design: padding 16, raio 16, borda 1px, sem sombra.
export default function Card({ children, variant = 'default', onPress, disabled, accessibilityLabel, style }: CardProps) {
  if (!onPress) {
    return <View style={[styles.base, VARIANTS[variant], style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        VARIANTS[variant],
        pressed && variant === 'default' && { backgroundColor: colors.background },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    padding: layout.cardPadding,
    gap: layout.cardGap,
  },
});
