import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import GuardianLayout from '../components/GuardianLayout';
import StatusBadge from '../components/StatusBadge';
import { responsavelService } from '../services/responsavelService';
import { viagemService } from '../services/viagemService';
import { ResponsavelDTO, SolicitacaoDTO } from '../types';

import ConfirmDialog from '../components/ConfirmDialog';
import { Button, ScreenHeader, SegmentedControl, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

export default function GuardianInvitesScreen() {
  const isFocused = useIsFocused();
  const { currentUser, pendingSolicitations, updateSolicitations, showToast } = useAppContext();

  const [activeTab, setActiveTab] = useState<'TRIP' | 'DRIVER'>('TRIP');
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [showConfirmUnlink, setShowConfirmUnlink] = useState(false);
  const [selectedSolId, setSelectedSolId] = useState<number | null>(null);

  const tripCache = useRef<Record<number, string>>({});

  const guardian = currentUser as ResponsavelDTO;

  const enrichSolicitations = useCallback(async (sols: SolicitacaoDTO[]) => {
    const uniqueViagemIds = Array.from(new Set(sols.map(s => s.viagemId)));
    const neededIds = uniqueViagemIds.filter(id => !tripCache.current[id]);

    if (neededIds.length > 0) {
      setLoadingPeriods(true);
      try {
        await Promise.all(neededIds.map(async (id) => {
          try {
            const trip = await viagemService.visualizar(id);
            if (trip?.periodo) {
              tripCache.current[id] = trip.periodo;
            }
          } catch (e) {
            console.warn(`Failed to fetch period for trip ${id}`, e);
          }
        }));
      } finally {
        setLoadingPeriods(false);
      }
    }

    const enriched = sols.map(s => ({
      ...s,
      periodo: s.periodo || tripCache.current[s.viagemId] || 'N/A'
    }));
    updateSolicitations(enriched);
  }, [updateSolicitations]);

  const loadData = async () => {
    if (!guardian?.id) return;
    setLoading(true);
    try {
      const sols = await responsavelService.listarSolicitacoes(guardian.id);
      await enrichSolicitations(sols);
    } catch (error) {
      console.error('Error loading solicitations:', error);
      showToast('Erro ao carregar solicitações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && guardian?.id) {
      loadData();
    }
  }, [isFocused]);

  const handleTripResponse = async (solId: number, accept: boolean) => {
    setLoading(true);
    try {
      await responsavelService.responderSolicitacao(solId, accept);
      showToast(accept ? 'Solicitação aceita!' : 'Solicitação recusada.', 'success');
      loadData();
    } catch (error) {
      showToast('Não foi possível registrar a resposta.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (selectedSolId === null) return;
    setLoading(true);
    try {
      await responsavelService.encerrarVinculo(selectedSolId);
      showToast('Vínculo encerrado com sucesso!', 'success');
      setShowConfirmUnlink(false);
      setSelectedSolId(null);
      loadData();
    } catch (error) {
      showToast('Não foi possível encerrar o vínculo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tripInvites = pendingSolicitations.filter(s => !s.respondido);
  const linkedDrivers = pendingSolicitations.filter(s => s.aceito && !s.dataFim);

  const getStatusVariant = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('ACEITA') || s.includes('ATIVA')) return 'success';
    if (s.includes('PENDENTE')) return 'warning';
    if (s.includes('ENCERRADA') || s.includes('CANCELADA')) return 'error';
    return 'default';
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <ScreenHeader title="Convites & Associações" subtitle="Gerencie profissionais e viagens" />

        <SegmentedControl
          options={[
            { value: 'TRIP', label: 'Convites' },
            { value: 'DRIVER', label: 'Vínculos Ativos' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
          style={styles.tabs}
        />

        {loading && <StateView kind="loading" style={styles.loading} />}

        {activeTab === 'TRIP' ? (
          <FlatList
            data={tripInvites}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const student = guardian.dependentes?.find(d => d.id === item.dependenteId);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.tripIcon}>
                      <Feather name="truck" size={24} color={colors.ink} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.driverName}>{item.motoristaNome || `Motorista Viagem #${item.viagemId}`}</Text>
                      <View style={styles.periodRow}>
                        <Feather name="clock" size={14} color={colors.slate500} />
                        {loadingPeriods && !item.periodo ? (
                          <ActivityIndicator size="small" color={colors.ink} style={{ marginLeft: 4 }} />
                        ) : (
                          <Text style={styles.periodText}>{item.periodo?.replace('_', ' ') || 'Carregando...'}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.inviteText}>
                    Solicitou transportar <Text style={styles.bold}>{item.dependenteNome || student?.nome || 'Dependente #' + item.dependenteId}</Text>.
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      label="Recusar"
                      variant="secondary"
                      size="md"
                      onPress={() => handleTripResponse(item.id!, false)}
                      disabled={loading}
                      style={styles.btn}
                    />
                    <Button
                      label="Aceitar"
                      size="md"
                      onPress={() => handleTripResponse(item.id!, true)}
                      disabled={loading}
                      style={styles.btn}
                    />
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={!loading ? <StateView kind="empty" icon="mail" title="Nenhum convite pendente." /> : undefined}
          />
        ) : (
          <FlatList
            data={linkedDrivers}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const student = guardian.dependentes?.find(d => d.id === item.dependenteId);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.motoristaNome?.charAt(0) || 'M'}</Text></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.driverName}>{item.motoristaNome || `Motorista Viagem #${item.viagemId}`}</Text>
                      {item.motoristaTelefone && <Text style={styles.driverPhone}>{item.motoristaTelefone}</Text>}
                    </View>
                    <StatusBadge status={item.status || 'ATIVA'} variant={getStatusVariant(item.status || 'ATIVA')} />
                  </View>

                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Feather name="user" size={14} color={colors.slate500} />
                      <Text style={styles.detailText}>Aluno: <Text style={styles.bold}>{item.dependenteNome || student?.nome || 'Dependente #' + item.dependenteId}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="book-open" size={14} color={colors.slate500} />
                      <Text style={styles.detailText}>Escola: <Text style={styles.bold}>{item.escolaNome || student?.escola?.nome || 'Não informada'}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="clock" size={14} color={colors.slate500} />
                      <Text style={styles.detailText}>Período: <Text style={styles.bold}>{item.periodo?.replace('_', ' ') || 'Não informado'}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="calendar" size={14} color={colors.slate500} />
                      <Text style={styles.detailText}>Início: <Text style={styles.bold}>{new Date(item.dataInicio).toLocaleDateString()}</Text></Text>
                    </View>
                  </View>

                  <Button
                    label="Encerrar Vínculo"
                    icon="user-x"
                    variant="destructive"
                    size="md"
                    onPress={() => {
                      setSelectedSolId(item.id!);
                      setShowConfirmUnlink(true);
                    }}
                    disabled={loading}
                    fullWidth
                  />
                </View>
              );
            }}
            ListEmptyComponent={!loading ? <StateView kind="empty" icon="link" title="Você não possui vínculos ativos." /> : undefined}
          />
        )}

        <ConfirmDialog
          visible={showConfirmUnlink}
          title="Encerrar Vínculo"
          message="Tem certeza que deseja encerrar o transporte com este motorista? Esta ação é irreversível."
          confirmLabel="Encerrar Vínculo"
          cancelLabel="Cancelar"
          onConfirm={handleUnlink}
          onCancel={() => {
            setShowConfirmUnlink(false);
            setSelectedSolId(null);
          }}
          destructive={true}
          loading={loading}
        />
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  tabs: { marginBottom: spacing.xl },
  loading: { paddingVertical: spacing.md },
  list: { paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  tripIcon: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  driverName: { ...typography.heading, color: colors.ink },
  periodRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.xs },
  periodText: { ...typography.captionBold, color: colors.slate500 },
  driverPhone: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs },
  inviteText: { ...typography.body, color: colors.slate700, marginBottom: spacing.lg },
  detailsList: { gap: spacing.sm, marginBottom: spacing.lg, backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { ...typography.caption, color: colors.slate700, flexShrink: 1 },
  bold: { fontFamily: typography.label.fontFamily, color: colors.ink },
  actions: { flexDirection: 'row', gap: layout.buttonGap },
  btn: { flex: 1 },
  avatar: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.heading, color: colors.ink },
});
