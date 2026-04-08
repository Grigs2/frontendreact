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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Logo from '../components/Logo';
import { UserRole } from '../types';
import { RootStackParamList } from '../navigation';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'driver' | 'guardian' | 'school'>('driver');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('@users');
      const users: Array<{ email: string; password: string; role: string }> =
        stored ? JSON.parse(stored) : [];

      const user = users.find(
        (u) =>
          u.email === email.trim().toLowerCase() &&
          u.password === password &&
          u.role === selectedRole,
      );

      if (!user) {
        Alert.alert('Erro', 'Dados inválidos.');
        return;
      }

      const role = user.role as 'driver' | 'guardian' | 'school';
      await AsyncStorage.setItem('@loggedUser', user.email);
      onLogin(role);

      if (role === 'driver') {
        navigation.navigate('DriverMain');
      } else if (role === 'guardian') {
        navigation.navigate('GuardianMain');
      } else {
        navigation.navigate('SchoolMain');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar as credenciais.');
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
          {/* Logo / Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.logoWrapper}>
              <Logo size="large" showText={false} />
            </View>
            <Text style={styles.title}>Tio da Perua</Text>
            <Text style={styles.subtitle}>Transporte escolar seguro</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {/* Role Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Selecione seu perfil</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    selectedRole === 'driver' && styles.segmentButtonActive,
                  ]}
                  onPress={() => setSelectedRole('driver')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedRole === 'driver' && styles.segmentTextActive,
                    ]}
                  >
                    Motorista
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    selectedRole === 'guardian' && styles.segmentButtonActive,
                  ]}
                  onPress={() => setSelectedRole('guardian')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedRole === 'guardian' && styles.segmentTextActive,
                    ]}
                  >
                    Responsável
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    selectedRole === 'school' && styles.segmentButtonActive,
                  ]}
                  onPress={() => setSelectedRole('school')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedRole === 'school' && styles.segmentTextActive,
                    ]}
                  >
                    Escola
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor="#86868B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#86868B"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#86868B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotContainer} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Entrar</Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register', { role: selectedRole })}
              activeOpacity={0.8}
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
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  wrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    fontWeight: '400',
    color: '#86868B',
    marginTop: 8,
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#86868B',
  },
  segmentTextActive: {
    color: '#1976D2',
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
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    fontWeight: '500',
    color: '#1976D2',
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  registerButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  registerButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: '#1976D2',
  },
});
