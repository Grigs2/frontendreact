import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteParadaDTO } from '../types';

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
        <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#1D1D1F" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Controle de Chamada</Text>
          <Text style={styles.subtitle}>{stopDescription} (Parada {stopId})</Text>
        </View>
        {isGlobalLoading && <ActivityIndicator size="small" color="#1976D2" />}
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
              <TouchableOpacity onPress={() => setSelectedStudent(item)} style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.nomeDependente}</Text>
                <View style={[styles.badge, { backgroundColor: status === 'EMBARCADO' ? '#E8F5E9' : status === 'DESEMBARCADO' ? '#E3F2FD' : '#F5F5F7' }]}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#1976D2" />
                  ) : (
                    <Text style={[styles.badgeText, { color: status === 'EMBARCADO' ? '#2E7D32' : status === 'DESEMBARCADO' ? '#1976D2' : '#666' }]}>
                      {status}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.bigBtn, styles.btnEmbarque, status === 'EMBARCADO' && styles.btnActive]}
                  onPress={() => handleAction(item.id, 'EMBARCADO')}
                  disabled={isSubmitting}
                >
                  <Feather name="log-in" size={24} color="#FFF" />
                  <Text style={styles.btnLabel}>Confirmar Embarque</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.bigBtn, styles.btnDesembarque, status === 'DESEMBARCADO' && styles.btnActive]}
                  onPress={() => handleAction(item.id, 'DESEMBARCADO')}
                  disabled={isSubmitting}
                >
                  <Feather name="log-out" size={24} color="#FFF" />
                  <Text style={styles.btnLabel}>Confirmar Desembarque</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.btnFaltou} 
                onPress={() => handleAction(item.id, 'FALTOU')}
                disabled={isSubmitting}
              >
                <Text style={styles.faltouText}>Marcar como Falta</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal visible={!!selectedStudent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informações do Aluno</Text>
              <TouchableOpacity onPress={() => setSelectedStudent(null)}><Feather name="x" size={24} color="#666" /></TouchableOpacity>
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
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedStudent(null)}>
              <Text style={styles.closeModalBtnText}>Fechar Detalhes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, paddingTop: 50, backgroundColor: '#FFF' },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  subtitle: { fontSize: 13, color: '#86868B' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 3 },
  studentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  studentName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  bigBtn: { flex: 1, height: 100, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 10 },
  btnEmbarque: { backgroundColor: '#34C759' },
  btnDesembarque: { backgroundColor: '#1976D2' },
  btnActive: { borderWidth: 4, borderColor: '#000' },
  btnLabel: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 8 },
  btnFaltou: { padding: 12, alignItems: 'center' },
  faltouText: { color: '#FF3B30', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  detailItem: { marginBottom: 20 },
  detailLabel: { fontSize: 13, color: '#86868B', marginBottom: 4 },
  detailValue: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' },
  closeModalBtn: { backgroundColor: '#F2F2F7', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  closeModalBtnText: { fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
});
