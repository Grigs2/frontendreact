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
import { Button, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

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
          <Button variant="tertiary" size="icon" icon="arrow-left" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.backBtn} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Chamada do Dia</Text>
            {activeViagemDia && (
              <TouchableOpacity
                onPress={() => setShowStatusModal(true)}
                style={styles.currentStatusRow}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Alterar status da viagem"
              >
                <StatusBadge status={activeViagemDia.status} variant={getStatusVariant(activeViagemDia.status)} />
                <Feather name="edit-2" size={14} color={colors.ink} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.timelineContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStops()} colors={[colors.ink]} tintColor={colors.ink} />}
        >
          {refreshing && currentStops.length === 0 && (
            <StateView kind="loading" title="Carregando paradas..." />
          )}
          
          {currentStops.map((stop, index) => (
            <View key={`${stop.ordem}-${index}`} style={styles.stopRow}>
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
                            <ActivityIndicator size="small" color={colors.ink} />
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
                              <Feather name="log-in" size={16} color={dep.statusEmbarque === 'EMBARCADO' ? colors.surface : colors.success} />
                              <Text style={[styles.quickBtnText, { color: colors.success }, dep.statusEmbarque === 'EMBARCADO' && styles.textWhite]}>Embarcar</Text>
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
                              <Feather name="log-out" size={16} color={dep.statusEmbarque === 'DESEMBARCADO' ? colors.surface : colors.info} />
                              <Text style={[styles.quickBtnText, { color: colors.info }, dep.statusEmbarque === 'DESEMBARCADO' && styles.textWhite]}>Desembarcar</Text>
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
                              <Feather name="x-circle" size={16} color={dep.statusEmbarque === 'FALTOU' ? colors.surface : colors.danger} />
                              <Text style={[styles.quickBtnText, { color: colors.danger }, dep.statusEmbarque === 'FALTOU' && styles.textWhite]}>Faltou</Text>
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
            <StateView kind="empty" icon="map-pin" title="Nenhuma parada encontrada para esta viagem." />
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
                <Button
                  variant="tertiary"
                  size="icon"
                  icon="x"
                  accessibilityLabel="Fechar"
                  onPress={() => setShowStatusModal(false)}
                  disabled={isUpdatingTripStatus}
                />
              </View>
              {TRIP_STATUS_OPTIONS.map((status) => (
                <TouchableOpacity 
                  key={status} 
                  style={[styles.statusOption, activeViagemDia?.status === status && styles.statusOptionActive]}
                  onPress={() => handleUpdateTripStatus(status)}
                  disabled={isUpdatingTripStatus}
                >
                  <StatusBadge status={status} variant={getStatusVariant(status)} />
                  {activeViagemDia?.status === status && !isUpdatingTripStatus && <Feather name="check" size={20} color={colors.ink} />}
                  {activeViagemDia?.status === status && isUpdatingTripStatus && <ActivityIndicator size="small" color={colors.ink} />}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.screenMargin, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  backBtn: { marginLeft: -spacing.md, marginRight: spacing.xs },
  title: { ...typography.title, color: colors.ink },
  currentStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, minHeight: layout.minTouch, alignSelf: 'flex-start' },
  timelineContainer: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 800, alignSelf: 'center' },
  stopRow: { flexDirection: 'row', minHeight: 80 },
  indicator: { alignItems: 'center', width: 32, marginRight: spacing.md },
  dot: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dotDriver: { backgroundColor: colors.slate500 },
  dotStudent: { backgroundColor: colors.primary },
  dotNum: { ...typography.captionBold, color: colors.onPrimary },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: -2, marginBottom: -2 },
  details: { flex: 1, paddingBottom: spacing.xl },
  stopLocal: { ...typography.heading, color: colors.ink },
  stopAddr: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs, marginBottom: spacing.md },
  detailsContent: { flex: 1 },
  studentCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.md, borderWidth: borders.hairline, borderColor: colors.border },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  studentName: { ...typography.label, fontSize: 18, lineHeight: 22, color: colors.ink },
  responsavelName: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, borderTopWidth: borders.hairline, borderTopColor: colors.border, paddingTop: spacing.md },
  quickBtn: { flexGrow: 1, flexBasis: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: layout.minTouch, paddingHorizontal: spacing.sm, borderRadius: radius.md, gap: spacing.xs, borderWidth: borders.hairline },
  btnEmbarcado: { borderColor: colors.successTint, backgroundColor: colors.successTint },
  btnDesembarcado: { borderColor: colors.infoTint, backgroundColor: colors.infoTint },
  btnFaltou: { borderColor: colors.dangerTint, backgroundColor: colors.dangerTint },
  btnActiveEmbarcado: { backgroundColor: colors.success, borderColor: colors.success },
  btnActiveDesembarcado: { backgroundColor: colors.info, borderColor: colors.info },
  btnActiveFaltou: { backgroundColor: colors.danger, borderColor: colors.danger },
  quickBtnText: { ...typography.captionBold },
  textWhite: { color: colors.surface },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  statusOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: layout.buttonLg, paddingHorizontal: spacing.lg, borderRadius: radius.button, marginBottom: spacing.sm, backgroundColor: colors.surface, borderWidth: borders.hairline, borderColor: colors.border },
  statusOptionActive: { backgroundColor: colors.primaryTint, borderWidth: borders.alert, borderColor: colors.ink },
});
