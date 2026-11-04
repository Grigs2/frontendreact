import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
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
import { Button, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

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
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Nova Notificação" onBack={() => navigation.goBack()} />

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Destinatário</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowUserModal(true)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={destinatario ? `Destinatário: ${destinatario.nome}` : 'Selecionar destinatário'}
            >
              <Text style={[styles.dropdownValue, !destinatario && styles.dropdownPlaceholder]}>
                {destinatario ? `${destinatario.nome} (${destinatario.tipoPerfil})` : 'Selecionar Destinatário...'}
              </Text>
              <Feather name="users" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <TextField
            label="Título"
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex: Mudança de Horário"
            editable={!loading}
          />

          <TextField
            label="Mensagem"
            value={mensagem}
            onChangeText={setMensagem}
            placeholder="Digite sua mensagem aqui..."
            multiline
            numberOfLines={5}
            editable={!loading}
          />

          <Button label="Enviar agora" icon="send" onPress={handleSend} loading={loading} fullWidth style={styles.sendBtn} />
        </View>

        <Modal visible={showUserModal} transparent animationType="slide" onRequestClose={() => setShowUserModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Usuário</Text>
                <Button variant="tertiary" size="icon" icon="x" accessibilityLabel="Fechar" onPress={() => setShowUserModal(false)} />
              </View>

              <TextField
                placeholder="Buscar por nome ou perfil..."
                accessibilityLabel="Buscar usuário"
                leftIcon="search"
                value={searchTerm}
                onChangeText={setSearchTerm}
                containerStyle={styles.searchContainer}
              />

              {loadingUsers ? (
                <StateView kind="loading" title="Carregando usuários..." />
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.userItem}
                      onPress={() => { setDestinatario(item); setShowUserModal(false); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecionar ${item.nome}`}
                    >
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.nome}</Text>
                        <Chip label={item.tipoPerfil} tone="info" size="sm" />
                      </View>
                      <Text style={styles.userPhone}>{item.telefone}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <StateView kind="empty" icon="users" title="Nenhum usuário encontrado." />
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
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: layout.screenMargin, paddingTop: 48, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center' },
  form: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  label: { ...typography.captionBold, color: colors.slate700 },
  dropdown: {
    minHeight: layout.buttonLg,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dropdownValue: { ...typography.body, color: colors.ink, flexShrink: 1 },
  dropdownPlaceholder: { color: colors.slate500 },
  sendBtn: { marginTop: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, height: '80%', width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.title, color: colors.ink, flexShrink: 1 },
  searchContainer: { marginBottom: spacing.lg },
  userItem: { minHeight: layout.buttonLg, justifyContent: 'center', paddingVertical: spacing.md, borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  userInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  userName: { ...typography.label, color: colors.ink, flexShrink: 1 },
  userPhone: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs },
});
