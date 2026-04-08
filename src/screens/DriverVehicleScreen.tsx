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
      const user = users.find((u: any) => u.email === loggedEmail);
      if (user?.vehicle) {
        setModelo(user.vehicle.modelo || '');
        setPlaca(user.vehicle.placa || '');
        setAno(user.vehicle.ano || '');
        setCapacidade(user.vehicle.capacidade || '');
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!modelo.trim() || !placa.trim() || !ano.trim() || !capacidade.trim()) {
      if (Platform.OS === 'web') window.alert('Preencha todos os campos.');
      else Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const index = users.findIndex((u: any) => u.email === loggedEmail);

      if (index !== -1) {
        users[index].vehicle = { modelo, placa: placa.toUpperCase(), ano, capacidade };
        await AsyncStorage.setItem('@users', JSON.stringify(users));
        if (Platform.OS === 'web') {
          window.alert('Veículo salvo!');
          navigation.navigate('DriverMain');
        } else {
          Alert.alert('Sucesso', 'Veículo salvo!', [{ text: 'OK', onPress: () => navigation.navigate('DriverMain') }]);
        }
      }
    } catch {
      if (Platform.OS === 'web') window.alert('Erro ao salvar.');
    }
  };

  return (
      <DriverLayout>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Meu Veículo</Text>
            <Text style={styles.subtitle}>Informe os dados do seu veículo</Text>
            <View style={styles.card}>
              <View style={styles.fieldGroup}><Text style={styles.label}>Modelo</Text><TextInput style={styles.input} value={modelo} onChangeText={setModelo} /></View>
              <View style={styles.fieldGroup}><Text style={styles.label}>Placa</Text><TextInput style={styles.input} value={placa} onChangeText={setPlaca} /></View>
              <View style={styles.fieldGroup}><Text style={styles.label}>Ano</Text><TextInput style={styles.input} value={ano} onChangeText={setAno} keyboardType="numeric" /></View>
              <View style={styles.fieldGroup}><Text style={styles.label}>Capacidade</Text><TextInput style={styles.input} value={capacidade} onChangeText={setCapacidade} keyboardType="numeric" /></View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveButtonText}>Salvar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </DriverLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1D1D1F', marginBottom: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#86868B', marginBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, elevation: 4 },
  fieldGroup: { marginBottom: 24 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1D1D1F', marginBottom: 12 },
  input: { fontFamily: 'Inter_400Regular', fontSize: 17, height: 52, borderRadius: 12, backgroundColor: '#F5F5F7', paddingHorizontal: 16 },
  saveButton: { height: 52, borderRadius: 12, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as any,
  saveButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },
  cancelButton: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 2, borderColor: '#E53935', cursor: 'pointer' } as any,
  cancelButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#E53935' },
});