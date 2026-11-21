import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../../theme';
import Button from './Button';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Torna o título editável: exibe um lápis ao lado e chama onTitlePress ao tocar. */
  onTitlePress?: () => void;
  /** Ação ao lado do título (ex.: ícone), exibida após o lápis. */
  titleAccessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Cabeçalho de tela: voltar (opcional) + título "title" do design + ação à direita.
export default function ScreenHeader({ title, subtitle, onBack, right, onTitlePress, titleAccessory, style }: ScreenHeaderProps) {
  const titleText = (
    <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
      {title}
    </Text>
  );

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
        <View style={styles.titleLine}>
          {onTitlePress ? (
            <Pressable
              onPress={onTitlePress}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${title}`}
              style={({ pressed }) => [styles.titleRow, pressed && styles.titlePressed]}
            >
              {titleText}
              <Feather name="edit-2" size={layout.icon} color={colors.slate500} />
            </Pressable>
          ) : (
            titleText
          )}
          {titleAccessory}
        </View>
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
    flexShrink: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  titlePressed: {
    opacity: 0.6,
  },
  subtitle: {
    ...typography.body,
    color: colors.slate500,
  },
});
