import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import DriverLayout from '../components/DriverLayout';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteDTO, MotoristaDTO } from '../types';

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
        <Feather name="user" size={24} color="#1976D2" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.detail}>Período: {item.periodo.replace('_', ' ')}</Text>
        <Text style={styles.detail}>Escola: {item.escola?.nome || 'N/A'}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Ativo</Text>
      </View>
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Meus Passageiros</Text>
        
        {loading && <ActivityIndicator color="#1976D2" style={{ marginBottom: 20 }} />}

        <FlatList
          data={students}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Feather name="users" size={48} color="#CCC" />
                <Text style={styles.emptyText}>Nenhum passageiro vinculado encontrado.</Text>
              </View>
            ) : null
          }
        />
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#1D1D1F', marginBottom: 20 },
  list: { paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1D1D1F' },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#666', marginTop: 2 },
  statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#2E7D32', fontFamily: 'Inter_700Bold', fontSize: 10 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#888', textAlign: 'center', marginTop: 12 },
});
