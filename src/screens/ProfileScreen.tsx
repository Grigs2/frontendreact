import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
            <Feather name="user" size={40} color="#1976D2" />
          </View>
          <Text style={styles.title}>Meu Cadastro</Text>
          <Text style={styles.subtitle}>Gerencie suas informações pessoais</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color="#86868B" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={nome} 
                onChangeText={setNome} 
                placeholder="Seu nome"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail (Não editável)</Text>
            <View style={[styles.inputWrapper, styles.disabledInput]}>
              <Feather name="mail" size={18} color="#86868B" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={email} 
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp</Text>
            <View style={styles.inputWrapper}>
              <Feather name="phone" size={18} color="#86868B" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={telefone} 
                onChangeText={setTelefone} 
                keyboardType="phone-pad"
                placeholder="(00) 00000-0000"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço</Text>
            <View style={styles.inputWrapper}>
              <Feather name="map-pin" size={18} color="#86868B" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={endereco} 
                onChangeText={setEndereco} 
                placeholder="Rua, número, bairro..."
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, loading && { opacity: 0.7 }]} 
            onPress={handlePreSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                <Feather name="check" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
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
  container: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1D1D1F' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#86868B', marginTop: 4 },
  form: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1D1D1F', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#E0E0E0' },
  disabledInput: { backgroundColor: '#E9E9EB', borderColor: '#D1D1D6' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: '#1D1D1F' },
  saveButton: { backgroundColor: '#1976D2', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveButtonText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 16, marginRight: 8 },
});
