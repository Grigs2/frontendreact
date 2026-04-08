import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation';

const ROLE_LABELS: Record<string, string> = {
  driver: 'Novo Motorista',
  guardian: 'Novo Responsável',
  school: 'Nova Escola',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    if (!email.trim() || !password.trim() || !address.trim() || !phone.trim()) {
      if (Platform.OS === 'web') window.alert('Preencha todos os campos.');
      else Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const exists = users.some((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());

      if (exists) {
        if (Platform.OS === 'web') window.alert('E-mail já cadastrado.');
        else Alert.alert('Atenção', 'E-mail já cadastrado.');
        return;
      }

      users.push({
        email: email.trim().toLowerCase(),
        password,
        address: address.trim(),
        phone: phone.trim(),
        role,
      });

      await AsyncStorage.setItem('@users', JSON.stringify(users));

      if (Platform.OS === 'web') {
        window.alert('Cadastro realizado com sucesso!');
        navigation.navigate('Login');
      } else {
        Alert.alert('Sucesso', 'Cadastro realizado!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch {
      if (Platform.OS === 'web') window.alert('Erro ao salvar.');
      else Alert.alert('Erro', 'Não foi possível salvar.');
    }
  };

  return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.wrapper}>
            <View style={styles.header}>
              <TouchableOpacity
                  onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
                  style={{ cursor: 'pointer' } as any}
              >
                <Feather name="arrow-left" size={24} color="#1D1D1F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>{ROLE_LABELS[role]}</Text>
            <Text style={styles.subtitle}>Preencha os dados para criar sua conta</Text>
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput style={[styles.input, styles.passwordInput]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#86868B" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Endereço</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Rua, número, bairro" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Telefone</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 60 },
  wrapper: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  header: { marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#1D1D1F', marginBottom: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#86868B', marginBottom: 32 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, elevation: 4, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  fieldGroup: { marginBottom: 24 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1D1D1F', marginBottom: 12 },
  input: { fontFamily: 'Inter_400Regular', fontSize: 17, height: 52, borderRadius: 12, backgroundColor: '#F5F5F7', paddingHorizontal: 16 },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eyeButton: { position: 'absolute', right: 16, cursor: 'pointer' } as any,
  saveButton: { height: 52, borderRadius: 12, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center', marginTop: 8, cursor: 'pointer' } as any,
  saveButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },
});