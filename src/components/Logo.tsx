import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const logoImage = require('../../assets/logo.png');

const dimensions = {
  small: { width: 40, height: 40 },
  medium: { width: 60, height: 60 },
  large: { width: 120, height: 120 },
};

export default function Logo({ size = 'medium', showText = true }: LogoProps) {
  const { width, height } = dimensions[size];

  return (
    <View style={styles.container}>
      <Image
        source={logoImage}
        accessibilityLabel="Logotipo Tio da Perua"
        style={{ width, height, resizeMode: 'contain' }}
      />
      {showText && size !== 'small' && (
        <Text
          accessibilityRole="header"
          style={[
            styles.text,
            { fontSize: size === 'large' ? 32 : 20 },
          ]}
        >
          Tio da Perua
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    fontFamily: fonts.bold,
    color: colors.ink,
    letterSpacing: -0.5,
  },
});
