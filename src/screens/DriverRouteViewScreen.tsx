import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { viagemService } from '../services/viagemService';
import { ViagemDTO, MotoristaDTO, ViagemDiaDTO, ParadaViagemDTO } from '../types';

const PERIODS = ['MANHA_IDA', 'MANHA_VOLTA', 'TARDE_IDA', 'TARDE_VOLTA', 'NOITE_IDA', 'NOITE_VOLTA'];

export default function DriverRouteViewScreen() {
  const navigation = useNavigation<any>();
  const { 
    currentUser, 
    activeViagemDia, 
    setActiveViagemDia, 
    currentStops, 
    setCurrentStops 
  } = useAppContext();
  
  const driver = currentUser as MotoristaDTO;
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rotas, setRotas] = useState<ViagemDTO[]>([]);

  // Simulation: We don't have a "Listar Rotas do Motorista" endpoint explicitly documented
  // but we can assume the driver has a list of fixed routes.
  // In a real scenario, we might need an endpoint for this or fetch it on login.
  // For now, let's assume we fetch them here or they are part of the driver DTO.

  useEffect(() => {
    // If we had a list of routes, we'd fetch them here.
    // For now, we'll try to find if there's an active ViagemDia for the selected period.
  }, []);

  const handlePeriodSelect = async (period: string) => {
    setSelectedPeriod(period);
    setShowPeriodDropdown(false);
    setLoading(true);
    
    try {
      // 1. Try to find/start the ViagemDia for this period
      // We need the fixed Viagem ID for this period first.
      // Since we don't have a list of routes, we'll need to handle this.
      // Let's assume the driver only has ONE route for testing purposes or we fetch it.
      
      // MOCK: Find fixed trip ID (In reality, fetch from API)
      const fixedTripId = 1; 

      const viagemDia = await viagemService.iniciarViagemDia(fixedTripId);
      setActiveViagemDia(viagemDia);
      
      const stops = await viagemService.buscarParadasViagemDia(viagemDia.id!);
      setCurrentStops(stops);
    } catch (error: any) {
      console.error('Error loading route:', error);
      Alert.alert('Erro', 'Não foi possível carregar o roteiro para este período.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!activeViagemDia?.id) return;
    setLoading(true);
    try {
      const updated = await viagemService.alterarStatusViagemDia(activeViagemDia.id, 'EM_ANDAMENTO');
      setActiveViagemDia(updated);
      Alert.alert('Sucesso', 'Viagem iniciada!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível iniciar a viagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!activeViagemDia?.id) return;
    setLoading(true);
    try {
      const updated = await viagemService.alterarStatusViagemDia(activeViagemDia.id, 'FINALIZADA');
      setActiveViagemDia(updated);
      Alert.alert('Sucesso', 'Viagem finalizada!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível finalizar a viagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DriverLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#1D1D1F" /></TouchableOpacity>
          <Text style={styles.title}>Roteiro do Dia</Text>
        </View>

        <TouchableOpacity 
          style={styles.dropdown}
          onPress={() => setShowPeriodDropdown(true)}
          disabled={loading}
        >
          <View>
            <Text style={styles.dropdownLabel}>Período de Trabalho:</Text>
            <Text style={styles.dropdownValue}>
              {selectedPeriod ? selectedPeriod : 'Selecione o período...'}
            </Text>
          </View>
          {loading ? <ActivityIndicator size="small" color="#1976D2" /> : <Feather name="chevron-down" size={20} color="#1976D2" />}
        </TouchableOpacity>

        {activeViagemDia && (
          <View style={styles.statusControls}>
            {activeViagemDia.status === 'PLANEJADA' ? (
              <TouchableOpacity style={[styles.statusBtn, styles.startBtn]} onPress={handleStart} disabled={loading}>
                <Feather name="play" size={18} color="#FFF" />
                <Text style={styles.statusBtnText}>Iniciar Viagem</Text>
              </TouchableOpacity>
            ) : activeViagemDia.status === 'EM_ANDAMENTO' ? (
              <TouchableOpacity style={[styles.statusBtn, styles.finishBtn]} onPress={handleFinish} disabled={loading}>
                <Feather name="square" size={18} color="#FFF" />
                <Text style={styles.statusBtnText}>Finalizar Rota</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>VIAGEM {activeViagemDia.status}</Text>
              </View>
            )}
          </View>
        )}

        <ScrollView contentContainerStyle={styles.timelineContainer}>
          {loading && currentStops.length === 0 && <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 40 }} />}
          
          {selectedPeriod && !loading && currentStops.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma parada encontrada para este roteiro.</Text>
            </View>
          )}

          {currentStops.map((stop, index) => (
            <View key={index} style={styles.stopRow}>
              <View style={styles.indicator}>
                <View style={[styles.dot, stop.tipoParada === 'MOTORISTA' ? styles.dotDriver : styles.dotStudent]}>
                  {stop.tipoParada === 'MOTORISTA' ? <Feather name="home" size={12} color="#FFF" /> : <Text style={styles.dotNum}>{stop.ordem}</Text>}
                </View>
                {index < currentStops.length - 1 && <View style={styles.line} />}
              </View>

              <View style={styles.details}>
                <View style={styles.detailsContent}>
                  <Text style={styles.stopLocal}>{stop.nomeLocal}</Text>
                  <Text style={styles.stopAddr}>{stop.endereco}</Text>
                  
                  {stop.listaDependentes.length > 0 && (
                    <View style={styles.studentList}>
                      {stop.listaDependentes.map(dep => (
                        <View key={dep.id} style={styles.studentItem}>
                          <Text style={styles.studentName}>{dep.nomeDependente}</Text>
                          <View style={[styles.miniBadge, { backgroundColor: dep.statusEmbarque === 'ESPERANDO' ? '#F2F2F7' : '#E8F5E9' }]}>
                             <Text style={[styles.miniBadgeText, { color: dep.statusEmbarque === 'ESPERANDO' ? '#86868B' : '#34C759' }]}>
                               {dep.statusEmbarque}
                             </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {stop.tipoParada !== 'MOTORISTA' && activeViagemDia?.status === 'EM_ANDAMENTO' && (
                  <TouchableOpacity 
                    style={styles.chamadaBtn}
                    onPress={() => navigation.navigate('DriverAttendanceDetail', { 
                      tripId: activeViagemDia.id,
                      stopId: stop.ordem,
                      students: stop.listaDependentes,
                      description: stop.nomeLocal
                    })}
                  >
                    <Feather name="clipboard" size={16} color="#FFF" />
                    <Text style={styles.chamadaBtnText}>Chamada</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <Modal visible={showPeriodDropdown} transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowPeriodDropdown(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Trocar Período</Text>
              <ScrollView>
                {PERIODS.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={styles.option} 
                    onPress={() => handlePeriodSelect(p)}
                  >
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, marginTop: 10 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  dropdown: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 16, 
    elevation: 2, 
    marginBottom: 20 
  },
  dropdownLabel: { fontSize: 11, color: '#86868B', textTransform: 'uppercase', fontFamily: 'Inter_600SemiBold' },
  dropdownValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1976D2', marginTop: 2 },
  statusControls: { marginBottom: 30, flexDirection: 'row' },
  statusBtn: { flex: 1, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 3 },
  startBtn: { backgroundColor: '#34C759' },
  finishBtn: { backgroundColor: '#FF3B30' },
  statusBtnText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  completedBadge: { flex: 1, backgroundColor: '#F2F2F7', padding: 14, borderRadius: 12, alignItems: 'center' },
  completedText: { color: '#86868B', fontSize: 13, fontFamily: 'Inter_700Bold' },
  timelineContainer: { paddingLeft: 10, paddingBottom: 40 },
  stopRow: { flexDirection: 'row', minHeight: 80 },
  indicator: { alignItems: 'center', width: 40, marginRight: 16 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dotDriver: { backgroundColor: '#8E8E93' },
  dotStudent: { backgroundColor: '#1976D2' },
  dotNum: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  line: { width: 3, flex: 1, backgroundColor: '#E5E5EA', marginTop: -2, marginBottom: -2 },
  details: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 30 },
  detailsContent: { flex: 1 },
  stopLocal: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  stopAddr: { fontSize: 12, color: '#86868B', marginTop: 4 },
  studentList: { marginTop: 8 },
  studentItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  studentName: { fontSize: 14, color: '#1D1D1F' },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  chamadaBtn: { backgroundColor: '#1976D2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10 },
  chamadaBtnText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#86868B', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 40 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 20, textAlign: 'center' },
  option: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  optionText: { fontSize: 16, textAlign: 'center', color: '#1D1D1F' }
});
