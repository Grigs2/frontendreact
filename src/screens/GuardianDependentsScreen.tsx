import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependents'>;

export default function GuardianDependentsScreen({ navigation }: Props) {
  const [dependents, setDependents] = useState<any[]>([]);

  const loadDependents = useCallback(async () => {
    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const user = users.find((u: any) => u.email === loggedEmail);
      setDependents(user?.dependents || []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadDependents(); }, [loadDependents]));

  const handleDelete = async (dep: any) => {
    const performDelete = async () => {
      try {
        const loggedEmail = await AsyncStorage.getItem('@loggedUser');
        const stored = await AsyncStorage.getItem('@users');
        const users = stored ? JSON.parse(stored) : [];
        const index = users.findIndex((u: any) => u.email === loggedEmail);
        if (index === -1) return;

        users[index].dependents = users[index].dependents.filter((d: any) => d.id !== dep.id);
        await AsyncStorage.setItem('@users', JSON.stringify(users));
        setDependents(users[index].dependents);
      } catch {
        Platform.OS === 'web' ? window.alert('Erro ao excluir.') : Alert.alert('Erro', 'Erro ao excluir.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Excluir ${dep.nome}?`)) performDelete();
    } else {
      Alert.alert('Excluir', `Deseja excluir ${dep.nome}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: performDelete }
      ]);
    }
  };

  return (
      <GuardianLayout>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Meus Dependentes</Text>
          <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('GuardianDependentForm', {})}>
            <Feather name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Novo Dependente</Text>
          </TouchableOpacity>

          {dependents.length === 0 ? (
              <View style={styles.emptyContainer}><Feather name="users" size={48} color="#C7C7CC" /><Text style={styles.emptyText}>Nenhum cadastrado</Text></View>
          ) : (
              dependents.map((dep) => (
                  <TouchableOpacity key={dep.id} style={styles.card} onPress={() => navigation.navigate('GuardianDependentForm', { dependentId: dep.id })}>
                    <View style={{ flex: 1 }}><Text style={styles.cardName}>{dep.nome}</Text><Text style={styles.cardSchool}>{dep.escola}</Text></View>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(dep)}>
                      <Feather name="trash-2" size={18} color="#E53935" />
                    </TouchableOpacity>
                  </TouchableOpacity>
              ))
          )}
        </ScrollView>
      </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1D1D1F', marginBottom: 16 },
  newButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1976D2', height: 48, borderRadius: 12, marginBottom: 24, cursor: 'pointer' } as any,
  newButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF', marginLeft: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#86868B', marginTop: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, cursor: 'pointer' } as any,
  cardName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1D1D1F' },
  cardSchool: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#86868B' },
  deleteButton: { padding: 8, borderRadius: 8, backgroundColor: '#FDECEA', cursor: 'pointer' } as any,
});