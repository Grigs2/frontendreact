import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteParadaDTO } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Button } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

export default function DriverAttendanceDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setCurrentStops, showToast } = useAppContext();

  const { tripId, stopId, students, stopDescription } = route.params;
  const [submittingIds, setSubmittingIds] = useState<Record<number, boolean>>({});
  const [selectedStudent, setSelectedStudent] = useState<DependenteParadaDTO | null>(null);

  const handleAction = async (studentId: number, status: 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU') => {
    if (submittingIds[studentId]) return;
    setSubmittingIds(prev => ({ ...prev, [studentId]: true }));
    try {
      const updatedStops = await viagemService.alterarStatusPresenca(tripId, studentId, status);
      setCurrentStops(updatedStops);
      showToast(`Status de ${status} registrado!`, 'success');
    } catch (error: any) {
      console.error('Attendance Error:', error);
      showToast(error.response?.data?.mensagem || 'Falha ao registrar presença.', 'error');
    } finally {
      setSubmittingIds(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const isGlobalLoading = Object.values(submittingIds).some(v => v);

  return (
    <View style={styles.container}>
      {/* Exclusive Call Header */}
      <View style={styles.header}>
        <Button variant="tertiary" size="icon" icon="arrow-left" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.backBtn} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Controle de Chamada</Text>
          <Text style={styles.subtitle}>{stopDescription} (Parada {stopId})</Text>
        </View>
        {isGlobalLoading && <ActivityIndicator size="small" color={colors.ink} />}
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const status = item.statusEmbarque;
          const isSubmitting = !!submittingIds[item.id];
          return (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => setSelectedStudent(item)}
                style={styles.studentInfo}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes de ${item.nomeDependente}`}
              >
                <Text style={styles.studentName}>{item.nomeDependente}</Text>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.ink} />
                ) : (
                  <StatusBadge
                    status={status}
                    variant={status === 'EMBARCADO' ? 'success' : status === 'DESEMBARCADO' ? 'info' : status === 'FALTOU' ? 'error' : 'default'}
                  />
                )}
              </TouchableOpacity>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.bigBtn, styles.btnEmbarque, status === 'EMBARCADO' && styles.btnActive]}
                  onPress={() => handleAction(item.id, 'EMBARCADO')}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === 'EMBARCADO', disabled: isSubmitting }}
                >
                  <Feather name="log-in" size={24} color={colors.surface} />
                  <Text style={styles.btnLabel}>Confirmar Embarque</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bigBtn, styles.btnDesembarque, status === 'DESEMBARCADO' && styles.btnActive]}
                  onPress={() => handleAction(item.id, 'DESEMBARCADO')}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === 'DESEMBARCADO', disabled: isSubmitting }}
                >
                  <Feather name="log-out" size={24} color={colors.surface} />
                  <Text style={styles.btnLabel}>Confirmar Desembarque</Text>
                </TouchableOpacity>
              </View>

              <Button
                label="Marcar como Falta"
                icon="x-circle"
                variant="tertiary"
                onPress={() => handleAction(item.id, 'FALTOU')}
                disabled={isSubmitting}
                fullWidth
                style={styles.btnFaltou}
              />
            </View>
          );
        }}
      />

      <Modal visible={!!selectedStudent} transparent animationType="slide" onRequestClose={() => setSelectedStudent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informações do Aluno</Text>
              <Button variant="tertiary" size="icon" icon="x" accessibilityLabel="Fechar" onPress={() => setSelectedStudent(null)} />
            </View>
            {selectedStudent && (
              <ScrollView>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Nome do Aluno:</Text>
                  <Text style={styles.detailValue}>{selectedStudent.nomeDependente}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Nome do Responsável:</Text>
                  <Text style={styles.detailValue}>{selectedStudent.nomeResponsavel}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status Atual:</Text>
                  <Text style={styles.detailValue}>{selectedStudent.statusEmbarque}</Text>
                </View>
              </ScrollView>
            )}
            <Button label="Fechar Detalhes" variant="secondary" onPress={() => setSelectedStudent(null)} fullWidth style={styles.closeModalBtn} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.screenMargin, paddingBottom: spacing.md, paddingTop: 48, backgroundColor: colors.surface, borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  backBtn: { marginLeft: -spacing.md },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.caption, color: colors.slate500 },
  list: { padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border },
  studentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: borders.hairline, borderBottomColor: colors.border, minHeight: layout.minTouch },
  studentName: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  bigBtn: { flex: 1, minHeight: 96, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', padding: spacing.md, gap: spacing.sm, borderWidth: borders.alert, borderColor: 'transparent' },
  btnEmbarque: { backgroundColor: colors.success },
  btnDesembarque: { backgroundColor: colors.info },
  btnActive: { borderColor: colors.ink },
  btnLabel: { ...typography.label, color: colors.surface, textAlign: 'center' },
  btnFaltou: { borderColor: colors.danger },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '80%', width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.title, color: colors.ink, flexShrink: 1 },
  detailItem: { marginBottom: spacing.lg, gap: spacing.xs },
  detailLabel: { ...typography.caption, color: colors.slate500 },
  detailValue: { ...typography.bodyLg, color: colors.ink },
  closeModalBtn: { marginTop: spacing.lg },
});
