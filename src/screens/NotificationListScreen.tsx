import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { notificacaoService } from '../services/notificacaoService';
import { NotificacaoDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import SchoolLayout from '../components/SchoolLayout';
import ConfirmDialog from '../components/ConfirmDialog';

export default function NotificationListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { currentUser, userRole, showToast } = useAppContext();
  const [notifications, setNotifications] = useState<NotificacaoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const getUsuarioId = () => {
    if (!currentUser) return null;
    return (currentUser as any).usuarioDTO?.id || (currentUser as any).usuario?.id;
  };

  const loadNotifications = useCallback(async (isRefresh = false) => {
    const userId = getUsuarioId();
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!isRefresh) setLoading(true);
    try {
      const data = await notificacaoService.listar(userId);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showToast('Erro ao carregar notificações.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isFocused) {
      loadNotifications();
    }
  }, [isFocused, loadNotifications]);

  const handleMarkAsRead = (id: number) => {
    setSelectedNotif(id);
    setConfirmVisible(true);
  };

  const confirmMarkAsRead = async () => {
    if (selectedNotif === null) return;
    setActionLoading(true);
    try {
      await notificacaoService.visualizar(selectedNotif);
      showToast('Notificação marcada como lida.', 'success');
      setNotifications(prev => prev.filter(n => n.id !== selectedNotif));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('Erro ao atualizar notificação.', 'error');
    } finally {
      setActionLoading(false);
      setConfirmVisible(false);
      setSelectedNotif(null);
    }
  };

  const renderItem = ({ item }: { item: NotificacaoDTO }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.notifTitle}>{item.titulo}</Text>
        <Text style={styles.dateText}>
          {new Date(item.dataCriacao).toLocaleDateString()} {new Date(item.dataCriacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      
      <Text style={styles.messageText}>{item.mensagem}</Text>
      
      <View style={styles.divider} />
      
      <View style={styles.remetenteContainer}>
        <View style={styles.remetenteInfo}>
          <Text style={styles.remetenteLabel}>Remetente:</Text>
          <Text style={styles.remetenteValue}>{item.remetente.nome}</Text>
        </View>
        <View style={styles.remetenteInfo}>
          <Text style={styles.remetenteLabel}>Perfil:</Text>
          <Text style={styles.remetenteValue}>{item.remetente.tipoPerfil}</Text>
        </View>
        <View style={styles.remetenteInfo}>
          <Text style={styles.remetenteLabel}>Telefone:</Text>
          <Text style={styles.remetenteValue}>{item.remetente.telefone}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.readButton} 
        onPress={() => handleMarkAsRead(item.id)}
      >
        <Feather name="check-circle" size={18} color="#1976D2" />
        <Text style={styles.readButtonText}>MARCAR COMO LIDA</Text>
      </TouchableOpacity>
    </View>
  );

  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificações</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('NotificationCreate')}
        >
          <Feather name="plus" size={20} color="#FFF" />
          <Text style={styles.createButtonText}>NOVA NOTIFICAÇÃO</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="bell-off" size={64} color="#D1D1D6" />
              <Text style={styles.emptyText}>Você não tem novas notificações.</Text>
            </View>
          }
        />
      )}

      <ConfirmDialog
        visible={confirmVisible}
        title="Confirmar Leitura"
        message="Esta notificação será removida da sua lista. Deseja continuar?"
        onConfirm={confirmMarkAsRead}
        onCancel={() => setConfirmVisible(false)}
        loading={actionLoading}
        destructive={false}
        confirmLabel="Confirmar"
      />
    </View>
  );

  if (userRole === 'MOTORISTA') return <DriverLayout>{content}</DriverLayout>;
  if (userRole === 'RESPONSAVEL') return <GuardianLayout>{content}</GuardianLayout>;
  if (userRole === 'ESCOLA') return <SchoolLayout>{content}</SchoolLayout>;
  
  return content;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#1D1D1F' },
  createButton: { 
    flexDirection: 'row', 
    backgroundColor: '#1976D2', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  createButtonText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginLeft: 4 },
  list: { padding: 15, paddingBottom: 30 },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  notifTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#1D1D1F', flex: 1, marginRight: 8 },
  dateText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#8E8E93' },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#3A3A3C', lineHeight: 22, marginBottom: 12 },
  divider: { hieght: 1, backgroundColor: '#F2F2F7', marginVertical: 12 },
  remetenteContainer: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, marginBottom: 12 },
  remetenteInfo: { flexDirection: 'row', marginBottom: 4 },
  remetenteLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#8E8E93', width: 70 },
  remetenteValue: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#1D1D1F', flex: 1 },
  readButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 4,
  },
  readButtonText: { color: '#1976D2', fontFamily: 'Inter_700Bold', fontSize: 13, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: '#8E8E93', marginTop: 16, textAlign: 'center' },
});
