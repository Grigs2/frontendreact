import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import { useAppContext } from '../context/AppContext';

export default function HistoryScreen() {
  const { userRole, currentUser } = useAppContext();
  
  const isDriver = userRole === 'MOTORISTA';
  
  // Note: Detailed presence history is currently not stored in the global state AppContextType.
  // This screen would ideally fetch history from viagemService.historico or a dedicated presence endpoint.
  // For now, we'll show an empty state or placeholder message to satisfy compilation.

  const content = (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Viagens</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.empty}>
          <Feather name="calendar" size={48} color="#E5E5EA" />
          <Text style={styles.emptyText}>Funcionalidade de histórico detalhado em implementação.</Text>
          <Text style={styles.subtitle}>Consulte o menu "Minhas Viagens" para ver rotas passadas.</Text>
        </View>
      </ScrollView>
    </View>
  );

  if (isDriver) return <DriverLayout>{content}</DriverLayout>;
  return <GuardianLayout>{content}</GuardianLayout>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1D1D1F', marginBottom: 20 },
  scroll: { paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#86868B', textAlign: 'center', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  subtitle: { marginTop: 8, color: '#AEAEB2', textAlign: 'center', fontSize: 14 },
});
