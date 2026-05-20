import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { ViagemDiaDTO, DependenteParadaDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import StatusBadge from '../components/StatusBadge';

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
          <Feather name="calendar" size={24} color="#86868B" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={styles.date}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
            <StatusBadge status={item.status} variant={getStatusVariant(item.status)} />
          </View>
          <View style={styles.details}>
            {item.periodo && (
              <View style={styles.detailItem}>
                <Feather name="clock" size={14} color="#86868B" />
                <Text style={styles.detailText}>{item.periodo.replace('_', ' ')}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Feather name="users" size={14} color="#86868B" />
              <Text style={styles.detailText}>
                {item.passengers?.length || item.quantidadePassageiros || 0} passageiros
              </Text>
            </View>
          </View>
        </View>
      </View>

      {item.passengers && item.passengers.length > 0 && (
        <View style={styles.passengerSection}>
          <Text style={styles.passengerTitle}>Lista de Passageiros:</Text>
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
        <Text style={styles.title}>Histórico de Viagens</Text>
        
        {loading && trips.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1976D2" />
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="clock" size={48} color="#D1D1D6" />
                <Text style={styles.emptyText}>Nenhuma viagem no histórico.</Text>
              </View>
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
  container: { flex: 1, padding: 20, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F', marginBottom: 24 },
  list: { paddingBottom: 20 },
  card: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F2F2F7'
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    backgroundColor: '#F2F2F7', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 16
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  details: { flexDirection: 'row', gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: '#86868B', fontFamily: 'Inter_500Medium' },
  passengerSection: { 
    borderTopWidth: 1, 
    borderTopColor: '#F2F2F7', 
    paddingTop: 12, 
    marginTop: 8,
    marginBottom: 8
  },
  passengerTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#86868B', marginBottom: 8, textTransform: 'uppercase' },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  passengerName: { fontSize: 14, color: '#1D1D1F', fontFamily: 'Inter_500Medium' },
  timeRow: { borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 8, marginTop: 4 },
  timeText: { fontSize: 12, color: '#AEAEB2', fontFamily: 'Inter_600SemiBold' },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyText: { marginTop: 16, color: '#86868B', fontSize: 16, textAlign: 'center' }
});
