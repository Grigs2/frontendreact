import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import { useAppContext } from '../context/AppContext';
import { notificacaoService } from '../services/notificacaoService';
import { NotificacaoDTO } from '../types';
import { Chip, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

export default function NoticeBoardScreen() {
  const isFocused = useIsFocused();
  const { currentUser, notifications, updateNotifications } = useAppContext();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFocused && currentUser?.id) {
      loadNotifications();
    }
  }, [isFocused]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificacaoService.listar(currentUser!.id!);
      updateNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) =>
    new Date(b.dataCriacao || 0).getTime() - new Date(a.dataCriacao || 0).getTime()
  );

  const content = (
    <View style={styles.container}>
      <ScreenHeader title="Mural de Avisos" />

      {loading && <StateView kind="loading" style={styles.loading} />}

      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <StateView kind="empty" icon="bell-off" title="Nenhum aviso no momento." />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.visto && styles.unreadCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.senderContainer}>
                <View style={styles.iconSlot}>
                  <Feather name="bell" size={20} color={colors.ink} />
                </View>
                <Text style={styles.senderText}>{item.titulo}</Text>
              </View>
              {!item.visto && <Chip label="Novo" tone="warning" size="sm" />}
            </View>
            <Text style={styles.contentTxt}>{item.mensagem}</Text>
            <Text style={styles.dateText}>
              {item.dataCriacao ? new Date(item.dataCriacao).toLocaleString() : 'N/A'}
            </Text>
          </View>
        )}
      />
    </View>
  );

  const role = (currentUser as any)?.usuarioDTO?.tipoPerfil || (currentUser as any)?.usuario?.tipoPerfil || (currentUser as any)?.tipoPerfil;

  if (role === 'MOTORISTA') {
    return <DriverLayout>{content}</DriverLayout>;
  }

  return <GuardianLayout>{content}</GuardianLayout>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  loading: { paddingVertical: spacing.md },
  listContent: { paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border, gap: spacing.md },
  unreadCard: { borderColor: colors.primaryPressed, borderWidth: borders.alert },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  senderContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  iconSlot: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  senderText: { ...typography.label, fontSize: 18, lineHeight: 22, color: colors.ink, flexShrink: 1 },
  dateText: { ...typography.caption, color: colors.slate500 },
  contentTxt: { ...typography.body, color: colors.ink },
});
