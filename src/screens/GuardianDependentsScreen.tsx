import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';

interface Dependent {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  periodo: string;
  endereco: string;
  escola: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependents'>;

export default function GuardianDependentsScreen({ navigation }: Props) {
  const [dependents, setDependents] = useState<Dependent[]>([]);

  const loadDependents = useCallback(async () => {
    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      if (!loggedEmail) return;

      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const user = users.find((u: { email: string }) => u.email === loggedEmail);

      setDependents(user?.dependents || []);
    } catch {
      // silently fail
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDependents();
    }, [loadDependents])
  );

  const handleDelete = (dependent: Dependent) => {
    Alert.alert(
      'Excluir Dependente',
      `Deseja realmente excluir ${dependent.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const loggedEmail = await AsyncStorage.getItem('@loggedUser');
              if (!loggedEmail) return;

              const stored = await AsyncStorage.getItem('@users');
              const users = stored ? JSON.parse(stored) : [];
              const index = users.findIndex((u: { email: string }) => u.email === loggedEmail);
              if (index === -1) return;

              users[index].dependents = (users[index].dependents || []).filter(
                (d: Dependent) => d.id !== dependent.id
              );

              await AsyncStorage.setItem('@users', JSON.stringify(users));
              setDependents(users[index].dependents);
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  return (
    <GuardianLayout>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Meus Dependentes</Text>

        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('GuardianDependentForm', {})}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.newButtonText}>Novo Dependente</Text>
        </TouchableOpacity>

        {dependents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>Nenhum dependente cadastrado</Text>
          </View>
        ) : (
          dependents.map((dep) => (
            <TouchableOpacity
              key={dep.id}
              style={styles.card}
              onPress={() => navigation.navigate('GuardianDependentForm', { dependentId: dep.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{dep.nome}</Text>
                <Text style={styles.cardSchool}>{dep.escola}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(dep)}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={18} color="#E53935" />
                <Text style={styles.deleteText}>Excluir</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    height: 48,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#86868B',
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  cardSchool: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#86868B',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FDECEA',
    gap: 6,
  },
  deleteText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#E53935',
  },
});
