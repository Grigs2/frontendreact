import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Logo from './Logo';
import { RootStackParamList } from '../navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const MENU_ITEMS: { key: string; label: string; icon: FeatherIconName }[] = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'DriverAttendance', label: 'Chamada', icon: 'clipboard' },
  { key: 'DriverRoute', label: 'Gerar Rota', icon: 'map-pin' },
  { key: 'DriverStudents', label: 'Gerenciar Alunos', icon: 'users' },
  { key: 'DriverProfile', label: 'Meu Cadastro', icon: 'user' },
  { key: 'DriverVehicle', label: 'Meu Veículo', icon: 'truck' },
  { key: 'DriverHistory', label: 'Histórico', icon: 'clock' },
  { key: 'DriverHelp', label: 'Ajuda', icon: 'help-circle' },
  { key: 'Sair', label: 'Sair', icon: 'log-out' },
];

interface DriverLayoutProps {
  children: React.ReactNode;
}

export default function DriverLayout({ children }: DriverLayoutProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    if (key === 'Home') {
      navigation.navigate('DriverMain');
      return;
    }
    if (key === 'Sair') {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    const screen = key as 'DriverAttendance' | 'DriverRoute' | 'DriverStudents' | 'DriverProfile' | 'DriverVehicle' | 'DriverHistory' | 'DriverHelp';
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="menu" size={28} color="#1D1D1F" />
        </TouchableOpacity>
        <View style={styles.headerLogo}>
          <Logo size="small" showText={false} />
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Page Content */}
      <View style={styles.content}>{children}</View>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={closeDrawer} />
        </Animated.View>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.drawerInner}>
            <View style={styles.drawerHeader}>
              <Logo size="small" showText={false} />
              <Text style={styles.drawerTitle}>Tio da Perua</Text>
              <TouchableOpacity onPress={closeDrawer} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={24} color="#86868B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.drawerMenu}>
              {MENU_ITEMS.map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.menuItem, key === 'Sair' && styles.menuItemSair]}
                  onPress={() => handleMenuPress(key)}
                  activeOpacity={0.7}
                >
                  <Feather name={icon} size={22} color={key === 'Sair' ? '#E53935' : '#1D1D1F'} />
                  <Text style={[styles.menuLabel, key === 'Sair' && styles.menuLabelSair]}>{label}</Text>
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerLogo: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    backgroundColor: '#FFFFFF',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  drawerInner: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  drawerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    flex: 1,
    marginLeft: 12,
  },
  drawerMenu: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemSair: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 20,
  },
  menuLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
    marginLeft: 16,
  },
  menuLabelSair: {
    color: '#E53935',
  },
});
