import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium';
}

const VARIANTS = {
  success: {
    bg: '#E8F5E9',
    text: '#34C759',
  },
  warning: {
    bg: '#FFF8E1',
    text: '#FFCC00',
  },
  error: {
    bg: '#FFEBEE',
    text: '#FF3B30',
  },
  info: {
    bg: '#E3F2FD',
    text: '#1976D2',
  },
  default: {
    bg: '#F2F2F7',
    text: '#86868B',
  },
};

export default function StatusBadge({ status, variant = 'default', style, textStyle, size = 'medium' }: StatusBadgeProps) {
  const colors = VARIANTS[variant] || VARIANTS.default;

  return (
    <View style={[
      styles.badge, 
      { backgroundColor: colors.bg }, 
      size === 'small' && styles.badgeSmall,
      style
    ]}>
      <Text style={[
        styles.text, 
        { color: colors.text }, 
        size === 'small' && styles.textSmall,
        textStyle
      ]}>
        {status.replace('_', ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  textSmall: {
    fontSize: 9,
  },
});
