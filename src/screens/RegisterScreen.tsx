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
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { motoristaService } from '../services/motoristaService';
import { responsavelService } from '../services/responsavelService';
import { escolaService } from '../services/escolaService';
import { useAppContext } from '../context/AppContext';

const ROLE_LABELS: Record<string, string> = {
  driver: 'Novo Motorista',
  guardian: 'Novo Responsável',
  school: 'Nova Escola',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { showToast } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cnh, setCnh] = useState('');
  const [admResponsavel, setAdmResponsavel] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setAddress('');
    setPhone('');
    setName('');
    setCpf('');
    setBirthDate('');
    setCnh('');
    setAdmResponsavel('');
  };

  const handleSave = async () => {
    console.log('[RegisterScreen] Botão Salvar pressionado');
    if (!email.trim() || !password.trim() || !address.trim() || !phone.trim() || !name.trim() || !cpf.trim() || !birthDate.trim()) {
      showToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    setLoading(true);
    console.log('[RegisterScreen] Submit iniciado para:', email, 'Role:', role);

    try {
      if (role === 'driver') {
        if (!cnh.trim()) {
          showToast('Preencha a CNH.', 'warning');
          setLoading(false);
          return;
        }
        console.log('[RegisterScreen] Chamando motoristaService.cadastrar...');
        await motoristaService.cadastrar({
          nome: name,
          dataNascimento: birthDate,
          cpf,
          cnh,
          usuarioDTO: {
            email,
            senha: password,
            endereco: address,
            telefone: phone,
            tipoPerfil: 'MOTORISTA'
          }
        });
      } else if (role === 'guardian') {
        console.log('[RegisterScreen] Chamando responsavelService.cadastrar...');
        await responsavelService.cadastrar({
          nome: name,
          cpf,
          dataNascimento: birthDate,
          usuario: {
            email,
            senha: password,
            endereco: address,
            telefone: phone,
            tipoPerfil: 'RESPONSAVEL'
          }
        });
      } else if (role === 'school') {
        if (!admResponsavel.trim()) {
          showToast('Preencha o Administrador Responsável.', 'warning');
          setLoading(false);
          return;
        }
        console.log('[RegisterScreen] Chamando escolaService.cadastrar...');
        await escolaService.cadastrar({
          nome: name,
          admResponsavel,
          usuarioDTO: {
            email,
            senha: password,
            endereco: address,
            telefone: phone,
            tipoPerfil: 'ESCOLA'
          }
        });
      }

      console.log('[RegisterScreen] Cadastro bem-sucedido');
      showToast('Cadastro realizado com sucesso!', 'success');
      clearForm();
      navigation.navigate('Login');
    } catch (error: any) {
      console.error('[RegisterScreen] Erro no cadastro:', error);
      showToast(error.response?.data?.mensagem || 'Não foi possível realizar o cadastro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.wrapper}>
            <View style={styles.header}>
              <TouchableOpacity
                  onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
              >
                <Feather name="arrow-left" size={24} color="#1D1D1F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>{ROLE_LABELS[role]}</Text>
            <Text style={styles.subtitle}>Preencha os dados para criar sua conta</Text>
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome" />
              </View>
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
                <Text style={styles.label}>CPF</Text>
                <TextInput style={styles.input} value={cpf} onChangeText={setCpf} placeholder="000.000.000-00" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Data de Nascimento</Text>
                <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" />
              </View>
              {role === 'driver' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>CNH</Text>
                  <TextInput style={styles.input} value={cnh} onChangeText={setCnh} placeholder="Número da CNH" />
                </View>
              )}
              {role === 'school' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Administrador Responsável</Text>
                  <TextInput style={styles.input} value={admResponsavel} onChangeText={setAdmResponsavel} placeholder="Nome do Responsável" />
                </View>
              )}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Endereço</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Rua, número, bairro" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Telefone</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
              </View>
              <TouchableOpacity 
                style={[styles.saveButton, loading && { opacity: 0.7 }]} 
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
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