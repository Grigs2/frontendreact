import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverVehicle'>;

export default function DriverVehicleScreen({ navigation }: Props) {
  const [modelo, setModelo] = useState('');
  const [placa, setPlaca] = useState('');
  const [ano, setAno] = useState('');
  const [capacidade, setCapacidade] = useState('');

  useEffect(() => {
    loadVehicle();
  }, []);

  const loadVehicle = async () => {
    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      if (!loggedEmail) return;

      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const user = users.find((u: { email: string }) => u.email === loggedEmail);

      if (user?.vehicle) {
        setModelo(user.vehicle.modelo || '');
        setPlaca(user.vehicle.placa || '');
        setAno(user.vehicle.ano || '');
        setCapacidade(user.vehicle.capacidade || '');
      }
    } catch {
      // silently fail
    }
  };

  const handleSave = async () => {
    if (!modelo.trim() || !placa.trim() || !ano.trim() || !capacidade.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      if (!loggedEmail) {
        Alert.alert('Erro', 'Usuário não identificado.');
        return;
      }

      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const index = users.findIndex((u: { email: string }) => u.email === loggedEmail);

      if (index === -1) {
        Alert.alert('Erro', 'Usuário não encontrado.');
        return;
      }

      users[index].vehicle = {
        modelo: modelo.trim(),
        placa: placa.trim().toUpperCase(),
        ano: ano.trim(),
        capacidade: capacidade.trim(),
      };

      await AsyncStorage.setItem('@users', JSON.stringify(users));
      console.log('Usuários salvos:', JSON.stringify(users, null, 2));
      Alert.alert('Sucesso', 'Veículo salvo com sucesso!', [
        { text: 'OK', onPress: () => navigation.navigate('DriverMain') },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <DriverLayout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Meu Veículo</Text>
          <Text style={styles.subtitle}>Informe os dados do seu veículo</Text>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Modelo</Text>
              <TextInput
                style={styles.input}
                value={modelo}
                onChangeText={setModelo}
                placeholder="Ex: Van Sprinter"
                placeholderTextColor="#86868B"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Placa</Text>
              <TextInput
                style={styles.input}
                value={placa}
                onChangeText={setPlaca}
                placeholder="Ex: ABC1D23"
                placeholderTextColor="#86868B"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ano</Text>
              <TextInput
                style={styles.input}
                value={ano}
                onChangeText={setAno}
                placeholder="Ex: 2023"
                placeholderTextColor="#86868B"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Capacidade</Text>
              <TextInput
                style={styles.input}
                value={capacidade}
                onChangeText={setCapacidade}
                placeholder="Ex: 15 passageiros"
                placeholderTextColor="#86868B"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#86868B',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    fontWeight: '400',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    color: '#1D1D1F',
    paddingHorizontal: 16,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#E53935',
  },
  cancelButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#E53935',
  },
});
