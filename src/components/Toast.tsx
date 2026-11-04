import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { borders, colors, elevation, layout, maxFontSizeMultiplier, radius, spacing, statusColors, typography } from '../theme';

const TOAST_VARIANTS = {
  success: {
    backgroundColor: statusColors.success.bg,
    borderColor: statusColors.success.border,
    icon: 'check-circle' as const,
    iconColor: statusColors.success.text,
    textColor: colors.ink,
  },
  error: {
    backgroundColor: statusColors.danger.bg,
    borderColor: statusColors.danger.border,
    icon: 'alert-circle' as const,
    iconColor: statusColors.danger.text,
    textColor: colors.ink,
  },
  warning: {
    backgroundColor: statusColors.warning.bg,
    borderColor: statusColors.warning.border,
    icon: 'alert-triangle' as const,
    iconColor: statusColors.warning.text,
    textColor: colors.ink,
  },
  info: {
    backgroundColor: statusColors.info.bg,
    borderColor: statusColors.info.border,
    icon: 'info' as const,
    iconColor: statusColors.info.text,
    textColor: colors.ink,
  },
};

export default function Toast() {
  const { toast, hideToast } = useAppContext();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const [shouldRender, setShouldRender] = React.useState(false);

  useEffect(() => {
    if (toast.visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, 4000);

      return () => clearTimeout(timer);
    } else if (shouldRender) {
      hide();
    }
  }, [toast.visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShouldRender(false);
      hideToast();
    });
  };

  if (!shouldRender) return null;

  const variant = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.content,
          {
            backgroundColor: variant.backgroundColor,
            borderColor: variant.borderColor,
          },
        ]}
      >
        <Feather name={variant.icon} size={layout.icon} color={variant.iconColor} />
        <Text style={[styles.text, { color: variant.textColor }]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: layout.screenMargin,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonLg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: borders.alert,
    maxWidth: Platform.OS === 'web' ? 420 : '100%',
    width: Platform.OS === 'web' ? 'auto' : '100%',
    ...elevation.overlay,
  },
  text: {
    ...typography.body,
    fontFamily: typography.label.fontFamily,
    flexShrink: 1,
  },
});
