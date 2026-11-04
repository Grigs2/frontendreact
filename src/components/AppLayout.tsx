import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Logo from './Logo';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/authService';
import { borders, colors, elevation, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export type MenuItem = { key: string; label: string; icon: FeatherIconName };

export type LayoutRole = 'driver' | 'guardian' | 'school';

export const MENU_ITEMS: Record<LayoutRole, MenuItem[]> = {
  driver: [
    { key: 'DriverMain', label: 'Início', icon: 'home' },
    { key: 'DriverAttendance', label: 'Chamada', icon: 'clipboard' },
    { key: 'DriverTrips', label: 'Roteiro', icon: 'map-pin' },
    { key: 'NotificationList', label: 'Notificações', icon: 'bell' },
    { key: 'DriverProfile', label: 'Meu Cadastro', icon: 'user' },
    { key: 'DriverVehicle', label: 'Meu Veículo', icon: 'truck' },
    { key: 'DriverHistory', label: 'Histórico', icon: 'clock' },
    { key: 'Sair', label: 'Sair', icon: 'log-out' },
  ],
  guardian: [
    { key: 'GuardianMain', label: 'Início', icon: 'home' },
    { key: 'GuardianTracking', label: 'Monitoramento', icon: 'navigation' },
    { key: 'GuardianInvites', label: 'Convites', icon: 'mail' },
    { key: 'GuardianDependents', label: 'Dependentes', icon: 'users' },
    { key: 'NotificationList', label: 'Notificações', icon: 'bell' },
    { key: 'GuardianPlans', label: 'Planos', icon: 'credit-card' },
    { key: 'GuardianProfile', label: 'Meu Cadastro', icon: 'user' },
    { key: 'Sair', label: 'Sair', icon: 'log-out' },
  ],
  school: [
    { key: 'SchoolMain', label: 'Início', icon: 'home' },
    { key: 'NotificationList', label: 'Notificações', icon: 'bell' },
    { key: 'SchoolProfile', label: 'Meu Cadastro', icon: 'user' },
    { key: 'Sair', label: 'Sair', icon: 'log-out' },
  ],
};

interface AppLayoutProps {
  role: LayoutRole;
  children: React.ReactNode;
}

export default function AppLayout({ role, children }: AppLayoutProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { setCurrentUser } = useAppContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const handleMenuPress = (key: string) => {
    closeDrawer();
    if (key === 'Sair') {
      // Revoga a sessão no backend (sem bloquear a saída se a rede falhar) e limpa o usuário.
      authService.sair();
      setCurrentUser(null, null);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    const screen = key as any;
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={openDrawer}
          accessibilityRole="button"
          accessibilityLabel="Abrir menu"
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
        >
          <Feather name="menu" size={layout.icon} color={colors.ink} />
        </Pressable>
        <View style={styles.headerBrand}>
          <Logo size="small" showText={false} />
          <Text style={styles.headerTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Tio da Perua
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Page Content */}
      <View style={styles.content}>{children}</View>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={styles.overlayTouch} onPress={closeDrawer} accessibilityLabel="Fechar menu" />
        </Animated.View>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.drawerInner}>
            <View style={styles.drawerHeader}>
              <Logo size="small" showText={false} />
              <Text style={styles.drawerTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Tio da Perua
              </Text>
              <Pressable
                onPress={closeDrawer}
                accessibilityRole="button"
                accessibilityLabel="Fechar menu"
                style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
              >
                <Feather name="x" size={layout.icon} color={colors.slate500} />
              </Pressable>
            </View>
            <ScrollView style={styles.drawerMenu} contentContainerStyle={styles.drawerMenuContent}>
              {MENU_ITEMS[role].map(({ key, label, icon }) => {
                const isExit = key === 'Sair';
                const isActive = route.name === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleMenuPress(key)}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: isActive }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      isExit && styles.menuItemExit,
                      isActive && styles.menuItemActive,
                      pressed && !isActive && styles.menuItemPressed,
                    ]}
                  >
                    <Feather name={icon} size={layout.icon} color={isExit ? colors.danger : isActive ? colors.ink : colors.slate500} />
                    <Text
                      style={[styles.menuLabel, isActive && styles.menuLabelActive, isExit && styles.menuLabelExit]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: 40,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPressed: {
    backgroundColor: colors.pressedNeutral,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.label,
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    zIndex: 10,
  },
  overlayTouch: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    zIndex: 20,
    ...elevation.overlay,
  },
  drawerInner: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingTop: 40,
    paddingBottom: spacing.lg,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.border,
  },
  drawerTitle: {
    ...typography.heading,
    color: colors.ink,
    flex: 1,
  },
  drawerMenu: {
    flex: 1,
  },
  drawerMenuContent: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: layout.buttonLg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  menuItemPressed: {
    backgroundColor: colors.pressedNeutral,
  },
  menuItemActive: {
    backgroundColor: colors.primaryTint,
  },
  menuItemExit: {
    marginTop: spacing.md,
  },
  menuLabel: {
    ...typography.bodyLg,
    color: colors.slate700,
  },
  menuLabelActive: {
    ...typography.label,
    fontSize: 18,
    color: colors.ink,
  },
  menuLabelExit: {
    color: colors.danger,
  },
});
