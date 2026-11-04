import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import DriverLayout from '../components/DriverLayout';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteDTO, MotoristaDTO } from '../types';
import { Chip, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

export default function DriverStudentsScreen() {
  const isFocused = useIsFocused();
  const { currentUser } = useAppContext();
  const driver = currentUser as MotoristaDTO;

  const [students, setStudents] = useState<DependenteDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFocused && driver?.id) {
      loadStudents();
    }
  }, [isFocused]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Since we don't have a "Listar Viagens" endpoint, we try to fetch students
      // from a default/known trip or simply handle the absence of a list.
      // In a real scenario, we would iterate through all driver's trips.

      const defaultTripId = 1; // Simulation
      const tripDetail = await viagemService.visualizar(defaultTripId);

      if (tripDetail && tripDetail.dependentes) {
        setStudents(tripDetail.dependentes);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStudentCard = ({ item }: { item: DependenteDTO }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Feather name="user" size={24} color={colors.ink} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.detail}>Período: {item.periodo.replace('_', ' ')}</Text>
        <Text style={styles.detail}>Escola: {item.escola?.nome || 'N/A'}</Text>
      </View>
      <Chip label="Ativo" tone="success" />
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader title="Meus Passageiros" />

        {loading && <StateView kind="loading" title="Carregando passageiros..." />}

        <FlatList
          data={students}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <StateView kind="empty" icon="users" title="Nenhum passageiro vinculado encontrado." />
            ) : null
          }
        />
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  list: { paddingBottom: spacing.xl },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.md, alignItems: 'center', gap: spacing.md, borderWidth: borders.hairline, borderColor: colors.border },
  avatar: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, gap: spacing.xs },
  name: { ...typography.heading, color: colors.ink },
  detail: { ...typography.caption, color: colors.slate700 },
});
