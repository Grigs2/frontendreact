import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'lg' | 'md' | 'icon';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: FeatherIconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<ButtonVariant, { bg: string; pressed: string; text: string; border: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, text: colors.onPrimary, border: 'transparent' },
  secondary: { bg: colors.surface, pressed: colors.pressedNeutral, text: colors.ink, border: colors.ink },
  tertiary: { bg: 'transparent', pressed: colors.pressedNeutral, text: colors.ink, border: 'transparent' },
  destructive: { bg: colors.danger, pressed: colors.dangerPressed, text: colors.onDanger, border: 'transparent' },
};

const DISABLED: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: colors.disabledBg, text: colors.disabledText, border: 'transparent' },
  secondary: { bg: colors.surface, text: colors.disabledTextOutline, border: colors.disabledBorder },
  tertiary: { bg: 'transparent', text: colors.disabledTextOutline, border: 'transparent' },
  destructive: { bg: colors.disabledBg, text: colors.disabledText, border: 'transparent' },
};

export default function Button({
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const isDisabled = !!disabled || loading;
  const palette = VARIANTS[variant];
  const off = DISABLED[variant];
  const textColor = isDisabled ? off.text : palette.text;

  const iconNode = icon ? <Feather name={icon} size={size === 'icon' ? layout.icon : 20} color={textColor} /> : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        size === 'md' && styles.md,
        size === 'icon' && styles.icon,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: isDisabled ? off.bg : pressed ? palette.pressed : palette.bg,
          borderColor: isDisabled ? off.border : palette.border,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {iconPosition === 'left' && iconNode}
          {!!label && size !== 'icon' && (
            <Text
              style={[styles.label, { color: textColor }]}
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {label}
            </Text>
          )}
          {iconPosition === 'right' && iconNode}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.button,
    borderWidth: borders.hairline,
    paddingHorizontal: layout.buttonPaddingH,
  },
  lg: { minHeight: layout.buttonLg },
  md: { minHeight: layout.buttonMd },
  icon: { width: layout.iconButton, height: layout.iconButton, paddingHorizontal: 0 },
  fullWidth: { alignSelf: 'stretch' },
  label: { ...typography.label, flexShrink: 1 },
});
