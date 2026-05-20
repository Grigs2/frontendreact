import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { ViagemDTO, DependenteDTO } from '../types';
import DriverLayout from '../components/DriverLayout';

import ConfirmDialog from '../components/ConfirmDialog';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverTripDetails'>;

export default function DriverTripDetailsScreen({ route, navigation }: Props) {
  const { viagemId } = route.params;
  const { setActiveViagemDia, setCurrentStops, showToast } = useAppContext();
  const [viagem, setViagem] = useState<ViagemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);

  const loadViagem = useCallback(async () => {
    setLoading(true);
    try {
      const data = await viagemService.visualizar(viagemId);
      setViagem(data);
    } catch (error) {
      console.error('Error loading trip details:', error);
      showToast('Não foi possível carregar os detalhes da viagem.', 'error');
    } finally {
      setLoading(false);
    }
  }, [viagemId, showToast]);

  useFocusEffect(
    useCallback(() => {
      loadViagem();
    }, [loadViagem])
  );

  const handleIniciarViagem = async () => {
    setLoading(true);
    try {
      const viagemDia = await viagemService.iniciarViagemDia(viagemId);
      setActiveViagemDia(viagemDia);
      const stops = await viagemService.buscarParadasViagemDia(viagemDia.id!);
      setCurrentStops(stops);
      navigation.navigate('DriverAttendance', { viagemDiaId: viagemDia.id! });
    } catch (error) {
      console.error('Error starting trip:', error);
      showToast('Não foi possível iniciar a viagem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDesativarViagem = async () => {
    setLoading(true);
    try {
      await viagemService.desativarViagem(viagemId);
      showToast('Viagem desativada com sucesso!', 'success');
      setShowConfirmDeactivate(false);
      navigation.navigate('DriverTrips');
    } catch (error) {
      console.error('Error deactivating trip:', error);
      showToast('Não foi possível desativar a viagem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !viagem) {
    return (
      <DriverLayout>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </DriverLayout>
    );
  }

  if (!viagem) return null;

  return (
    <DriverLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalhes da Viagem</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="map" size={24} color="#1976D2" />
            <Text style={styles.cardTitle}>{viagem.periodo.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.cardSubtitle}>Status: {viagem.ativo ? 'Ativa' : 'Inativa'}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dependentes ({viagem.dependentes?.length || 0})</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('DriverAvailableDependents', { viagemId })}
              style={styles.addDepButton}
            >
              <Feather name="plus" size={16} color="#1976D2" />
              <Text style={styles.addDepText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {viagem.dependentes && viagem.dependentes.length > 0 ? (
            viagem.dependentes.map((dep) => (
              <View key={dep.id} style={styles.depCard}>
                <View style={styles.depInfo}>
                  <Text style={styles.depName}>{dep.nome}</Text>
                  <Text style={styles.depDetail}>{dep.escola?.nome || 'Sem escola vinculada'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhum dependente vinculado.</Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.startButton]}
            onPress={handleIniciarViagem}
            disabled={loading}
          >
            <Feather name="play" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Iniciar Viagem do Dia</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => setShowConfirmDeactivate(true)}
            disabled={loading}
          >
            <Feather name="trash-2" size={20} color="#FF3B30" />
            <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Desativar Viagem</Text>
          </TouchableOpacity>
        </View>

        <ConfirmDialog
          visible={showConfirmDeactivate}
          title="Desativar Viagem"
          message="Tem certeza que deseja desativar esta viagem permanentemente? Esta ação não pode ser desfeita."
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          onConfirm={handleDesativarViagem}
          onCancel={() => setShowConfirmDeactivate(false)}
          destructive={true}
          loading={loading}
        />
      </ScrollView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, marginTop: 10 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  card: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, elevation: 4, marginBottom: 32 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  cardTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  cardSubtitle: { fontSize: 14, color: '#86868B', fontFamily: 'Inter_500Medium' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  addDepButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addDepText: { color: '#1976D2', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  depCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#1976D2', elevation: 2 },
  depInfo: { flex: 1 },
  depName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' },
  depDetail: { fontSize: 13, color: '#86868B', marginTop: 2 },
  emptyText: { color: '#86868B', textAlign: 'center', marginTop: 10 },
  actions: { gap: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, gap: 10 },
  startButton: { backgroundColor: '#1976D2' },
  deleteButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FF3B30' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' }
});
