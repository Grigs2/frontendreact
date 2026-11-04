import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borders, colors, layout, maxFontSizeMultiplier, radius, typography } from '../../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface ShortcutCardProps {
  label: string;
  icon: FeatherIconName;
  caption?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

// card/atalho do design: slot de ícone 48 (tint), label 18 Bold e apoio opcional.
export default function ShortcutCard({ label, icon, caption, onPress, style }: ShortcutCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${label}, ${caption}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
    >
      <View style={styles.iconSlot}>
        <Feather name={icon} size={layout.icon} color={colors.ink} />
      </View>
      <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {label}
      </Text>
      {!!caption && (
        <Text style={styles.caption} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {caption}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '40%',
    // Grid de 2 colunas: um card sozinho na última linha não ocupa a largura toda
    maxWidth: '48.5%',
    minHeight: 132,
    gap: layout.cardGap,
    padding: layout.cardPadding,
    borderRadius: radius.card,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    backgroundColor: colors.background,
  },
  iconSlot: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.label,
    fontSize: 18,
    lineHeight: 22,
    color: colors.ink,
  },
  caption: {
    ...typography.caption,
    color: colors.slate500,
  },
});
