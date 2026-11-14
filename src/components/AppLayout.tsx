import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomTabBar, { BottomTab } from './BottomTabBar';
import ConnectivityBanner from './ConnectivityBanner';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

export type LayoutRole = 'driver' | 'guardian' | 'school' | 'admin';

/**
 * Navegação principal: só a barra inferior (o menu lateral foi removido).
 * Telas que não são abas ficam acessíveis pelos atalhos do Início e pela seção "Mais opções" do Perfil.
 */
export const BOTTOM_TABS: Record<LayoutRole, BottomTab[]> = {
  driver: [
    { key: 'DriverMain', label: 'Início', icon: 'home' },
    { key: 'DriverTrips', label: 'Rotas', icon: 'map' },
    { key: 'DriverInvites', label: 'Vínculos', icon: 'link' },
    { key: 'DriverHistory', label: 'Histórico', icon: 'clock' },
    { key: 'DriverProfile', label: 'Perfil', icon: 'user' },
  ],
  guardian: [
    { key: 'GuardianMain', label: 'Início', icon: 'home' },
    { key: 'GuardianDependents', label: 'Alunos', icon: 'users' },
    { key: 'GuardianSearchDriver', label: 'Motoristas', icon: 'search' },
    { key: 'GuardianInvites', label: 'Vínculos', icon: 'link' },
    { key: 'GuardianProfile', label: 'Perfil', icon: 'user' },
  ],
  school: [
    { key: 'SchoolMain', label: 'Início', icon: 'home' },
    { key: 'SchoolDrivers', label: 'Motoristas', icon: 'truck' },
    { key: 'NotificationList', label: 'Avisos', icon: 'bell' },
    { key: 'SchoolProfile', label: 'Perfil', icon: 'user' },
  ],
  admin: [
    { key: 'AdminMain', label: 'Painel', icon: 'grid' },
    { key: 'AdminDocuments', label: 'Documentos', icon: 'file-text' },
    { key: 'AdminUsers', label: 'Contas', icon: 'users' },
    { key: 'AdminLinks', label: 'Vínculos', icon: 'link' },
    { key: 'AdminAudit', label: 'Auditoria', icon: 'shield' },
  ],
};

/** Telas internas destacam a aba de onde vieram. */
const PARENT_TAB: Record<string, string> = {
  DriverTripDetails: 'DriverTrips',
  DriverAvailableDependents: 'DriverTrips',
  DriverAttendance: 'DriverTrips',
  DriverAttendanceDetail: 'DriverTrips',
  DriverStudents: 'DriverTrips',
  DriverSearchStudents: 'DriverInvites',
  DriverVehicle: 'DriverProfile',
  DriverHelp: 'DriverProfile',
  GuardianDependentForm: 'GuardianDependents',
  GuardianTracking: 'GuardianMain',
  GuardianMonitoring: 'GuardianMain',
  GuardianHistory: 'GuardianMain',
  GuardianPlans: 'GuardianProfile',
  GuardianHelp: 'GuardianProfile',
  DriverDocuments: 'DriverProfile',
  DriverSchools: 'DriverProfile',
  DriverSchoolLinkDetail: 'DriverProfile',
  DriverTripDay: 'DriverTrips',
  DriverRouteOrder: 'DriverTrips',
  DriverFocus: 'DriverTrips',
  DriverMap: 'DriverTrips',
  GuardianDependentDetail: 'GuardianDependents',
  GuardianDependentAddresses: 'GuardianDependents',
  GuardianDependentGuardians: 'GuardianDependents',
  SchoolDriverLinkDetail: 'SchoolDrivers',
  AdminSchools: 'AdminUsers',
};

/** Telas de execução da viagem: sem sino e sem barra inferior, para ganhar espaço. */
const TELAS_SEM_NAVEGACAO = ['DriverAttendance'];

/** Intervalo de atualização do contador do sino enquanto o app está aberto. */
const CONTADOR_INTERVALO_MS = 60000;

interface AppLayoutProps {
  role: LayoutRole;
  children: React.ReactNode;
}

export default function AppLayout({ role, children }: AppLayoutProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const activeKey = PARENT_TAB[route.name] ?? route.name;
  const semNavegacao = TELAS_SEM_NAVEGACAO.includes(route.name);
  const showBell = role !== 'admin' && route.name !== 'NotificationList' && !semNavegacao;
  const { unreadCount, refreshUnreadCount } = useAppContext();

  // Atualiza o contador ao trocar de tela e a cada minuto.
  useEffect(() => {
    if (role === 'admin') return undefined;
    refreshUnreadCount();
    const timer = setInterval(refreshUnreadCount, CONTADOR_INTERVALO_MS);
    return () => clearInterval(timer);
  }, [role, route.name, refreshUnreadCount]);

  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  const handleTabPress = (key: string) => {
    if (route.name !== key) navigation.navigate(key as any);
  };

  return (
    <View style={styles.screen}>
      {showBell && (
        <View style={[styles.header, { top: Math.max(insets.top, spacing.sm) + spacing.xs }]} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.navigate('NotificationList')}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'
            }
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            <Feather name="bell" size={layout.icon} color={colors.ink} />
            {unreadCount > 0 && (
              <View style={styles.badge} pointerEvents="none">
                <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
                  {badge}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {role === 'driver' && <ConnectivityBanner />}

      <View style={styles.content}>{children}</View>

      {!semNavegacao && <BottomTabBar items={BOTTOM_TABS[role]} activeKey={activeKey} onPress={handleTabPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
  },
  headerButton: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    ...typography.captionBold,
    fontSize: 10,
    lineHeight: 12,
    color: colors.onDanger,
  },
  headerButtonPressed: {
    backgroundColor: colors.pressedNeutral,
  },
  content: {
    flex: 1,
  },
});
