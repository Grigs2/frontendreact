import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

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
        style={{ width, height, resizeMode: 'contain' }}
      />
      {showText && size !== 'small' && (
        <Text
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
    gap: 12,
  },
  text: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
});
