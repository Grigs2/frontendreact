import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { ViagemDiaDTO, DependenteParadaDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import StatusBadge from '../components/StatusBadge';
import { ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

export default function DriverHistoryScreen() {
  const { currentUser } = useAppContext();
  const [trips, setTrips] = useState<(ViagemDiaDTO & { passengers?: DependenteParadaDTO[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const stopsCache = useRef<Record<number, DependenteParadaDTO[]>>({});

  const fetchPassengers = async (viagemDiaId: number) => {
    if (stopsCache.current[viagemDiaId]) return stopsCache.current[viagemDiaId];
    try {
      const stops = await viagemService.buscarParadasViagemDia(viagemDiaId);
      // Extract unique passengers from all stops
      const passengerMap = new Map<number, DependenteParadaDTO>();
      stops.forEach(stop => {
        stop.listaDependentes.forEach(dep => {
          passengerMap.set(dep.id, dep);
        });
      });
      const passengers = Array.from(passengerMap.values());
      stopsCache.current[viagemDiaId] = passengers;
      return passengers;
    } catch { return []; }
  };

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await viagemService.historico(currentUser.id);

      // Fetch passengers for each trip in parallel
      const enrichedTrips = await Promise.all(
        data.map(async (trip) => {
          if (trip.id) {
            const passengers = await fetchPassengers(trip.id);
            return { ...trip, passengers };
          }
          return trip;
        })
      );

      setTrips(enrichedTrips);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de viagens.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'FINALIZADA': return 'success';
      case 'CANCELADA': return 'error';
      case 'EM_ANDAMENTO': return 'info';
      case 'PLANEJADA': return 'warning';
      default: return 'default';
    }
  };

  const renderItem = ({ item }: { item: ViagemDiaDTO & { passengers?: DependenteParadaDTO[] } }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Feather name="calendar" size={24} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={styles.date}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
            <StatusBadge status={item.status} variant={getStatusVariant(item.status)} />
          </View>
          <View style={styles.details}>
            {item.periodo && (
              <View style={styles.detailItem}>
                <Feather name="clock" size={14} color={colors.slate500} />
                <Text style={styles.detailText}>{item.periodo.replace('_', ' ')}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Feather name="users" size={14} color={colors.slate500} />
              <Text style={styles.detailText}>
                {item.passengers?.length || item.quantidadePassageiros || 0} passageiros
              </Text>
            </View>
          </View>
        </View>
      </View>

      {item.passengers && item.passengers.length > 0 && (
        <View style={styles.passengerSection}>
          <Text style={styles.passengerTitle}>Lista de passageiros</Text>
          {item.passengers.map((p) => (
            <View key={p.id} style={styles.passengerRow}>
              <Text style={styles.passengerName}>{p.nomeDependente}</Text>
              <StatusBadge status={p.statusEmbarque} size="small" variant={p.statusEmbarque === 'EMBARCADO' ? 'success' : p.statusEmbarque === 'FALTOU' ? 'error' : 'default'} />
            </View>
          ))}
        </View>
      )}

      {(item.horarioInicio || item.horarioFim) && (
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {item.horarioInicio ? new Date(item.horarioInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            {' '}-{' '}
            {item.horarioFim ? new Date(item.horarioFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader title="Histórico de Viagens" />

        {loading && trips.length === 0 ? (
          <StateView kind="loading" title="Carregando histórico..." style={styles.center} />
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <StateView kind="empty" icon="clock" title="Nenhuma viagem no histórico." />
            }
            refreshing={loading}
            onRefresh={loadHistory}
          />
        )}
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, backgroundColor: colors.background, width: '100%', maxWidth: 800, alignSelf: 'center' },
  center: { flex: 1 },
  list: { paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    padding: layout.cardPadding,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  iconContainer: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  date: { ...typography.heading, color: colors.ink },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { ...typography.caption, color: colors.slate500 },
  passengerSection: {
    borderTopWidth: borders.hairline,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  passengerTitle: { ...typography.captionBold, color: colors.slate700 },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  passengerName: { ...typography.body, color: colors.ink, flexShrink: 1 },
  timeRow: { borderTopWidth: borders.hairline, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  timeText: { ...typography.captionBold, color: colors.slate700 },
});
