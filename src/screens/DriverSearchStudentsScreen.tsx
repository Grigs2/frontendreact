import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { viagemService } from '../services/viagemService';
import { ViagemDTO, DependenteDTO, MotoristaDTO } from '../types';

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#1D1D1F" /></TouchableOpacity>
          <Text style={styles.title}>Gerenciar Rota</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepLabel}>1. SELECIONE O PERÍODO</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowPeriodDropdown(true)} disabled={loading}>
            <Text style={[styles.dropdownValue, !selectedPeriod && { color: '#86868B' }]}>
              {selectedPeriod ? `Rota: ${selectedPeriod.replace('_', ' ')}` : 'Clique para selecionar o período...'}
            </Text>
            {loading ? <ActivityIndicator size="small" color="#1976D2" /> : <Feather name="chevron-down" size={20} color="#1976D2" />}
          </TouchableOpacity>
        </View>

        {selectedPeriod && (
          <>
            <Text style={styles.stepLabel}>2. ALUNOS DISPONÍVEIS</Text>
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
                  <TouchableOpacity 
                    style={styles.solicitBtn} 
                    onPress={() => handleRequest(item.id!)}
                    disabled={loading}
                  >
                    <Feather name="user-plus" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Nenhum novo aluno para solicitar neste período.</Text> : null}
            />

            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={() => navigation.navigate('DriverRoute')}
              >
                <Text style={styles.saveBtnText}>IR PARA ROTEIRO DO DIA</Text>
                <Feather name="map" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Modal visible={showPeriodDropdown} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodDropdown(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Escolha o Período</Text>
              <ScrollView>
                {PERIODS.map(p => (
                  <TouchableOpacity key={p} style={styles.option} onPress={() => handleSelectPeriod(p)}>
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
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 30, marginTop: 10 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  stepBox: { marginBottom: 24 },
  stepLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#86868B', marginBottom: 10, letterSpacing: 1 },
  dropdown: { height: 56, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3 },
  dropdownValue: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#1976D2' },
  list: { paddingBottom: 120 },
  studentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#1976D2', elevation: 2 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  studentAddr: { fontSize: 12, color: '#86868B', marginTop: 2 },
  schoolName: { fontSize: 11, color: '#1976D2', marginTop: 4, fontFamily: 'Inter_600SemiBold' },
  solicitBtn: { backgroundColor: '#1976D2', width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: '#86868B', marginTop: 20, fontSize: 13 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#FAFAFA' },
  saveBtn: { backgroundColor: '#1976D2', height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 40 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F', textAlign: 'center', marginBottom: 20 },
  option: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', alignItems: 'center' },
  optionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' }
});
