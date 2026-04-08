import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependentForm'>;

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export default function GuardianDependentFormScreen({ navigation, route }: Props) {
  const dependentId = route.params?.dependentId;
  const isEditing = !!dependentId;

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [periodo, setPeriodo] = useState<'Matutino' | 'Vespertino'>('Matutino');
  const [endereco, setEndereco] = useState('');
  const [escola, setEscola] = useState('');

  useEffect(() => {
    if (isEditing) {
      loadDependent();
    }
  }, []);

  const loadDependent = async () => {
    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      if (!loggedEmail) return;

      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const user = users.find((u: { email: string }) => u.email === loggedEmail);

      const dep = (user?.dependents || []).find(
        (d: { id: string }) => d.id === dependentId
      );

      if (dep) {
        setNome(dep.nome || '');
        setCpf(dep.cpf || '');
        setDataNascimento(dep.dataNascimento || '');
        setPeriodo(dep.periodo || 'Matutino');
        setEndereco(dep.endereco || '');
        setEscola(dep.escola || '');
      }
    } catch {
      // silently fail
    }
  };

  const handleSave = async () => {
    if (!nome.trim() || !cpf.trim() || !dataNascimento.trim() || !endereco.trim() || !escola.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      if (!loggedEmail) {
        Alert.alert('Erro', 'Usuário não identificado.');
        return;
      }

      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const userIndex = users.findIndex((u: { email: string }) => u.email === loggedEmail);

      if (userIndex === -1) {
        Alert.alert('Erro', 'Usuário não encontrado.');
        return;
      }

      if (!users[userIndex].dependents) {
        users[userIndex].dependents = [];
      }

      const dependentData = {
        nome: nome.trim(),
        cpf: cpf.trim(),
        dataNascimento: dataNascimento.trim(),
        periodo,
        endereco: endereco.trim(),
        escola: escola.trim(),
      };

      if (isEditing) {
        const depIndex = users[userIndex].dependents.findIndex(
          (d: { id: string }) => d.id === dependentId
        );
        if (depIndex !== -1) {
          users[userIndex].dependents[depIndex] = {
            ...users[userIndex].dependents[depIndex],
            ...dependentData,
          };
        }
      } else {
        users[userIndex].dependents.push({
          id: generateId(),
          ...dependentData,
        });
      }

      await AsyncStorage.setItem('@users', JSON.stringify(users));
      console.log('Usuários salvos:', JSON.stringify(users, null, 2));
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
  };

  return (
    <GuardianLayout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isEditing ? 'Editar Dependente' : 'Novo Dependente'}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? 'Altere os dados do dependente' : 'Preencha os dados do dependente'}
          </Text>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Nome completo"
                placeholderTextColor="#86868B"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CPF</Text>
              <TextInput
                style={styles.input}
                value={cpf}
                onChangeText={(text) => setCpf(maskCpf(text))}
                placeholder="000.000.000-00"
                placeholderTextColor="#86868B"
                keyboardType="numeric"
                maxLength={14}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <TextInput
                style={styles.input}
                value={dataNascimento}
                onChangeText={(text) => setDataNascimento(maskDate(text))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#86868B"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Período</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, periodo === 'Matutino' && styles.segmentButtonActive]}
                  onPress={() => setPeriodo('Matutino')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, periodo === 'Matutino' && styles.segmentTextActive]}>
                    Matutino
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, periodo === 'Vespertino' && styles.segmentButtonActive]}
                  onPress={() => setPeriodo('Vespertino')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, periodo === 'Vespertino' && styles.segmentTextActive]}>
                    Vespertino
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Endereço</Text>
              <TextInput
                style={styles.input}
                value={endereco}
                onChangeText={setEndereco}
                placeholder="Endereço completo"
                placeholderTextColor="#86868B"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Escola</Text>
              <TextInput
                style={styles.input}
                value={escola}
                onChangeText={setEscola}
                placeholder="Nome da escola"
                placeholderTextColor="#86868B"
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveButtonText}>{isEditing ? 'Salvar' : 'Cadastrar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#86868B',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    fontWeight: '400',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    color: '#1D1D1F',
    paddingHorizontal: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#1976D2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    fontWeight: '500',
    color: '#86868B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#E53935',
  },
  cancelButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#E53935',
  },
});
