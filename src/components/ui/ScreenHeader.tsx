import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, maxFontSizeMultiplier, spacing, typography } from '../../theme';
import Button from './Button';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Cabeçalho de tela: voltar (opcional) + título "title" do design + ação à direita.
export default function ScreenHeader({ title, subtitle, onBack, right, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      {onBack && (
        <Button
          variant="tertiary"
          size="icon"
          icon="arrow-left"
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={styles.back}
        />
      )}
      <View style={styles.texts}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  back: {
    marginLeft: -spacing.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    color: colors.slate500,
  },
});
