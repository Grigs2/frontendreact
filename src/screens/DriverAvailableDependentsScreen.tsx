import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import { Button, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverAvailableDependents'>;

export default function DriverAvailableDependentsScreen({ route, navigation }: Props) {
  const { viagemId } = route.params;
  const { showToast } = useAppContext();
  const [dependents, setDependents] = useState<DependenteDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDependents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await viagemService.listarDependentesDisponiveis(viagemId);
      setDependents(data);
    } catch (error) {
      console.error('Error loading available dependents:', error);
      showToast('Não foi possível carregar os dependentes disponíveis.', 'error');
    } finally {
      setLoading(false);
    }
  }, [viagemId]);

  useEffect(() => {
    loadDependents();
  }, [loadDependents]);

  const handleRequestStudent = async (dependenteId: number) => {
    setLoading(true);
    try {
      await viagemService.solicitarDependente(viagemId, dependenteId);
      showToast('Solicitação enviada ao responsável.', 'success');
      loadDependents();
    } catch (error) {
      console.error('Error requesting student:', error);
      showToast('Não foi possível enviar a solicitação.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: DependenteDTO }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.detail}>{item.escola?.nome || 'Sem escola vinculada'}</Text>
        <Text style={styles.address}>{item.endereco}</Text>
      </View>
      <Button
        variant="secondary"
        size="icon"
        icon="plus"
        accessibilityLabel={`Solicitar ${item.nome}`}
        onPress={() => handleRequestStudent(item.id!)}
        disabled={loading}
      />
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader title="Alunos Disponíveis" onBack={() => navigation.goBack()} />

        {loading && dependents.length === 0 ? (
          <StateView kind="loading" title="Carregando alunos..." />
        ) : (
          <FlatList
            data={dependents}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <StateView kind="empty" icon="users" title="Nenhum aluno encontrado para este período." />
            }
          />
        )}
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  list: { paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: layout.cardPadding,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  info: { flex: 1, gap: spacing.xs },
  name: { ...typography.heading, color: colors.ink },
  detail: { ...typography.body, color: colors.ink },
  address: { ...typography.caption, color: colors.slate500 },
});
