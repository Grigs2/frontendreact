import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { motoristaService } from '../services/motoristaService';
import { responsavelService } from '../services/responsavelService';
import { escolaService } from '../services/escolaService';
import { useAppContext } from '../context/AppContext';
import { Button, TextField } from '../components/ui';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

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
              <Button
                variant="tertiary"
                size="icon"
                icon="arrow-left"
                accessibilityLabel="Voltar"
                onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
              />
            </View>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>{ROLE_LABELS[role]}</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Preencha os dados para criar sua conta</Text>
            <View style={styles.card}>
              <TextField label="Nome Completo" value={name} onChangeText={setName} placeholder="Nome" />
              <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" />
              <TextField
                label="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'eye-off' : 'eye'}
                rightIconLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
              <TextField label="CPF" value={cpf} onChangeText={setCpf} placeholder="000.000.000-00" />
              <TextField label="Data de Nascimento" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" />
              {role === 'driver' && (
                <TextField label="CNH" value={cnh} onChangeText={setCnh} placeholder="Número da CNH" />
              )}
              {role === 'school' && (
                <TextField label="Administrador Responsável" value={admResponsavel} onChangeText={setAdmResponsavel} placeholder="Nome do Responsável" />
              )}
              <TextField label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número, bairro" />
              <TextField label="Telefone" value={phone} onChangeText={setPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
              <Button label="Salvar" onPress={handleSave} loading={loading} fullWidth style={styles.saveButton} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: layout.screenMargin, paddingTop: 48 },
  wrapper: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  header: { marginBottom: spacing.sm, marginLeft: -spacing.md },
  title: { ...typography.display, color: colors.ink, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.slate500, marginBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.lg },
  saveButton: { marginTop: spacing.sm },
});
