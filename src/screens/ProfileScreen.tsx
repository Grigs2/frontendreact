import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import SchoolLayout from '../components/SchoolLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { motoristaService } from '../services/motoristaService';
import { responsavelService } from '../services/responsavelService';
import { escolaService } from '../services/escolaService';
import PasswordConfirmationModal from '../components/PasswordConfirmationModal';
import { Button, TextField } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverProfile' | 'GuardianProfile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { currentUser, userRole, setCurrentUser, showToast } = useAppContext();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setNome(currentUser.nome || '');
      const user = (currentUser as any).usuarioDTO || (currentUser as any).usuario;
      setEmail(user?.email || '');
      setTelefone(user?.telefone || '');
      setEndereco(user?.endereco || '');
    }
  }, [currentUser]);

  const handlePreSave = () => {
    if (!nome.trim() || !telefone.trim() || !endereco.trim()) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }
    setShowPasswordModal(true);
  };

  const handleSave = async (password: string) => {
    setLoading(true);
    try {
      let result;
      if (userRole === 'MOTORISTA') {
        const motorista = currentUser as any;
        result = await motoristaService.alterarInfos({
          ...motorista,
          nome: nome.trim(),
          usuarioDTO: {
            ...motorista.usuarioDTO,
            telefone: telefone.trim(),
            endereco: endereco.trim(),
            senha: password,
          }
        });
      } else if (userRole === 'RESPONSAVEL') {
        const responsavel = currentUser as any;
        result = await responsavelService.alterarInfos({
          ...responsavel,
          nome: nome.trim(),
          usuario: {
            ...responsavel.usuario,
            telefone: telefone.trim(),
            endereco: endereco.trim(),
            senha: password,
          }
        });
      } else if (userRole === 'ESCOLA') {
        const escola = currentUser as any;
        result = await escolaService.alterarInfos({
          ...escola,
          nome: nome.trim(),
          usuarioDTO: {
            ...escola.usuarioDTO,
            telefone: telefone.trim(),
            endereco: endereco.trim(),
            senha: password,
          }
        });
      }

      if (result) {
        setCurrentUser(result, userRole);
        showToast('Informações atualizadas com sucesso!', 'success');
        setShowPasswordModal(false);
      }
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      showToast(error.response?.data?.mensagem || 'Falha ao atualizar cadastro. Verifique sua senha.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Feather name="user" size={40} color={colors.ink} />
          </View>
          <Text style={styles.title} accessibilityRole="header">Meu Cadastro</Text>
          <Text style={styles.subtitle}>Gerencie suas informações pessoais</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Nome Completo"
            leftIcon="user"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome"
            editable={!loading}
          />

          <TextField
            label="E-mail (Não editável)"
            leftIcon="mail"
            value={email}
            editable={false}
          />

          <TextField
            label="Telefone / WhatsApp"
            leftIcon="phone"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            placeholder="(00) 00000-0000"
            editable={!loading}
          />

          <TextField
            label="Endereço"
            leftIcon="map-pin"
            value={endereco}
            onChangeText={setEndereco}
            placeholder="Rua, número, bairro..."
            editable={!loading}
          />

          <Button
            label="Salvar Alterações"
            icon="check"
            iconPosition="right"
            onPress={handlePreSave}
            loading={loading}
            fullWidth
            style={styles.saveButton}
          />
        </View>
      </ScrollView>

      <PasswordConfirmationModal
        visible={showPasswordModal}
        onConfirm={handleSave}
        onCancel={() => setShowPasswordModal(false)}
        loading={loading}
      />
    </KeyboardAvoidingView>
  );

  if (userRole === 'MOTORISTA') return <DriverLayout>{content}</DriverLayout>;
  if (userRole === 'ESCOLA') return <SchoolLayout>{content}</SchoolLayout>;
  return <GuardianLayout>{content}</GuardianLayout>;
}

const styles = StyleSheet.create({
  container: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  avatarCircle: { width: 80, height: 80, borderRadius: radius.pill, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.slate500, marginTop: spacing.xs, textAlign: 'center' },
  form: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, gap: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border },
  saveButton: { marginTop: spacing.sm },
});
