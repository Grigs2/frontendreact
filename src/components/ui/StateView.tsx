import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';
import Button from './Button';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface StateViewProps {
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  icon?: FeatherIconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ICON: Record<'empty' | 'error', FeatherIconName> = {
  empty: 'inbox',
  error: 'alert-circle',
};

// Estados de feedback padronizados: carregando, vazio e erro.
export default function StateView({ kind, title, message, icon, actionLabel, onAction, style }: StateViewProps) {
  if (kind === 'loading') {
    return (
      <View style={[styles.container, style]} accessibilityRole="progressbar" accessibilityLabel={title ?? 'Carregando'}>
        <ActivityIndicator size="large" color={colors.ink} />
        {!!title && (
          <Text style={styles.message} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {title}
          </Text>
        )}
      </View>
    );
  }

  const isError = kind === 'error';

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconSlot, { backgroundColor: isError ? colors.dangerTint : colors.primaryTint }]}>
        <Feather name={icon ?? DEFAULT_ICON[kind]} size={layout.icon} color={isError ? colors.danger : colors.ink} />
      </View>
      {!!title && (
        <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {title}
        </Text>
      )}
      {!!message && (
        <Text style={styles.message} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {message}
        </Text>
      )}
      {!!actionLabel && onAction && (
        <Button label={actionLabel} variant="secondary" size="md" onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconSlot: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.slate500,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
