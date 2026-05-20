import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Logo from '../components/Logo';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/authService';

export default function LoginScreen({ onLogin }: any) {
  const navigation = useNavigation<any>();
  const { setCurrentUser, showToast } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'driver' | 'guardian' | 'school'>('driver');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('[LoginScreen] Botão pressionado');
    if (!email.trim() || !password.trim()) {
      showToast('Preencha e-mail e senha.', 'warning');
      return;
    }

    setLoading(true);
    console.log('[LoginScreen] Submit iniciado para:', email, 'Perfil:', selectedRole);

    try {
      let userData: any = null;
      let roleKey: 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA' = 'MOTORISTA';

      console.log('[LoginScreen] Chamando authService...');
      if (selectedRole === 'driver') {
        userData = await authService.loginMotorista(email.trim(), password.trim());
        roleKey = 'MOTORISTA';
      } else if (selectedRole === 'guardian') {
        userData = await authService.loginResponsavel(email.trim(), password.trim());
        roleKey = 'RESPONSAVEL';
      } else if (selectedRole === 'school') {
        userData = await authService.loginEscola(email.trim(), password.trim());
        roleKey = 'ESCOLA';
      }

      if (userData) {
        console.log('[LoginScreen] Login bem-sucedido:', userData);
        setCurrentUser(userData, roleKey);
        onLogin(selectedRole);

        const routeMap: any = {
          driver: 'DriverMain',
          guardian: 'GuardianMain',
          school: 'SchoolMain',
        };
        console.log('[LoginScreen] Navegando para:', routeMap[selectedRole]);
        navigation.navigate(routeMap[selectedRole]);
      } else {
        console.warn('[LoginScreen] Sem dados de usuário retornados');
        showToast('Credenciais inválidas ou erro no servidor.', 'error');
      }
    } catch (error: any) {
      console.error('[LoginScreen] Erro no login:', error);
      showToast(error.response?.data?.mensagem || 'Falha na conexão com o servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          <View style={styles.brandContainer}>
            <Logo size="large" showText={false} />
            <Text style={styles.title}>Tio da Perua</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.segmentedControl}>
              {['driver', 'guardian', 'school'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.segmentButton,
                    selectedRole === role && styles.segmentButtonActive,
                  ]}
                  onPress={() => setSelectedRole(role as any)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedRole === role && styles.segmentTextActive,
                    ]}
                  >
                    {role === 'driver'
                      ? 'Motorista'
                      : role === 'guardian'
                      ? 'Responsável'
                      : 'Escola'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail (ex: teste@teste.com)"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Senha"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#86868B"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register', { role: selectedRole })}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>Cadastrar</Text>
            </TouchableOpacity>
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
  offlineBadge: { fontSize: 10, color: '#FF3B30', fontWeight: 'bold', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, elevation: 4 },
  segmentedControl: {
    flexDirection: 'row', backgroundColor: '#F5F5F7',
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  segmentButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: '#FFFFFF' },
  segmentText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#86868B' },
  segmentTextActive: { color: '#1976D2' },
  input: {
    height: 52, borderRadius: 12, backgroundColor: '#F5F5F7',
    paddingHorizontal: 16, marginBottom: 16,
  },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { position: 'absolute', right: 16 },
  loginButton: {
    height: 52, borderRadius: 12, backgroundColor: '#1976D2',
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  loginButtonDisabled: { backgroundColor: '#90CAF9' },
  loginButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  registerButton: {
    height: 52, borderRadius: 12, borderWidth: 2, borderColor: '#1976D2',
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  registerButtonText: { color: '#1976D2', fontWeight: '600' },
});
