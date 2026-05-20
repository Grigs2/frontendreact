import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { motoristaService } from '../services/motoristaService';
import { MotoristaDTO } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverVehicle'>;

export default function DriverVehicleScreen({ navigation }: Props) {
  const { currentUser, setCurrentUser, showToast } = useAppContext();
  const driver = currentUser as MotoristaDTO;

  const [modelo, setModelo] = useState(driver?.veiculoDTO?.modelo || '');
  const [placa, setPlaca] = useState(driver?.veiculoDTO?.placa || '');
  const [ano, setAno] = useState(driver?.veiculoDTO?.ano?.toString() || '');
  const [capacidade, setCapacidade] = useState(driver?.veiculoDTO?.capacidade?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!modelo.trim() || !placa.trim() || !ano.trim() || !capacidade.trim()) {
      showToast('Preencha todos os campos.', 'warning');
      return;
    }

    if (!driver?.id) {
      showToast('Usuário não identificado.', 'error');
      return;
    }

    setLoading(true);
    try {
      const updatedDriver = await motoristaService.cadastrarVeiculo(driver.id, {
        modelo: modelo.trim(),
        placa: placa.trim().toUpperCase(),
        ano: parseInt(ano),
        capacidade: parseInt(capacidade),
      });

      setCurrentUser(updatedDriver, 'MOTORISTA');
      showToast('Veículo salvo com sucesso!', 'success');
      navigation.navigate('DriverMain');
    } catch (error: any) {
      console.error('Vehicle Save Error:', error);
      showToast(error.response?.data?.mensagem || 'Não foi possível salvar os dados do veículo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
      <DriverLayout>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                  placeholder="Ex: Mercedes-Benz Sprinter"
                  editable={!loading}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Placa</Text>
                <TextInput 
                  style={styles.input} 
                  value={placa} 
                  onChangeText={setPlaca} 
                  placeholder="ABC-1234"
                  autoCapitalize="characters"
                  editable={!loading}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Ano</Text>
                <TextInput 
                  style={styles.input} 
                  value={ano} 
                  onChangeText={setAno} 
                  keyboardType="numeric" 
                  placeholder="2022"
                  editable={!loading}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Capacidade</Text>
                <TextInput 
                  style={styles.input} 
                  value={capacidade} 
                  onChangeText={setCapacidade} 
                  keyboardType="numeric" 
                  placeholder="20"
                  editable={!loading}
                />
              </View>
              <TouchableOpacity 
                style={[styles.saveButton, loading && { opacity: 0.7 }]} 
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
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
  saveButton: { height: 52, borderRadius: 12, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },
  cancelButton: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 2, borderColor: '#E53935' },
  cancelButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#E53935' },
});
