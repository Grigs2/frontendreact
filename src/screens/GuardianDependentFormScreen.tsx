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
  return Math.random().toString(36).substr(2, 9);
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
    if (isEditing) loadDependent();
  }, []);

  const loadDependent = async () => {
    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const user = users.find((u: any) => u.email === loggedEmail);
      const dep = user?.dependents?.find((d: any) => d.id === dependentId);

      if (dep) {
        setNome(dep.nome);
        setCpf(dep.cpf);
        setDataNascimento(dep.dataNascimento);
        setPeriodo(dep.periodo);
        setEndereco(dep.endereco);
        setEscola(dep.escola);
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!nome.trim() || !cpf.trim() || !dataNascimento.trim() || !endereco.trim() || !escola.trim()) {
      Platform.OS === 'web' ? window.alert('Preencha todos os campos.') : Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    try {
      const loggedEmail = await AsyncStorage.getItem('@loggedUser');
      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const userIndex = users.findIndex((u: any) => u.email === loggedEmail);

      if (userIndex === -1) return;

      if (!users[userIndex].dependents) users[userIndex].dependents = [];

      const dependentData = {
        nome: nome.trim(),
        cpf: cpf.trim(),
        dataNascimento: dataNascimento.trim(),
        periodo,
        endereco: endereco.trim(),
        escola: escola.trim(),
      };

      if (isEditing) {
        const depIndex = users[userIndex].dependents.findIndex((d: any) => d.id === dependentId);
        if (depIndex !== -1) users[userIndex].dependents[depIndex] = { ...users[userIndex].dependents[depIndex], ...dependentData };
      } else {
        users[userIndex].dependents.push({ id: generateId(), ...dependentData });
      }

      await AsyncStorage.setItem('@users', JSON.stringify(users));

      if (Platform.OS === 'web') {
        window.alert('Salvo com sucesso!');
        navigation.goBack();
      } else {
        Alert.alert('Sucesso', 'Dados salvos!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch {
      Platform.OS === 'web' ? window.alert('Erro ao salvar.') : Alert.alert('Erro', 'Não foi possível salvar.');
    }
  };

  return (
      <GuardianLayout>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{isEditing ? 'Editar Dependente' : 'Novo Dependente'}</Text>
            <View style={styles.card}>
              <View style={styles.fieldGroup}><Text style={styles.label}>Nome</Text><TextInput style={styles.input} value={nome} onChangeText={setNome} /></View>
              <View style={styles.fieldGroup}><Text style={styles.label}>CPF</Text><TextInput style={styles.input} value={cpf} onChangeText={(t) => setCpf(maskCpf(t))} keyboardType="numeric" maxLength={14} /></View>
              <View style={styles.fieldGroup}><Text style={styles.label}>Nascimento</Text><TextInput style={styles.input} value={dataNascimento} onChangeText={(t) => setDataNascimento(maskDate(t))} keyboardType="numeric" maxLength={10} /></View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Período</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity style={[styles.segmentButton, periodo === 'Matutino' && styles.segmentButtonActive]} onPress={() => setPeriodo('Matutino')}><Text style={[styles.segmentText, periodo === 'Matutino' && styles.segmentTextActive]}>Matutino</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentButton, periodo === 'Vespertino' && styles.segmentButtonActive]} onPress={() => setPeriodo('Vespertino')}><Text style={[styles.segmentText, periodo === 'Vespertino' && styles.segmentTextActive]}>Vespertino</Text></TouchableOpacity>
                </View>
              </View>
              <View style={styles.fieldGroup}><Text style={styles.label}>Endereço</Text><TextInput style={styles.input} value={endereco} onChangeText={setEndereco} /></View>
              <View style={styles.fieldGroup}><Text style={styles.label}>Escola</Text><TextInput style={styles.input} value={escola} onChangeText={setEscola} /></View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveButtonText}>Salvar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1D1D1F', marginBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, elevation: 4 },
  fieldGroup: { marginBottom: 24 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1D1D1F', marginBottom: 12 },
  input: { fontFamily: 'Inter_400Regular', fontSize: 17, height: 52, borderRadius: 12, backgroundColor: '#F5F5F7', paddingHorizontal: 16 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F5F5F7', borderRadius: 12, padding: 4 },
  segmentButton: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, cursor: 'pointer' } as any,
  segmentButtonActive: { backgroundColor: '#1976D2' },
  segmentText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#86868B' },
  segmentTextActive: { color: '#FFFFFF' },
  saveButton: { height: 52, borderRadius: 12, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center', marginTop: 8, cursor: 'pointer' } as any,
  saveButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },
  cancelButton: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 2, borderColor: '#E53935', cursor: 'pointer' } as any,
  cancelButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#E53935' },
});