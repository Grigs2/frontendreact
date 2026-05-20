import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import GuardianLayout from '../components/GuardianLayout';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { viagemService } from '../services/viagemService';
import { ResponsavelDTO, MotoristaViagemDTO, ViagemDiaDTO, ViagemDTO, MonitoramentoDTO, MonitoramentoItemDTO } from '../types';
import StatusBadge from '../components/StatusBadge';

export default function GuardianMonitoringScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { currentUser, showToast } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [monitorData, setMonitorData] = useState<MonitoramentoDTO | null>(null);
  
  const [currentTripDetails, setCurrentTripDetails] = useState<{
    driver?: MotoristaViagemDTO;
    trip?: ViagemDTO;
    tripDay?: ViagemDiaDTO;
    item?: MonitoramentoItemDTO;
  } | null>(null);
  
  const [historyDetails, setHistoryDetails] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(route.params?.dependenteId || guardian?.dependentes?.[0]?.id || null);

  // Caches to avoid redundant API calls during list processing
  const driverCache = useRef<Record<number, MotoristaViagemDTO>>({});
  const tripCache = useRef<Record<number, ViagemDTO>>({});
  const tripDayCache = useRef<Record<number, ViagemDiaDTO>>({});

  const fetchDriverInfo = async (viagemDiaId: number) => {
    if (driverCache.current[viagemDiaId]) return driverCache.current[viagemDiaId];
    try {
      const info = await viagemService.consultarMotorista(viagemDiaId);
      driverCache.current[viagemDiaId] = info;
      return info;
    } catch (e) { 
      console.warn(`Erro ao buscar motorista para viagemDia ${viagemDiaId}:`, e);
      return null; 
    }
  };

  const fetchTripInfo = async (viagemId: number) => {
    if (tripCache.current[viagemId]) return tripCache.current[viagemId];
    try {
      const info = await viagemService.visualizar(viagemId);
      tripCache.current[viagemId] = info;
      return info;
    } catch (e) { 
      console.warn(`Erro ao buscar detalhes da viagem ${viagemId}:`, e);
      return null; 
    }
  };

  const fetchTripDayInfo = async (viagemDiaId: number) => {
    if (tripDayCache.current[viagemDiaId]) return tripDayCache.current[viagemDiaId];
    try {
      const info = await viagemService.visualizarViagemDia(viagemDiaId);
      tripDayCache.current[viagemDiaId] = info;
      return info;
    } catch (e) { 
      console.warn(`Erro ao buscar detalhes do dia da viagem ${viagemDiaId}:`, e);
      return null; 
    }
  };

  const enrichItem = async (item: MonitoramentoItemDTO) => {
    const vDiaId = item.viagemDiaId;
    
    // 1. Parallel fetch for TripDay and Driver
    const [tripDay, driver] = await Promise.all([
      fetchTripDayInfo(vDiaId),
      fetchDriverInfo(vDiaId)
    ]);

    // 2. Discover ViagemId
    // Priority: tripDay response > item from Monitorar > fallback
    const vId = tripDay?.viagemId || (tripDay as any)?.viagem?.id || item.viagemId;
    
    let trip = null;
    if (vId) {
      trip = await fetchTripInfo(vId);
    }

    return {
      ...item,
      driver,
      trip,
      tripDay,
      // Map consolidated fields for easier UI access
      nomeMotorista: driver?.nomeMotorista || 'Não identificado',
      periodo: trip?.periodo || item.periodoViagem || 'N/A',
      dataExibicao: tripDay?.data || item.data,
      ultimaAlteracaoExibicao: tripDay?.dataUltimaAlteracaoStatus || tripDay?.ultimaAlteracao || item.ultimaAlteracao
    };
  };

  const loadMonitoring = useCallback(async (isRefreshing = false) => {
    if (!selectedStudentId) return;
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      console.log(`[Diagnostic] Iniciando monitoramento para dependente: ${selectedStudentId}`);
      const data = await responsavelService.monitorar(selectedStudentId);
      console.log('[Diagnostic] Resposta /Responsavel/Monitorar:', JSON.stringify(data, null, 2));
      
      setMonitorData(data);
      
      // 1. Enrich Current Trip
      if (data?.statusAtual?.viagemDiaId) {
        const enriched = await enrichItem(data.statusAtual);
        setCurrentTripDetails({
          driver: enriched.driver || undefined,
          trip: enriched.trip || undefined,
          tripDay: enriched.tripDay || undefined,
          item: data.statusAtual
        });
      } else {
        setCurrentTripDetails(null);
      }

      // 2. Enrich History
      const historyItems = data.historicoRecente || (data as any).historico || [];
      if (Array.isArray(historyItems)) {
        const detailedHistory = await Promise.all(
          historyItems.map(item => enrichItem(item))
        );
        
        // Sort newest to oldest based on data
        const sorted = detailedHistory.sort((a, b) => {
          const dateA = new Date(a.dataExibicao || '').getTime();
          const dateB = new Date(b.dataExibicao || '').getTime();
          return dateB - dateA;
        });
        
        setHistoryDetails(sorted);
      } else {
        setHistoryDetails([]);
      }
    } catch (error) {
      console.error('Monitoring Error:', error);
      showToast('Erro ao carregar dados de monitoramento.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStudentId, showToast]);

  useEffect(() => {
    if (isFocused) {
      loadMonitoring();
    }
  }, [isFocused, loadMonitoring]);

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--:--';
    try {
      // Handle cases where it might be just "HH:mm:ss" or ISO
      if (isoString.includes('T')) {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString.substring(11, 16);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      return isoString.substring(0, 5);
    } catch (e) {
      return '--:--';
    }
  };

  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return '--/--/----';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      return isoString;
    }
  };

  const selectedStudent = guardian?.dependentes?.find(d => d.id === selectedStudentId);

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.title}>Monitoramento</Text>
          <View style={{ width: 24 }} />
        </View>

        {guardian?.dependentes && guardian.dependentes.length > 0 && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentTabs} contentContainerStyle={{ paddingRight: 40 }}>
              {guardian.dependentes.map(dep => (
                <TouchableOpacity 
                  key={dep.id} 
                  style={[styles.studentTab, selectedStudentId === dep.id && styles.studentTabActive]}
                  onPress={() => setSelectedStudentId(dep.id!)}
                >
                  <Text style={[styles.studentTabText, selectedStudentId === dep.id && styles.studentTabTextActive]}>
                    {dep.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Carregando monitoramento...</Text>
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMonitoring(true)} />}
          >
            <Text style={styles.sectionTitle}>Viagem Atual</Text>
            
            {!monitorData?.statusAtual ? (
              <View style={styles.noCurrentTrip}>
                <Feather name="calendar" size={32} color="#86868B" />
                <Text style={styles.noCurrentTripText}>Nenhuma viagem em andamento para {selectedStudent?.nome || 'este dependente'}.</Text>
              </View>
            ) : (
              <View style={styles.currentTripCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.periodBadge}>
                    <Text style={styles.periodText}>
                      {currentTripDetails?.trip?.periodo?.replace('_', ' ') || monitorData.statusAtual.periodoViagem?.replace('_', ' ') || 'Período N/A'}
                    </Text>
                  </View>
                  <StatusBadge 
                    status={monitorData.statusAtual.status} 
                    variant={monitorData.statusAtual.status === 'ESPERANDO' ? 'default' : monitorData.statusAtual.status === 'FALTOU' ? 'error' : 'success'} 
                  />
                </View>

                <View style={styles.driverSection}>
                  <Text style={styles.label}>Motorista</Text>
                  {currentTripDetails?.driver ? (
                    <View style={styles.driverRow}>
                      <View style={styles.driverAvatar}>
                        <Feather name="user" size={20} color="#1976D2" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverName}>{currentTripDetails.driver.nomeMotorista}</Text>
                        <Text style={styles.driverContact}>{currentTripDetails.driver.telefone}</Text>
                        {(currentTripDetails.driver.modeloVeiculo || currentTripDetails.driver.placaVeiculo) && (
                          <Text style={styles.vehicleText}>{currentTripDetails.driver.modeloVeiculo} • {currentTripDetails.driver.placaVeiculo}</Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.emptyTextSmall}>Dados do motorista não encontrados</Text>
                  )}
                </View>

                <View style={styles.tripMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.label}>Data da Viagem</Text>
                    <Text style={styles.metaValue}>{formatDate(currentTripDetails?.tripDay?.data || monitorData.statusAtual.data)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.label}>Última Alteração</Text>
                    <Text style={styles.metaValue}>
                      {formatTime(currentTripDetails?.tripDay?.dataUltimaAlteracaoStatus || currentTripDetails?.tripDay?.ultimaAlteracao || monitorData.statusAtual.ultimaAlteracao)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.statusRow}>
                  <View style={styles.statusBox}>
                    <Text style={styles.label}>Embarque</Text>
                    <Text style={styles.timeValue}>{formatTime(monitorData.statusAtual.horarioEmbarque)}</Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View style={styles.statusBox}>
                    <Text style={styles.label}>Desembarque</Text>
                    <Text style={styles.timeValue}>{formatTime(monitorData.statusAtual.horarioDesembarque)}</Text>
                  </View>
                </View>
              </View>
            )}

            {historyDetails.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Histórico Recente</Text>
                {historyDetails.map((item, index) => (
                  <View key={index} style={styles.historyCard}>
                    <View style={styles.historyTop}>
                      <View style={styles.historyPeriod}>
                        <Text style={styles.historyPeriodText}>{item.periodo?.replace('_', ' ')}</Text>
                      </View>
                      <Text style={styles.historyDate}>{formatDate(item.dataExibicao)}</Text>
                    </View>
                    
                    <View style={styles.historyMain}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Motorista</Text>
                        <Text style={styles.historyDriver}>{item.nomeMotorista}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Última Alteração</Text>
                        <Text style={styles.historyTime}>{formatTime(item.ultimaAlteracaoExibicao)}</Text>
                      </View>
                    </View>

                    <View style={styles.historyFooter}>
                      <StatusBadge 
                        status={item.status} 
                        size="small" 
                        variant={item.status === 'EMBARCADO' ? 'success' : item.status === 'FALTOU' ? 'error' : 'default'} 
                      />
                    </View>
                  </View>
                ))}
              </>
            )}

            {!loading && historyDetails.length === 0 && !monitorData?.statusAtual && (
              <View style={styles.empty}>
                <Feather name="info" size={48} color="#C7C7CC" />
                <Text style={styles.emptyText}>Nenhuma atividade registrada para este dependente.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#86868B', fontFamily: 'Inter_500Medium' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1D1D1F' },
  studentTabs: { paddingHorizontal: 20, marginBottom: 10, maxHeight: 40 },
  studentTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  studentTabActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  studentTabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#86868B' },
  studentTabTextActive: { color: '#FFF' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#1D1D1F', marginBottom: 16 },
  currentTripCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, borderWidth: 1, borderColor: '#F2F2F7' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  periodBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  periodText: { color: '#1976D2', fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  driverSection: { marginBottom: 20 },
  label: { fontSize: 12, color: '#86868B', fontFamily: 'Inter_500Medium', marginBottom: 6 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverName: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  driverContact: { fontSize: 13, color: '#1976D2', fontFamily: 'Inter_500Medium' },
  vehicleText: { fontSize: 12, color: '#86868B', marginTop: 2 },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metaItem: { flex: 1 },
  metaValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginVertical: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusBox: { flex: 1, alignItems: 'center' },
  verticalDivider: { width: 1, height: 30, backgroundColor: '#F2F2F7' },
  timeValue: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  noCurrentTrip: { backgroundColor: '#F2F2F7', borderRadius: 24, padding: 32, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D1D6' },
  noCurrentTripText: { marginTop: 12, fontSize: 14, color: '#86868B', textAlign: 'center', fontFamily: 'Inter_500Medium' },
  historyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2F2F7' },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyPeriod: { backgroundColor: '#F2F2F7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  historyPeriodText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#86868B', textTransform: 'uppercase' },
  historyDate: { fontSize: 12, color: '#1D1D1F', fontFamily: 'Inter_600SemiBold' },
  historyMain: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historyDriver: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' },
  historyTime: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' },
  historyFooter: { alignItems: 'flex-start' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#86868B', textAlign: 'center', marginTop: 12 },
  emptyTextSmall: { fontSize: 13, color: '#86868B', fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
});
