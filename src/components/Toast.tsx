import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOAST_VARIANTS = {
  success: {
    backgroundColor: '#E8F5E9',
    borderColor: '#34C759',
    icon: 'check-circle' as const,
    iconColor: '#34C759',
    textColor: '#1B5E20',
  },
  error: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF3B30',
    icon: 'alert-circle' as const,
    iconColor: '#FF3B30',
    textColor: '#B71C1C',
  },
  warning: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFCC00',
    icon: 'alert-triangle' as const,
    iconColor: '#FFCC00',
    textColor: '#7F6000',
  },
  info: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    icon: 'info' as const,
    iconColor: '#1976D2',
    textColor: '#0D47A1',
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
        <Feather name={variant.icon} size={20} color={variant.iconColor} />
        <Text style={[styles.text, { color: variant.textColor }]}>
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
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: Platform.OS === 'web' ? 420 : '100%',
    width: Platform.OS === 'web' ? 'auto' : '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  text: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
  },
});
