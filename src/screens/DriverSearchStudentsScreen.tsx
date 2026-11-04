import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { viagemService } from '../services/viagemService';
import { ViagemDTO, DependenteDTO, MotoristaDTO } from '../types';
import { Button, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

const PERIODS = ['MANHA_IDA', 'MANHA_VOLTA', 'TARDE_IDA', 'TARDE_VOLTA', 'NOITE_IDA', 'NOITE_VOLTA'];

export default function DriverSearchStudentsScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, showToast } = useAppContext();
  const driver = currentUser as MotoristaDTO;

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState<ViagemDTO | null>(null);
  const [availableStudents, setAvailableStudents] = useState<DependenteDTO[]>([]);

  const handleSelectPeriod = async (period: string) => {
    setSelectedPeriod(period);
    setShowPeriodDropdown(false);
    setLoading(true);

    try {
      if (!driver?.id) return;
      // 1. Create or Get fixed Trip for this period
      const trip = await viagemService.criar(driver.id, period);
      setActiveTrip(trip);

      // 2. Load available students for this trip
      const students = await viagemService.listarDependentesDisponiveis(trip.id!);
      setAvailableStudents(students);
    } catch (error: any) {
      console.error('Error selecting period:', error);
      showToast(error.response?.data?.mensagem || 'Falha ao carregar dados do período.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (studentId: number) => {
    if (!activeTrip?.id) return;
    setLoading(true);
    try {
      await viagemService.solicitarDependente(activeTrip.id, studentId);
      showToast('Convite de viagem enviado ao responsável!', 'success');

      // Refresh students
      const students = await viagemService.listarDependentesDisponiveis(activeTrip.id);
      setAvailableStudents(students);
    } catch (error: any) {
      showToast(error.response?.data?.mensagem || 'Falha ao enviar convite.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader title="Gerenciar Rota" onBack={() => navigation.goBack()} />

        <View style={styles.stepBox}>
          <Text style={styles.stepLabel}>1. Selecione o período</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowPeriodDropdown(true)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Selecionar período"
          >
            <Text style={[styles.dropdownValue, !selectedPeriod && { color: colors.slate500 }]}>
              {selectedPeriod ? `Rota: ${selectedPeriod.replace('_', ' ')}` : 'Clique para selecionar o período...'}
            </Text>
            {loading ? <ActivityIndicator size="small" color={colors.ink} /> : <Feather name="chevron-down" size={20} color={colors.ink} />}
          </TouchableOpacity>
        </View>

        {selectedPeriod && (
          <>
            <Text style={styles.stepLabel}>2. Alunos disponíveis</Text>
            <FlatList
              data={availableStudents}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.studentCard}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.nome}</Text>
                    <Text style={styles.studentAddr}>{item.endereco}</Text>
                    <Text style={styles.schoolName}>{item.escola?.nome || 'Escola não vinculada'}</Text>
                  </View>
                  <Button
                    variant="secondary"
                    size="icon"
                    icon="user-plus"
                    accessibilityLabel={`Enviar convite para ${item.nome}`}
                    onPress={() => handleRequest(item.id!)}
                    disabled={loading}
                  />
                </View>
              )}
              ListEmptyComponent={!loading ? <StateView kind="empty" icon="users" title="Nenhum novo aluno para solicitar neste período." /> : null}
            />

            <View style={styles.footer}>
              <Button
                label="Ir para roteiro do dia"
                icon="map"
                iconPosition="right"
                onPress={() => navigation.navigate('DriverRoute')}
                fullWidth
              />
            </View>
          </>
        )}

        <Modal visible={showPeriodDropdown} transparent animationType="fade" onRequestClose={() => setShowPeriodDropdown(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodDropdown(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Escolha o Período</Text>
              <ScrollView>
                {PERIODS.map(p => (
                  <TouchableOpacity key={p} style={styles.option} onPress={() => handleSelectPeriod(p)} accessibilityRole="button">
                    <Text style={styles.optionText}>{p.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  stepBox: { marginBottom: spacing.xl },
  stepLabel: { ...typography.captionBold, color: colors.slate700, marginBottom: spacing.sm },
  dropdown: { minHeight: layout.buttonLg, backgroundColor: colors.surface, borderRadius: radius.input, borderWidth: borders.hairline, borderColor: colors.border, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  dropdownValue: { ...typography.body, color: colors.ink, flexShrink: 1 },
  list: { paddingBottom: 120 },
  studentCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: borders.hairline, borderColor: colors.border },
  studentInfo: { flex: 1, gap: spacing.xs },
  studentName: { ...typography.heading, color: colors.ink },
  studentAddr: { ...typography.caption, color: colors.slate500 },
  schoolName: { ...typography.body, color: colors.ink },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: layout.screenMargin, backgroundColor: colors.background, borderTopWidth: borders.hairline, borderTopColor: colors.border },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, maxHeight: '80%', width: '100%', maxWidth: 480, alignSelf: 'center' },
  modalTitle: { ...typography.heading, color: colors.ink, textAlign: 'center', marginBottom: spacing.lg },
  option: { minHeight: layout.buttonLg, justifyContent: 'center', borderBottomWidth: borders.hairline, borderBottomColor: colors.border, alignItems: 'center' },
  optionText: { ...typography.label, color: colors.ink },
});
