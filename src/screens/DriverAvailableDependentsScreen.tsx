import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteDTO } from '../types';
import DriverLayout from '../components/DriverLayout';

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
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => handleRequestStudent(item.id!)}
        disabled={loading}
      >
        <Feather name="plus-circle" size={24} color="#1976D2" />
      </TouchableOpacity>
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.title}>Alunos Disponíveis</Text>
        </View>

        {loading && dependents.length === 0 ? (
          <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={dependents}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="users" size={48} color="#D1D1D6" />
                <Text style={styles.emptyText}>Nenhum aluno encontrado para este período.</Text>
              </View>
            }
          />
        )}
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, marginTop: 10 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  list: { paddingBottom: 20 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    elevation: 2 
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  detail: { fontSize: 13, color: '#1976D2', marginTop: 2, fontFamily: 'Inter_600SemiBold' },
  address: { fontSize: 12, color: '#86868B', marginTop: 4 },
  actionButton: { padding: 8 },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyText: { marginTop: 16, color: '#86868B', fontSize: 16, textAlign: 'center' }
});
