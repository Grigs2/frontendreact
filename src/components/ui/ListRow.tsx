import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface ListRowProps {
  title: string;
  caption?: string;
  icon?: FeatherIconName;
  onPress?: () => void;
  /** Elemento à direita (ex.: Chip). Sem ele, linhas clicáveis mostram uma seta. */
  right?: React.ReactNode;
  tone?: 'default' | 'danger';
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Linha de lista do design: slot de ícone 40, título 16 Bold, apoio 14 e seta. Altura mínima de toque 56. */
export default function ListRow({ title, caption, icon, onPress, right, tone = 'default', divider = false, style }: ListRowProps) {
  const danger = tone === 'danger';
  const body = (
    <>
      {!!icon && (
        <View style={[styles.iconSlot, danger && styles.iconSlotDanger]}>
          <Feather name={icon} size={20} color={danger ? colors.danger : colors.ink} />
        </View>
      )}
      <View style={styles.texts}>
        <Text style={[styles.title, danger && styles.titleDanger]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {title}
        </Text>
        {!!caption && (
          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {caption}
          </Text>
        )}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={20} color={colors.slate500} /> : null)}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, divider && styles.divider, style]}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${title}, ${caption}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonLg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  divider: { borderTopWidth: borders.hairline, borderTopColor: colors.border, borderRadius: 0 },
  pressed: { backgroundColor: colors.background },
  iconSlot: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlotDanger: { backgroundColor: colors.dangerTint },
  texts: { flex: 1, gap: 2 },
  title: { ...typography.label, color: colors.ink },
  titleDanger: { color: colors.danger },
  caption: { ...typography.caption, color: colors.slate500 },
});
