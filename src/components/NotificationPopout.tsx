import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationCard from './NotificationCard';
import { Button, Chip, StateView } from './ui';
import { useAppContext } from '../context/AppContext';
import { notificacaoService } from '../services/notificacaoService';
import { destinoNotificacao } from '../utils/notificationRouting';
import { NotificacaoDTO } from '../types';
import { borders, colors, elevation, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Largura máxima do popout em telas largas (web/tablet). */
const LARGURA_MAX = 440;

/**
 * Popout do sino (seção 07 do Design Pattern): só as notificações não lidas, com o mesmo card da central
 * e o botão "Marcar todas como lidas". Tocar numa notificação marca como lida e abre o destino; tocar fora fecha.
 */
export default function NotificationPopout({ visible, onClose }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { currentUser, userRole, showToast, unreadCount, setUnreadCount, refreshUnreadCount } = useAppContext();
  const [itens, setItens] = useState<NotificacaoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);
  const [marcando, setMarcando] = useState(false);

  const usuarioId: number | null = currentUser
    ? (currentUser as any).usuarioDTO?.id || (currentUser as any).usuario?.id || null
    : null;

  const carregar = useCallback(async () => {
    if (!usuarioId) return;
    setLoading(true);
    try {
      setItens(await notificacaoService.listarCentral(usuarioId, { status: 'NAO_LIDAS', pagina: 0 }));
      setErro(false);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
    refreshUnreadCount();
  }, [usuarioId, refreshUnreadCount]);

  useEffect(() => {
    if (visible) carregar();
  }, [visible, carregar]);

  const abrir = async (n: NotificacaoDTO) => {
    setItens((prev) => prev.filter((x) => x.id !== n.id));
    setUnreadCount(Math.max(0, unreadCount - 1));
    notificacaoService.visualizar(n.id).catch(() => {
      showToast('Não foi possível marcar como lida.', 'error');
      refreshUnreadCount();
    });
    const d = destinoNotificacao(userRole, n);
    if (d) {
      onClose();
      navigation.navigate(d.route, d.params);
    }
  };

  const marcarTodas = async () => {
    setMarcando(true);
    try {
      const total = await notificacaoService.marcarTodasLidas();
      setUnreadCount(0);
      setItens([]);
      showToast(total === 1 ? '1 notificação marcada como lida.' : `${total} notificações marcadas como lidas.`, 'success');
    } catch {
      showToast('Não foi possível marcar todas como lidas.', 'error');
    } finally {
      setMarcando(false);
    }
  };

  const verTodas = () => {
    onClose();
    navigation.navigate('NotificationList');
  };

  const topo = Math.max(insets.top, spacing.sm) + spacing.xs + layout.minTouch + spacing.sm;
  const largura = Math.min(width - layout.screenMargin * 2, LARGURA_MAX);
  const total = itens.length || unreadCount;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Área fora do popout: fecha */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar notificações" />
      <View
        style={[styles.popout, { top: topo, width: largura, maxHeight: height - topo - spacing.xxl }]}
        accessibilityViewIsModal
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Não lidas
          </Text>
          {total > 0 && <Chip label={total > 99 ? '99+' : String(total)} tone="danger" size="sm" />}
          <View style={styles.flex} />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Feather name="x" size={22} color={colors.ink} />
          </Pressable>
        </View>

        {itens.length > 0 && (
          <Button label="Marcar todas como lidas" icon="check" variant="secondary" size="md" loading={marcando} onPress={marcarTodas} fullWidth />
        )}

        {loading && !itens.length ? (
          <StateView kind="loading" title="Carregando..." />
        ) : erro ? (
          <StateView kind="error" title="Não foi possível carregar" message="Verifique sua conexão e tente de novo." actionLabel="Tentar de novo" onAction={carregar} />
        ) : (
          <FlatList
            data={itens}
            keyExtractor={(n) => String(n.id)}
            renderItem={({ item }) => (
              <NotificationCard item={item} temDestino={!!destinoNotificacao(userRole, item)} onPress={abrir} />
            )}
            style={styles.list}
            ListEmptyComponent={<StateView kind="empty" icon="bell-off" title="Tudo em dia" message="Você não tem notificações não lidas." />}
          />
        )}

        <Button label="Ver todas as notificações" variant="tertiary" size="md" onPress={verTodas} fullWidth />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay },
  popout: {
    position: 'absolute',
    right: layout.screenMargin,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    padding: layout.cardPadding,
    gap: layout.cardGap,
    ...elevation.overlay,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: colors.ink },
  close: { width: layout.minTouch, height: layout.minTouch, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  closePressed: { backgroundColor: colors.pressedNeutral },
  list: { flexGrow: 0 },
});
