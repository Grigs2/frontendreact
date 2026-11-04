import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { motoristaService } from '../services/motoristaService';
import { MotoristaDTO } from '../types';
import { Button, ScreenHeader, TextField } from '../components/ui';
import { borders, colors, layout, spacing } from '../theme';

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
            <ScreenHeader title="Meu Veículo" subtitle="Informe os dados do seu veículo" />
            <View style={styles.card}>
              <TextField
                label="Modelo"
                value={modelo}
                onChangeText={setModelo}
                placeholder="Ex: Mercedes-Benz Sprinter"
                editable={!loading}
              />
              <TextField
                label="Placa"
                value={placa}
                onChangeText={setPlaca}
                placeholder="ABC-1234"
                autoCapitalize="characters"
                editable={!loading}
              />
              <TextField
                label="Ano"
                value={ano}
                onChangeText={setAno}
                keyboardType="numeric"
                placeholder="2022"
                editable={!loading}
              />
              <TextField
                label="Capacidade"
                value={capacidade}
                onChangeText={setCapacidade}
                keyboardType="numeric"
                placeholder="20"
                editable={!loading}
              />
              <View style={styles.actions}>
                <Button label="Salvar" onPress={handleSave} loading={loading} fullWidth />
                <Button label="Cancelar" variant="tertiary" onPress={() => navigation.goBack()} disabled={loading} fullWidth />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </DriverLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, gap: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border },
  actions: { gap: layout.buttonGap, marginTop: spacing.sm },
});
