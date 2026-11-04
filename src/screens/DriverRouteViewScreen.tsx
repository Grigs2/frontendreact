import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { viagemService } from '../services/viagemService';
import { ViagemDTO, MotoristaDTO, ViagemDiaDTO, ParadaViagemDTO } from '../types';
import { colors, fonts } from '../theme';

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
          <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color={colors.ink} /></TouchableOpacity>
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
          {loading ? <ActivityIndicator size="small" color={colors.ink} /> : <Feather name="chevron-down" size={20} color={colors.ink} />}
        </TouchableOpacity>

        {activeViagemDia && (
          <View style={styles.statusControls}>
            {activeViagemDia.status === 'PLANEJADA' ? (
              <TouchableOpacity style={[styles.statusBtn, styles.startBtn]} onPress={handleStart} disabled={loading}>
                <Feather name="play" size={18} color={colors.surface} />
                <Text style={styles.statusBtnText}>Iniciar Viagem</Text>
              </TouchableOpacity>
            ) : activeViagemDia.status === 'EM_ANDAMENTO' ? (
              <TouchableOpacity style={[styles.statusBtn, styles.finishBtn]} onPress={handleFinish} disabled={loading}>
                <Feather name="square" size={18} color={colors.surface} />
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
          {loading && currentStops.length === 0 && <ActivityIndicator size="large" color={colors.ink} style={{ marginTop: 40 }} />}
          
          {selectedPeriod && !loading && currentStops.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma parada encontrada para este roteiro.</Text>
            </View>
          )}

          {currentStops.map((stop, index) => (
            <View key={index} style={styles.stopRow}>
              <View style={styles.indicator}>
                <View style={[styles.dot, stop.tipoParada === 'MOTORISTA' ? styles.dotDriver : styles.dotStudent]}>
                  {stop.tipoParada === 'MOTORISTA' ? <Feather name="home" size={14} color={colors.surface} /> : <Text style={styles.dotNum}>{stop.ordem}</Text>}
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
                          <View style={[styles.miniBadge, { backgroundColor: dep.statusEmbarque === 'ESPERANDO' ? colors.pressedNeutral : colors.successTint }]}>
                             <Text style={[styles.miniBadgeText, { color: dep.statusEmbarque === 'ESPERANDO' ? colors.slate700 : colors.success }]}>
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
                    <Feather name="clipboard" size={16} color={colors.onPrimary} />
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
  title: { fontSize: 22, fontFamily: fonts.bold, color: colors.ink },
  dropdown: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: colors.surface, 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 20 
  },
  dropdownLabel: { fontSize: 14, color: colors.slate500, textTransform: 'uppercase', fontFamily: fonts.bold },
  dropdownValue: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink, marginTop: 2 },
  statusControls: { marginBottom: 30, flexDirection: 'row' },
  statusBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,},
  startBtn: { backgroundColor: colors.success },
  finishBtn: { backgroundColor: colors.danger },
  statusBtnText: { color: colors.surface, fontSize: 14, fontFamily: fonts.bold },
  completedBadge: { flex: 1, backgroundColor: colors.background, padding: 14, borderRadius: 12, alignItems: 'center' },
  completedText: { color: colors.slate500, fontSize: 14, fontFamily: fonts.bold },
  timelineContainer: { paddingLeft: 10, paddingBottom: 40 },
  stopRow: { flexDirection: 'row', minHeight: 80 },
  indicator: { alignItems: 'center', width: 40, marginRight: 16 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dotDriver: { backgroundColor: colors.slate500 },
  dotStudent: { backgroundColor: colors.primary },
  dotNum: { color: colors.onPrimary, fontSize: 14, fontFamily: fonts.bold },
  line: { width: 3, flex: 1, backgroundColor: colors.pressedNeutral, marginTop: -2, marginBottom: -2 },
  details: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 30 },
  detailsContent: { flex: 1 },
  stopLocal: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  stopAddr: { fontFamily: fonts.regular, fontSize: 14, color: colors.slate500, marginTop: 4 },
  studentList: { marginTop: 8 },
  studentItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  studentName: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 14, fontFamily: fonts.bold },
  chamadaBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10 },
  chamadaBtnText: { color: colors.onPrimary, fontSize: 14, fontFamily: fonts.bold },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { fontFamily: fonts.regular, color: colors.slate500, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 40 },
  modalContent: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontFamily: fonts.bold, marginBottom: 20, textAlign: 'center' },
  option: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { fontFamily: fonts.regular, fontSize: 16, textAlign: 'center', color: colors.ink }
});
