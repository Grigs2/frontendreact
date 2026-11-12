import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { motoristaService } from '../services/motoristaService';
import { MotoristaDTO } from '../types';
import { Button, Card, Chip, ScreenHeader, TextField } from '../components/ui';
import { Notice } from '../components/Feedback';
import { maskPlate, onlyDigits } from '../utils/masks';
import { validateCapacity, validatePlate, validateRequired, validateVehicleYear } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverVehicle'>;

type Field = 'modelo' | 'placa' | 'ano' | 'capacidade';

/** Cadastro e edição do veículo. É obrigatório para criar viagens. */
export default function DriverVehicleScreen({ navigation }: Props) {
  const { currentUser, setCurrentUser, showToast } = useAppContext();
  const driver = currentUser as MotoristaDTO;
  const vehicle = driver?.veiculoDTO;
  const hasVehicle = !!vehicle?.placa;

  const [editing, setEditing] = useState(!hasVehicle);
  const [modelo, setModelo] = useState(vehicle?.modelo || '');
  const [placa, setPlaca] = useState(maskPlate(vehicle?.placa || ''));
  const [ano, setAno] = useState(vehicle?.ano ? String(vehicle.ano) : '');
  const [capacidade, setCapacidade] = useState(vehicle?.capacidade ? String(vehicle.capacidade) : '');
  const [cor, setCor] = useState(vehicle?.cor || '');
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [loading, setLoading] = useState(false);

  const clearError = (field: Field) => errors[field] && setErrors((e) => ({ ...e, [field]: null }));

  const handleSave = async () => {
    const next = {
      modelo: validateRequired(modelo, 'o modelo'),
      placa: validatePlate(placa),
      ano: validateVehicleYear(ano),
      capacidade: validateCapacity(capacidade),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    if (!driver?.id) {
      showToast('Usuário não identificado. Entre novamente.', 'error');
      return;
    }

    setLoading(true);
    const data = {
      modelo: modelo.trim(),
      placa: placa.replace('-', '').toUpperCase(),
      ano: Number(onlyDigits(ano)),
      capacidade: Number(onlyDigits(capacidade)),
      cor: cor.trim() || null,
    };
    try {
      const updated = hasVehicle
        ? await motoristaService.atualizarVeiculo(driver.id, { ...data, id: vehicle?.id })
        : await motoristaService.cadastrarVeiculo(driver.id, data);
      setCurrentUser(updated, 'MOTORISTA');
      showToast(hasVehicle ? 'Veículo atualizado.' : 'Veículo cadastrado. Agora você já pode criar viagens.', 'success');
      setEditing(false);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível salvar o veículo.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DriverLayout>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            title="Meu veículo"
            subtitle={hasVehicle ? 'Dados exibidos aos responsáveis' : 'Cadastre o veículo para criar suas viagens'}
            onBack={() => navigation.goBack()}
          />

          {hasVehicle && !editing && (
            <Card style={styles.summary}>
              <View style={styles.summaryHeader}>
                <View style={styles.iconSlot}>
                  <Feather name="truck" size={layout.icon} color={colors.ink} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.summaryTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{vehicle?.modelo}</Text>
                  <Text style={styles.summaryCaption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {[vehicle?.cor, vehicle?.ano].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Chip label={maskPlate(vehicle?.placa || '')} tone="neutral" />
              </View>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue} maxFontSizeMultiplier={maxFontSizeMultiplier}>{vehicle?.capacidade}</Text>
                  <Text style={styles.statLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>lugares</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue} maxFontSizeMultiplier={maxFontSizeMultiplier}>{vehicle?.ano}</Text>
                  <Text style={styles.statLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>ano</Text>
                </View>
              </View>
              <Button label="Editar veículo" icon="edit-2" variant="secondary" onPress={() => setEditing(true)} fullWidth />
              <Button
                label="Vistoria e licenciamento"
                icon="file-text"
                variant="tertiary"
                onPress={() => navigation.navigate('DriverDocuments')}
                fullWidth
              />
            </Card>
          )}

          {editing && (
            <Card style={styles.form}>
              <TextField
                label="Modelo"
                value={modelo}
                onChangeText={(t) => {
                  setModelo(t);
                  clearError('modelo');
                }}
                placeholder="Ex.: Mercedes-Benz Sprinter"
                leftIcon="truck"
                editable={!loading}
                error={errors.modelo || undefined}
              />
              <View style={styles.row}>
                <TextField
                  label="Placa"
                  value={placa}
                  onChangeText={(t) => {
                    setPlaca(maskPlate(t));
                    clearError('placa');
                  }}
                  placeholder="ABC-1234 ou ABC1D23"
                  autoCapitalize="characters"
                  maxLength={8}
                  editable={!loading}
                  error={errors.placa || undefined}
                  containerStyle={styles.rowItem}
                />
                <TextField
                  label="Cor"
                  value={cor}
                  onChangeText={setCor}
                  placeholder="Ex.: Branca"
                  editable={!loading}
                  containerStyle={styles.rowItem}
                />
              </View>
              <View style={styles.row}>
                <TextField
                  label="Ano"
                  value={ano}
                  onChangeText={(t) => {
                    setAno(onlyDigits(t).slice(0, 4));
                    clearError('ano');
                  }}
                  keyboardType="number-pad"
                  placeholder="2022"
                  maxLength={4}
                  editable={!loading}
                  error={errors.ano || undefined}
                  containerStyle={styles.rowItem}
                />
                <TextField
                  label="Lugares"
                  value={capacidade}
                  onChangeText={(t) => {
                    setCapacidade(onlyDigits(t).slice(0, 2));
                    clearError('capacidade');
                  }}
                  keyboardType="number-pad"
                  placeholder="15"
                  maxLength={2}
                  editable={!loading}
                  hint="Passageiros, sem contar o motorista"
                  error={errors.capacidade || undefined}
                  containerStyle={styles.rowItem}
                />
              </View>
              {hasVehicle ? (
                <Notice tone="warning">
                  Alterar os dados do veículo exige reenviar a vistoria e o licenciamento para nova análise.
                </Notice>
              ) : (
                <Notice tone="info">Depois de cadastrar, envie a vistoria e o licenciamento em Documentos.</Notice>
              )}
              <View style={styles.actions}>
                <Button label={hasVehicle ? 'Salvar alterações' : 'Cadastrar veículo'} icon="check" onPress={handleSave} loading={loading} fullWidth />
                {hasVehicle && (
                  <Button label="Cancelar" variant="tertiary" onPress={() => setEditing(false)} disabled={loading} fullWidth />
                )}
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  summary: { gap: spacing.lg },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconSlot: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { ...typography.heading, color: colors.ink },
  summaryCaption: { ...typography.caption, color: colors.slate500 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { ...typography.title, color: colors.ink },
  statLabel: { ...typography.caption, color: colors.slate500 },
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowItem: { flexGrow: 1, flexBasis: 140 },
  actions: { gap: layout.buttonGap, marginTop: spacing.sm },
});
