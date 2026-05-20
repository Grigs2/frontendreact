import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { ViagemDTO } from '../types';
import DriverLayout from '../components/DriverLayout';

const PERIODS = ['MANHA_IDA', 'MANHA_VOLTA', 'TARDE_IDA', 'TARDE_VOLTA', 'NOITE_IDA', 'NOITE_VOLTA'];

export default function DriverTripsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, showToast } = useAppContext();
  const [trips, setTrips] = useState<ViagemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);

  const loadTrips = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await viagemService.listarViagens(currentUser.id);
      setTrips(data);
    } catch (error) {
      console.error('Error loading trips:', error);
      showToast('Não foi possível carregar as viagens.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const handleCreateTrip = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      await viagemService.criar(currentUser.id, selectedPeriod);
      setShowCreateModal(false);
      loadTrips();
      showToast('Viagem criada com sucesso!', 'success');
    } catch (error) {
      console.error('Error creating trip:', error);
      showToast('Não foi possível criar a viagem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderTripItem = ({ item }: { item: ViagemDTO }) => (
    <TouchableOpacity 
      style={styles.tripCard}
      onPress={() => navigation.navigate('DriverTripDetails', { viagemId: item.id! })}
    >
      <View style={styles.tripIcon}>
        <Feather name="map-pin" size={24} color="#1976D2" />
      </View>
      <View style={styles.tripInfo}>
        <Text style={styles.tripPeriod}>{item.periodo.replace('_', ' ')}</Text>
        <Text style={styles.tripStatus}>{item.ativo ? 'Ativa' : 'Inativa'}</Text>
      </View>
      <Feather name="chevron-right" size={24} color="#86868B" />
    </TouchableOpacity>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Minhas Viagens</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Feather name="plus" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Nova</Text>
          </TouchableOpacity>
        </View>

        {loading && trips.length === 0 ? (
          <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={renderTripItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="map" size={48} color="#D1D1D6" />
                <Text style={styles.emptyText}>Nenhuma viagem ativa encontrada.</Text>
              </View>
            }
            refreshing={loading}
            onRefresh={loadTrips}
          />
        )}

        <Modal visible={showCreateModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Criar Nova Viagem</Text>
              <Text style={styles.modalLabel}>Selecione o Período:</Text>
              <ScrollView style={styles.periodList}>
                {PERIODS.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.periodOption, selectedPeriod === p && styles.periodSelected]}
                    onPress={() => setSelectedPeriod(p)}
                  >
                    <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextSelected]}>
                      {p.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={handleCreateTrip}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>Criar Viagem</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1976D2', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12,
    gap: 8
  },
  addButtonText: { color: '#FFF', fontFamily: 'Inter_600SemiBold' },
  list: { paddingBottom: 20 },
  tripCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  tripIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    backgroundColor: '#F2F2F7', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 16
  },
  tripInfo: { flex: 1 },
  tripPeriod: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  tripStatus: { fontSize: 13, color: '#86868B', marginTop: 2 },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyText: { marginTop: 16, color: '#86868B', fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#1D1D1F', marginBottom: 20 },
  modalLabel: { fontSize: 14, color: '#86868B', marginBottom: 12, fontFamily: 'Inter_600SemiBold' },
  periodList: { maxHeight: 300, marginBottom: 20 },
  periodOption: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8, backgroundColor: '#F2F2F7' },
  periodSelected: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#1976D2' },
  periodText: { fontSize: 16, color: '#1D1D1F', textAlign: 'center' },
  periodTextSelected: { color: '#1976D2', fontFamily: 'Inter_700Bold' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, padding: 16, alignItems: 'center' },
  cancelButtonText: { color: '#86868B', fontFamily: 'Inter_600SemiBold' },
  confirmButton: { flex: 2, backgroundColor: '#1976D2', padding: 16, borderRadius: 16, alignItems: 'center' },
  confirmButtonText: { color: '#FFF', fontFamily: 'Inter_700Bold' }
});
