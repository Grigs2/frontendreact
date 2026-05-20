import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import StatusBadge from '../components/StatusBadge';
import { viagemService } from '../services/viagemService';
import { ParadaViagemDTO, ViagemDiaDTO } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverAttendance'>;

const TRIP_STATUS_OPTIONS: ViagemDiaDTO['status'][] = ['PLANEJADA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'];

export default function DriverAttendanceScreen({ route, navigation }: Props) {
  const { activeViagemDia, setActiveViagemDia, currentStops, setCurrentStops, showToast } = useAppContext();
  const viagemDiaId = route.params?.viagemDiaId || activeViagemDia?.id;
  const [refreshing, setRefreshing] = useState(false);
  const [submittingIds, setSubmittingIds] = useState<Record<number, boolean>>({});
  const [isUpdatingTripStatus, setIsUpdatingTripStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const isTripInactive = activeViagemDia?.status === 'FINALIZADA' || activeViagemDia?.status === 'CANCELADA';

  const isLoadingRef = useRef(false);

  const loadStops = useCallback(async (isSilent = false) => {
    if (!viagemDiaId || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    if (!isSilent) setRefreshing(true);
    try {
      const stops = await viagemService.buscarParadasViagemDia(viagemDiaId);
      setCurrentStops(stops);
    } catch (error) {
      console.error('Error loading stops:', error);
      showToast('Não foi possível carregar as paradas.', 'error');
    } finally {
      setRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [viagemDiaId, setCurrentStops, showToast]);

  useFocusEffect(
    useCallback(() => {
      if (!viagemDiaId) {
        showToast('Nenhuma viagem ativa encontrada.', 'info');
        navigation.navigate('DriverTrips');
        return;
      }
      loadStops();
    }, [viagemDiaId, loadStops, navigation, showToast])
  );

  const handleUpdateTripStatus = async (newStatus: ViagemDiaDTO['status']) => {
    if (!viagemDiaId || isUpdatingTripStatus) return;
    setIsUpdatingTripStatus(true);
    try {
      const updated = await viagemService.alterarStatusViagemDia(viagemDiaId, newStatus);
      if (updated) {
        setActiveViagemDia(updated);
        showToast(`Viagem ${newStatus.replace('_', ' ')}!`, 'success');
        setShowStatusModal(false);
        // Load stops silently to update UI without blocking
        await loadStops(true);
      }
    } catch (error: any) {
      console.error('Trip status update error:', error);
      showToast(error.response?.data?.mensagem || 'Erro ao atualizar status.', 'error');
    } finally {
      setIsUpdatingTripStatus(false);
      // Ensure modal closes even if logic above fails for some reason
      setShowStatusModal(false);
    }
  };

  const handleUpdateStudentStatus = async (studentId: number, status: 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU') => {
    if (!viagemDiaId || isTripInactive || submittingIds[studentId]) return;
    
    setSubmittingIds(prev => ({ ...prev, [studentId]: true }));
    try {
      const updatedStops = await viagemService.alterarStatusPresenca(viagemDiaId, studentId, status);
      if (Array.isArray(updatedStops)) {
        setCurrentStops(updatedStops);
        showToast('Presença atualizada!', 'success');
      }
    } catch (error: any) {
      console.error('Student status update error:', error);
      showToast(error.response?.data?.mensagem || 'Erro ao atualizar presença.', 'error');
    } finally {
      setSubmittingIds(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'EM_ANDAMENTO': return 'info';
      case 'FINALIZADA': return 'success';
      case 'CANCELADA': return 'error';
      case 'PLANEJADA': return 'warning';
      default: return 'default';
    }
  };

  return (
    <DriverLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Chamada do Dia</Text>
            {activeViagemDia && (
              <TouchableOpacity onPress={() => setShowStatusModal(true)} style={styles.currentStatusRow} activeOpacity={0.7}>
                <StatusBadge status={activeViagemDia.status} variant={getStatusVariant(activeViagemDia.status)} />
                <Feather name="edit-2" size={14} color="#1976D2" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.timelineContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStops()} colors={['#1976D2']} tintColor="#1976D2" />}
        >
          {refreshing && currentStops.length === 0 && (
            <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 40 }} />
          )}
          
          {currentStops.map((stop, index) => (
            <View key={`${stop.ordem}-${index}`} style={styles.stopRow}>
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
                  
                  {stop.listaDependentes.map(dep => {
                    const isSubmitting = !!submittingIds[dep.id];
                    return (
                      <View key={dep.id} style={styles.studentCard}>
                        <View style={styles.studentHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{dep.nomeDependente}</Text>
                            <Text style={styles.responsavelName}>Resp: {dep.nomeResponsavel}</Text>
                          </View>
                          {isSubmitting ? (
                            <ActivityIndicator size="small" color="#1976D2" />
                          ) : (
                            <StatusBadge 
                              status={dep.statusEmbarque} 
                              variant={dep.statusEmbarque === 'ESPERANDO' ? 'default' : dep.statusEmbarque === 'FALTOU' ? 'error' : 'success'} 
                            />
                          )}
                        </View>

                        {!isTripInactive && (
                          <View style={styles.quickActions}>
                            <TouchableOpacity 
                              style={[
                                styles.quickBtn, 
                                styles.btnEmbarcado, 
                                dep.statusEmbarque === 'EMBARCADO' && styles.btnActiveEmbarcado
                              ]}
                              onPress={() => handleUpdateStudentStatus(dep.id, 'EMBARCADO')}
                              disabled={isSubmitting || refreshing}
                            >
                              <Feather name="log-in" size={16} color={dep.statusEmbarque === 'EMBARCADO' ? '#FFF' : '#34C759'} />
                              <Text style={[styles.quickBtnText, dep.statusEmbarque === 'EMBARCADO' && styles.textWhite]}>Embarcar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[
                                styles.quickBtn, 
                                styles.btnDesembarcado, 
                                dep.statusEmbarque === 'DESEMBARCADO' && styles.btnActiveDesembarcado
                              ]}
                              onPress={() => handleUpdateStudentStatus(dep.id, 'DESEMBARCADO')}
                              disabled={isSubmitting || refreshing}
                            >
                              <Feather name="log-out" size={16} color={dep.statusEmbarque === 'DESEMBARCADO' ? '#FFF' : '#1976D2'} />
                              <Text style={[styles.quickBtnText, dep.statusEmbarque === 'DESEMBARCADO' && styles.textWhite]}>Desembarcar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[
                                styles.quickBtn, 
                                styles.btnFaltou, 
                                dep.statusEmbarque === 'FALTOU' && styles.btnActiveFaltou
                              ]}
                              onPress={() => handleUpdateStudentStatus(dep.id, 'FALTOU')}
                              disabled={isSubmitting || refreshing}
                            >
                              <Feather name="x-circle" size={16} color={dep.statusEmbarque === 'FALTOU' ? '#FFF' : '#FF3B30'} />
                              <Text style={[styles.quickBtnText, dep.statusEmbarque === 'FALTOU' && styles.textWhite]}>Faltou</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
          {!refreshing && currentStops.length === 0 && (
            <View style={styles.emptyContainer}>
              <Feather name="info" size={40} color="#86868B" />
              <Text style={styles.emptyText}>Nenhuma parada encontrada para esta viagem.</Text>
            </View>
          )}
        </ScrollView>

        <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => setShowStatusModal(false)}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => !isUpdatingTripStatus && setShowStatusModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Alterar Status da Viagem</Text>
                <TouchableOpacity onPress={() => setShowStatusModal(false)} disabled={isUpdatingTripStatus}>
                  <Feather name="x" size={24} color="#86868B" />
                </TouchableOpacity>
              </View>
              {TRIP_STATUS_OPTIONS.map((status) => (
                <TouchableOpacity 
                  key={status} 
                  style={[styles.statusOption, activeViagemDia?.status === status && styles.statusOptionActive]}
                  onPress={() => handleUpdateTripStatus(status)}
                  disabled={isUpdatingTripStatus}
                >
                  <StatusBadge status={status} variant={getStatusVariant(status)} />
                  {activeViagemDia?.status === status && !isUpdatingTripStatus && <Feather name="check" size={20} color="#1976D2" />}
                  {activeViagemDia?.status === status && isUpdatingTripStatus && <ActivityIndicator size="small" color="#1976D2" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  currentStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timelineContainer: { padding: 20, paddingBottom: 40 },
  stopRow: { flexDirection: 'row', minHeight: 80 },
  indicator: { alignItems: 'center', width: 40, marginRight: 16 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dotDriver: { backgroundColor: '#8E8E93' },
  dotStudent: { backgroundColor: '#1976D2' },
  dotNum: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  line: { width: 3, flex: 1, backgroundColor: '#E5E5EA', marginTop: -2, marginBottom: -2 },
  details: { flex: 1, paddingBottom: 30 },
  stopLocal: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  stopAddr: { fontSize: 12, color: '#86868B', marginTop: 2, marginBottom: 12 },
  detailsContent: { flex: 1 },
  studentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F2F2F7' },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  studentName: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  responsavelName: { fontSize: 12, color: '#86868B', marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 12 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 4, borderWidth: 1 },
  btnEmbarcado: { borderColor: '#E8F5E9', backgroundColor: '#F9FBF9' },
  btnDesembarcado: { borderColor: '#E3F2FD', backgroundColor: '#F5F9FF' },
  btnFaltou: { borderColor: '#FFEBEE', backgroundColor: '#FFF9F9' },
  btnActiveEmbarcado: { backgroundColor: '#34C759', borderColor: '#34C759' },
  btnActiveDesembarcado: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  btnActiveFaltou: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  quickBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  textWhite: { color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  statusOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, marginBottom: 8, backgroundColor: '#F5F5F7' },
  statusOptionActive: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#1976D2' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#86868B', fontSize: 14, marginTop: 12, textAlign: 'center' }
});
