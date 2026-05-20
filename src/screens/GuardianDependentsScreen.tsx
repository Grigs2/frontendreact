import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import GuardianLayout from '../components/GuardianLayout';
import { responsavelService } from '../services/responsavelService';
import { ResponsavelDTO, SolicitacaoDTO, DependenteDTO } from '../types';

export default function GuardianDependentsScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { currentUser, pendingSolicitations, updateSolicitations } = useAppContext();
  
  const guardian = currentUser as ResponsavelDTO;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFocused && guardian?.id) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sols = await responsavelService.listarSolicitacoes(guardian.id!);
      updateSolicitations(sols);
    } catch (error) {
      console.error('Error loading solicitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: DependenteDTO }) => {
    const activeSol = pendingSolicitations.find(s => s.dependenteId === item.id && s.aceito && !s.dataFim);
    const pendingSol = pendingSolicitations.find(s => s.dependenteId === item.id && !s.respondido);

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.studentName}>{item.nome}</Text>
          <Text style={styles.schoolName}>Escola: {item.escola?.nome || 'Não vinculada'}</Text>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText, 
              activeSol ? styles.statusActive : pendingSol ? styles.statusPending : styles.statusInactive
            ]}>
              {activeSol ? 'Vínculo Ativo' : pendingSol ? 'Solicitação Pendente' : 'Sem Transporte'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('GuardianDependentForm', { dependentId: item.id })}
          >
            <Feather name="edit-2" size={18} color="#1976D2" />
            <Text style={styles.editText}>Editar Informações</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Meus Dependentes</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('GuardianDependentForm')}
            disabled={loading}
          >
            <Feather name="plus" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Novo</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color="#1976D2" style={{ marginBottom: 20 }} />}

        <FlatList
          data={guardian?.dependentes || []}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            !loading ? <Text style={styles.emptyText}>Nenhum dependente cadastrado.</Text> : null
          }
        />
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  addButton: { backgroundColor: '#1976D2', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addButtonText: { color: '#FFF', marginLeft: 4, fontFamily: 'Inter_600SemiBold' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardInfo: { marginBottom: 16 },
  studentName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  schoolName: { fontSize: 14, color: '#86868B', marginTop: 4 },
  statusBadge: { marginTop: 12 },
  statusText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  statusActive: { color: '#34C759' },
  statusPending: { color: '#FF9500' },
  statusInactive: { color: '#86868B' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 12 },
  editButton: { padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  editText: { color: '#1976D2', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteText: { color: '#FF3B30', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  emptyText: { textAlign: 'center', color: '#86868B', marginTop: 40 },
});
