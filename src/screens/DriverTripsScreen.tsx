import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { ViagemDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import { Button, Chip, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Viagem ${item.periodo.replace('_', ' ')}, ${item.ativo ? 'ativa' : 'inativa'}`}
      style={({ pressed }) => [styles.tripCard, pressed && styles.tripCardPressed]}
      onPress={() => navigation.navigate('DriverTripDetails', { viagemId: item.id! })}
    >
      <View style={styles.tripIcon}>
        <Feather name="map-pin" size={24} color={colors.ink} />
      </View>
      <View style={styles.tripInfo}>
        <Text style={styles.tripPeriod}>{item.periodo.replace('_', ' ')}</Text>
        <Chip label={item.ativo ? 'Ativa' : 'Inativa'} tone={item.ativo ? 'success' : 'neutral'} size="sm" />
      </View>
      <Feather name="chevron-right" size={24} color={colors.slate500} />
    </Pressable>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Minhas Viagens</Text>
          <Button label="Nova" icon="plus" size="md" accessibilityLabel="Nova viagem" onPress={() => setShowCreateModal(true)} />
        </View>

        {loading && trips.length === 0 ? (
          <StateView kind="loading" title="Carregando viagens..." />
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={renderTripItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <StateView kind="empty" icon="map" title="Nenhuma viagem ativa encontrada." message="Crie uma viagem para começar a montar seu roteiro." />
            }
            refreshing={loading}
            onRefresh={loadTrips}
          />
        )}

        <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Criar Nova Viagem</Text>
              <Text style={styles.modalLabel}>Selecione o Período:</Text>
              <ScrollView style={styles.periodList}>
                {PERIODS.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedPeriod === p }}
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
                <Button label="Criar Viagem" onPress={handleCreateTrip} disabled={loading} fullWidth />
                <Button label="Cancelar" variant="tertiary" onPress={() => setShowCreateModal(false)} fullWidth />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, gap: spacing.md },
  title: { ...typography.title, color: colors.ink, flexShrink: 1 },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    padding: layout.cardPadding,
    borderRadius: radius.card,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  tripCardPressed: { backgroundColor: colors.background },
  tripIcon: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripInfo: { flex: 1, gap: spacing.sm },
  tripPeriod: { ...typography.heading, color: colors.ink },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '80%', width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalTitle: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  modalLabel: { ...typography.captionBold, color: colors.slate700, marginBottom: spacing.md },
  periodList: { maxHeight: 300, marginBottom: spacing.xl },
  periodOption: { minHeight: layout.buttonLg, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.button, marginBottom: spacing.sm, backgroundColor: colors.surface, borderWidth: borders.hairline, borderColor: colors.border },
  periodSelected: { backgroundColor: colors.primaryTint, borderWidth: borders.alert, borderColor: colors.ink },
  periodText: { ...typography.body, color: colors.ink, textAlign: 'center' },
  periodTextSelected: { ...typography.label, color: colors.ink },
  modalActions: { gap: layout.buttonGap },
});
