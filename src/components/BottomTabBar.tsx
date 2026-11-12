import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borders, colors, fonts, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export type BottomTab = { key: string; label: string; icon: FeatherIconName };

interface BottomTabBarProps {
  items: BottomTab[];
  activeKey: string;
  onPress: (key: string) => void;
}

export default function BottomTabBar({ items, activeKey, onPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {items.map(({ key, label, icon }) => {
        const isActive = activeKey === key;
        return (
          <Pressable
            key={key}
            onPress={() => onPress(key)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
          >
            <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
              <Feather name={icon} size={layout.icon} color={isActive ? colors.ink : colors.slate500} />
            </View>
            <Text
              style={[styles.label, isActive && styles.labelActive]}
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    minHeight: layout.tabBar,
    backgroundColor: colors.surface,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.button,
  },
  tabPressed: {
    backgroundColor: colors.pressedNeutral,
  },
  iconPill: {
    width: 56,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.slate500,
  },
  labelActive: {
    fontFamily: fonts.bold,
    color: colors.ink,
  },
});
