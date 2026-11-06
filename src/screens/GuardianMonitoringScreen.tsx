import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import GuardianLayout from '../components/GuardianLayout';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel, viagemService } from '../services/viagemService';
import { ResponsavelDTO, MotoristaViagemDTO, ViagemDiaDTO, ViagemDTO, MonitoramentoDTO, MonitoramentoItemDTO } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Chip, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

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
        <ScreenHeader title="Monitoramento" onBack={() => navigation.goBack()} style={styles.header} />

        {guardian?.dependentes && guardian.dependentes.length > 0 && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentTabs} contentContainerStyle={styles.studentTabsContent}>
              {guardian.dependentes.map(dep => (
                <TouchableOpacity
                  key={dep.id}
                  style={[styles.studentTab, selectedStudentId === dep.id && styles.studentTabActive]}
                  onPress={() => setSelectedStudentId(dep.id!)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selectedStudentId === dep.id }}
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
          <StateView kind="loading" title="Carregando monitoramento..." style={styles.center} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMonitoring(true)} colors={[colors.ink]} tintColor={colors.ink} />}
          >
            <Text style={styles.sectionTitle}>Viagem Atual</Text>

            {!monitorData?.statusAtual ? (
              <StateView
                kind="empty"
                icon="calendar"
                message={`Nenhuma viagem em andamento para ${selectedStudent?.nome || 'este dependente'}.`}
                style={styles.noCurrentTrip}
              />
            ) : (
              <View style={styles.currentTripCard}>
                <View style={styles.cardHeader}>
                  <Chip
                    label={periodoLabel(currentTripDetails?.trip?.periodo || monitorData.statusAtual.periodoViagem) || 'Período não informado'}
                    tone="info"
                    icon="clock"
                  />
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
                        <Feather name="user" size={24} color={colors.ink} />
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
                      <Chip label={periodoLabel(item.periodo) || 'Período não informado'} tone="neutral" size="sm" />
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
              <StateView kind="empty" icon="info" title="Nenhuma atividade registrada para este dependente." />
            )}
          </ScrollView>
        )}
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, width: '100%', maxWidth: 800, alignSelf: 'center' },
  center: { flex: 1 },
  header: { paddingHorizontal: layout.screenMargin, paddingTop: layout.screenMargin, marginBottom: spacing.md },
  studentTabs: { flexGrow: 0, marginBottom: spacing.sm },
  studentTabsContent: { paddingHorizontal: layout.screenMargin, gap: spacing.sm },
  studentTab: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: borders.hairline, borderColor: colors.border },
  studentTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  studentTabText: { ...typography.captionBold, color: colors.slate700 },
  studentTabTextActive: { color: colors.onPrimary },
  scrollContent: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  currentTripCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, borderWidth: borders.hairline, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  driverSection: { marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.slate500, marginBottom: spacing.xs },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  driverAvatar: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center' },
  driverName: { ...typography.heading, color: colors.ink },
  driverContact: { ...typography.body, color: colors.ink },
  vehicleText: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  metaItem: { flex: 1 },
  metaValue: { ...typography.label, color: colors.ink },
  divider: { height: borders.hairline, backgroundColor: colors.border, marginVertical: spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusBox: { flex: 1, alignItems: 'center' },
  verticalDivider: { width: borders.hairline, height: 40, backgroundColor: colors.border },
  timeValue: { ...typography.title, color: colors.ink },
  noCurrentTrip: { backgroundColor: colors.surface, borderRadius: radius.card, borderStyle: 'dashed', borderWidth: borders.alert, borderColor: colors.border },
  historyCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.md, borderWidth: borders.hairline, borderColor: colors.border },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  historyDate: { ...typography.label, color: colors.ink },
  historyMain: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  historyDriver: { ...typography.body, color: colors.ink },
  historyTime: { ...typography.label, color: colors.ink },
  historyFooter: { alignItems: 'flex-start' },
  emptyTextSmall: { ...typography.caption, color: colors.slate500, fontStyle: 'italic' },
});
