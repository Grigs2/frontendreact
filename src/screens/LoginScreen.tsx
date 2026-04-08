import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Logo from '../components/Logo';

export default function LoginScreen({ onLogin }: any) {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'driver' | 'guardian' | 'school'>('driver');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Platform.OS === 'web' ? window.alert('Preencha os campos.') : Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    try {
      const stored = await AsyncStorage.getItem('@users');
      const users = stored ? JSON.parse(stored) : [];
      const user = users.find((u: any) => u.email === email.trim().toLowerCase() && u.password === password && u.role === selectedRole);

      if (!user) {
        Platform.OS === 'web' ? window.alert('Dados inválidos.') : Alert.alert('Erro', 'Dados inválidos.');
        return;
      }

      await AsyncStorage.setItem('@loggedUser', user.email);
      onLogin(user.role);

      const routeMap: any = { driver: 'DriverMain', guardian: 'GuardianMain', school: 'SchoolMain' };
      navigation.navigate(routeMap[user.role]);
    } catch {
      Platform.OS === 'web' ? window.alert('Erro ao logar.') : Alert.alert('Erro', 'Não foi possível verificar.');
    }
  };

  return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.wrapper}>
            <View style={styles.brandContainer}><Logo size="large" showText={false} /><Text style={styles.title}>Tio da Perua</Text></View>
            <View style={styles.card}>
              <View style={styles.segmentedControl}>
                {['driver', 'guardian', 'school'].map((role) => (
                    <TouchableOpacity key={role} style={[styles.segmentButton, selectedRole === role && styles.segmentButtonActive]} onPress={() => setSelectedRole(role as any)}>
                      <Text style={[styles.segmentText, selectedRole === role && styles.segmentTextActive]}>{role === 'driver' ? 'Motorista' : role === 'guardian' ? 'Responsável' : 'Escola'}</Text>
                    </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" />
              <View style={styles.passwordContainer}>
                <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword} placeholder="Senha" secureTextEntry={!showPassword} />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}><Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#86868B" /></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}><Text style={styles.loginButtonText}>Entrar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register', { role: selectedRole })}><Text style={styles.registerButtonText}>Cadastrar</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  wrapper: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandContainer: { alignItems: 'center', marginBottom: 48 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 32, color: '#1D1D1F' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, elevation: 4 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F5F5F7', borderRadius: 12, padding: 4, marginBottom: 24 },
  segmentButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', cursor: 'pointer' } as any,
  segmentButtonActive: { backgroundColor: '#FFFFFF' },
  segmentText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#86868B' },
  segmentTextActive: { color: '#1976D2' },
  input: { height: 52, borderRadius: 12, backgroundColor: '#F5F5F7', paddingHorizontal: 16, marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { position: 'absolute', right: 16, cursor: 'pointer' } as any,
  loginButton: { height: 52, borderRadius: 12, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center', marginTop: 16, cursor: 'pointer' } as any,
  loginButtonText: { color: '#FFFFFF', fontWeight: '600' },
  registerButton: { height: 52, borderRadius: 12, borderWidth: 2, borderColor: '#1976D2', alignItems: 'center', justifyContent: 'center', marginTop: 12, cursor: 'pointer' } as any,
  registerButtonText: { color: '#1976D2', fontWeight: '600' },
});