import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { notificacaoService } from '../services/notificacaoService';
import { UsuarioResumoDTO } from '../types';

export default function NotificationCreateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, showToast } = useAppContext();
  
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [destinatario, setDestinatario] = useState<UsuarioResumoDTO | null>(null);
  
  const [usuarios, setUsuarios] = useState<UsuarioResumoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getUsuarioId = () => {
    if (!currentUser) return null;
    return (currentUser as any).usuarioDTO?.id || (currentUser as any).usuario?.id;
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const list = await notificacaoService.listarUsuarios();
      // Filter out current user
      const currentId = getUsuarioId();
      setUsuarios(list.filter(u => u.id !== currentId));
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Erro ao carregar lista de destinatários.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async () => {
    const remetenteId = getUsuarioId();
    if (!remetenteId) return;

    if (!titulo.trim() || !mensagem.trim() || !destinatario) {
      showToast('Por favor, preencha todos os campos.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await notificacaoService.enviar({
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        visto: false,
        remetenteId,
        destinatarioId: destinatario.id,
      });
      showToast('Notificação enviada com sucesso!', 'success');
      navigation.navigate('NotificationList');
    } catch (error) {
      console.error('Error sending notification:', error);
      showToast('Erro ao enviar notificação.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.tipoPerfil.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova Notificação</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Destinatário:</Text>
          <TouchableOpacity 
            style={styles.dropdown} 
            onPress={() => setShowUserModal(true)}
            disabled={loading}
          >
            <Text style={[styles.dropdownValue, !destinatario && { color: '#8E8E93' }]}>
              {destinatario ? `${destinatario.nome} (${destinatario.tipoPerfil})` : 'Selecionar Destinatário...'}
            </Text>
            <Feather name="users" size={20} color="#1976D2" />
          </TouchableOpacity>

          <Text style={styles.label}>Título:</Text>
          <TextInput 
            style={styles.input} 
            value={titulo} 
            onChangeText={setTitulo} 
            placeholder="Ex: Mudança de Horário" 
            editable={!loading} 
          />

          <Text style={styles.label}>Mensagem:</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={mensagem} 
            onChangeText={setMensagem} 
            placeholder="Digite sua mensagem aqui..." 
            multiline 
            numberOfLines={5}
            editable={!loading} 
          />

          <TouchableOpacity 
            style={[styles.sendBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Feather name="send" size={20} color="#FFF" />
                <Text style={styles.sendBtnText}>ENVIAR AGORA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Modal visible={showUserModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Usuário</Text>
                <TouchableOpacity onPress={() => setShowUserModal(false)}>
                  <Feather name="x" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Feather name="search" size={18} color="#8E8E93" />
                <TextInput 
                  style={styles.searchInput}
                  placeholder="Buscar por nome ou perfil..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>

              {loadingUsers ? (
                <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 40 }} />
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.userItem} 
                      onPress={() => { setDestinatario(item); setShowUserModal(false); }}
                    >
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.nome}</Text>
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleText}>{item.tipoPerfil}</Text>
                        </View>
                      </View>
                      <Text style={styles.userPhone}>{item.telefone}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptySearch}>Nenhum usuário encontrado.</Text>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  form: { padding: 20 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#8E8E93', marginBottom: 8, marginTop: 16 },
  input: { 
    backgroundColor: '#F5F5F7', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    fontSize: 15, 
    height: 52,
    fontFamily: 'Inter_400Regular',
    color: '#1D1D1F'
  },
  textArea: { height: 120, paddingVertical: 15, textAlignVertical: 'top' },
  dropdown: { 
    height: 52, 
    backgroundColor: '#F5F5F7', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  dropdownValue: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#1D1D1F' },
  sendBtn: { 
    backgroundColor: '#1976D2', 
    height: 56, 
    borderRadius: 16, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40,
    gap: 8,
  },
  sendBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F2F2F7', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    marginBottom: 20 
  },
  searchInput: { flex: 1, height: 44, marginLeft: 8, fontFamily: 'Inter_400Regular' },
  userItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  userInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' },
  roleBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#1976D2' },
  userPhone: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  emptySearch: { textAlign: 'center', marginTop: 40, color: '#8E8E93', fontFamily: 'Inter_400Regular' },
});
