import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import DriverLayout from '../components/DriverLayout';
import { RootStackParamList } from '../navigation';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type DriverScreenKey = 'DriverAttendance' | 'DriverRoute' | 'DriverStudents' | 'DriverProfile' | 'DriverVehicle' | 'DriverHistory' | 'DriverHelp';

const FEATURES: { key: DriverScreenKey; label: string; icon: FeatherIconName }[] = [
  { key: 'DriverAttendance', label: 'Chamada', icon: 'clipboard' },
  { key: 'DriverRoute', label: 'Gerar Rota', icon: 'map-pin' },
  { key: 'DriverStudents', label: 'Gerenciar Alunos', icon: 'users' },
  { key: 'DriverProfile', label: 'Meu Cadastro', icon: 'user' },
  { key: 'DriverVehicle', label: 'Meu Veículo', icon: 'truck' },
  { key: 'DriverHistory', label: 'Histórico', icon: 'clock' },
  { key: 'DriverHelp', label: 'Ajuda', icon: 'help-circle' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'DriverMain'>;

export default function DriverMainScreen({ navigation }: Props) {
  const handleFeaturePress = (key: DriverScreenKey) => {
    navigation.navigate(key);
  };

  return (
    <DriverLayout>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.gridContainer}>
        <Text style={styles.greeting}>Olá, Motorista!</Text>
        <View style={styles.grid}>
          {FEATURES.map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={styles.featureCard}
              onPress={() => handleFeaturePress(key)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Feather name={icon} size={32} color="#1976D2" />
              </View>
              <Text style={styles.featureLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 24,
  },
  gridContainer: {
    padding: 20,
    paddingTop: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EBF2FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
  },
});
