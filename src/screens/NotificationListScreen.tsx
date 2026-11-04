import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
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
import { Button, Chip, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

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
        <View style={styles.iconSlot}>
          <Feather name="bell" size={20} color={colors.ink} />
        </View>
        <View style={styles.cardTitleBox}>
          <Text style={styles.notifTitle}>{item.titulo}</Text>
          <Text style={styles.dateText}>
            {new Date(item.dataCriacao).toLocaleDateString()} {new Date(item.dataCriacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      <Text style={styles.messageText}>{item.mensagem}</Text>

      <View style={styles.remetenteContainer}>
        <View style={styles.remetenteInfo}>
          <Text style={styles.remetenteLabel}>Remetente</Text>
          <Text style={styles.remetenteValue}>{item.remetente.nome}</Text>
        </View>
        <View style={styles.remetenteInfo}>
          <Text style={styles.remetenteLabel}>Perfil</Text>
          <Chip label={item.remetente.tipoPerfil} tone="neutral" size="sm" />
        </View>
        <View style={styles.remetenteInfo}>
          <Text style={styles.remetenteLabel}>Telefone</Text>
          <Text style={styles.remetenteValue}>{item.remetente.telefone}</Text>
        </View>
      </View>

      <Button
        label="Marcar como lida"
        icon="check-circle"
        variant="secondary"
        size="md"
        accessibilityLabel={`Marcar "${item.titulo}" como lida`}
        onPress={() => handleMarkAsRead(item.id)}
        fullWidth
      />
    </View>
  );

  const content = (
    <View style={styles.container}>
      <ScreenHeader
        title="Notificações"
        right={
          <Button
            label="Nova"
            icon="plus"
            size="md"
            accessibilityLabel="Nova notificação"
            onPress={() => navigation.navigate('NotificationCreate')}
          />
        }
      />

      {loading ? (
        <StateView kind="loading" title="Carregando notificações..." style={styles.center} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} colors={[colors.ink]} tintColor={colors.ink} />
          }
          ListEmptyComponent={
            <StateView kind="empty" icon="bell-off" title="Você não tem novas notificações." />
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
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  center: { flex: 1 },
  list: { paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    marginBottom: spacing.lg,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconSlot: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  cardTitleBox: { flex: 1, gap: spacing.xs },
  notifTitle: { ...typography.heading, color: colors.ink },
  dateText: { ...typography.caption, color: colors.slate500 },
  messageText: { ...typography.body, color: colors.ink },
  remetenteContainer: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  remetenteInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  remetenteLabel: { ...typography.captionBold, color: colors.slate700, width: 84 },
  remetenteValue: { ...typography.caption, color: colors.ink, flex: 1 },
});
