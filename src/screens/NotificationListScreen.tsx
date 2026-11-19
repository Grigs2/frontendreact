import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { notificacaoService, TAMANHO_PAGINA_NOTIFICACOES } from '../services/notificacaoService';
import { GrupoNotificacao, NotificacaoDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import SchoolLayout from '../components/SchoolLayout';
import { Button, ScreenHeader, SegmentedControl, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';
import { destinoNotificacao } from '../utils/notificationRouting';
import NotificationCard from '../components/NotificationCard';

type Aba = 'NAO_LIDAS' | 'TODAS';

const GRUPOS: { value: GrupoNotificacao | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Tudo' },
  { value: 'VIAGEM', label: 'Viagem' },
  { value: 'ALERTA', label: 'Alertas' },
  { value: 'SOLICITACAO', label: 'Vínculos' },
  { value: 'AVISO', label: 'Avisos' },
];

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Hoje", "Ontem" ou "seg., 2 de nov." */
export function rotuloDoDia(iso: string, agora = new Date()): string {
  const dia = inicioDoDia(new Date(iso));
  const hoje = inicioDoDia(agora);
  if (dia === hoje) return 'Hoje';
  if (dia === hoje - 86400000) return 'Ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function NotificationListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { currentUser, userRole, showToast, unreadCount, setUnreadCount, refreshUnreadCount } = useAppContext();
  const [aba, setAba] = useState<Aba>('NAO_LIDAS');
  const [grupo, setGrupo] = useState<GrupoNotificacao | 'TODOS'>('TODOS');
  const [notifications, setNotifications] = useState<NotificacaoDTO[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMais, setLoadingMais] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const usuarioId: number | null = currentUser
    ? (currentUser as any).usuarioDTO?.id || (currentUser as any).usuario?.id || null
    : null;

  const carregar = useCallback(
    async (paginaAlvo: number, modo: 'inicial' | 'refresh' | 'mais') => {
      if (!usuarioId) {
        setLoading(false);
        return;
      }
      if (modo === 'inicial') setLoading(true);
      if (modo === 'mais') setLoadingMais(true);
      try {
        const data = await notificacaoService.listarCentral(usuarioId, {
          status: aba,
          grupo: grupo === 'TODOS' ? undefined : grupo,
          pagina: paginaAlvo,
        });
        setNotifications((prev) => (paginaAlvo === 0 ? data : [...prev, ...data]));
        setPagina(paginaAlvo);
        setTemMais(data.length >= TAMANHO_PAGINA_NOTIFICACOES);
        setErro(false);
      } catch (error) {
        console.error('Error loading notifications:', error);
        if (paginaAlvo === 0) setErro(true);
        else showToast('Não foi possível carregar mais notificações.', 'error');
      } finally {
        setLoading(false);
        setLoadingMais(false);
        setRefreshing(false);
      }
      refreshUnreadCount();
    },
    [usuarioId, aba, grupo, showToast, refreshUnreadCount],
  );

  useEffect(() => {
    if (isFocused) carregar(0, 'inicial');
  }, [isFocused, carregar]);

  /** Para onde levar o usuário ao tocar no aviso. */
  const destino = (n: NotificacaoDTO): (() => void) | null => {
    const d = destinoNotificacao(userRole, n);
    return d ? () => (navigation as any).navigate(d.route, d.params) : null;
  };

  const marcarLida = async (n: NotificacaoDTO) => {
    if (n.visto) return;
    // Atualização otimista: a lista e o contador mudam na hora.
    setNotifications((prev) =>
      aba === 'NAO_LIDAS' ? prev.filter((x) => x.id !== n.id) : prev.map((x) => (x.id === n.id ? { ...x, visto: true } : x)),
    );
    setUnreadCount(Math.max(0, unreadCount - 1));
    try {
      await notificacaoService.visualizar(n.id);
    } catch {
      showToast('Não foi possível marcar como lida.', 'error');
      carregar(0, 'refresh');
    }
  };

  const abrir = (n: NotificacaoDTO) => {
    marcarLida(n);
    destino(n)?.();
  };

  const marcarTodas = async () => {
    setMarcandoTodas(true);
    try {
      const total = await notificacaoService.marcarTodasLidas();
      setUnreadCount(0);
      setNotifications((prev) => (aba === 'NAO_LIDAS' ? [] : prev.map((x) => ({ ...x, visto: true }))));
      showToast(total === 1 ? '1 notificação marcada como lida.' : `${total} notificações marcadas como lidas.`, 'success');
    } catch {
      showToast('Não foi possível marcar todas como lidas.', 'error');
    } finally {
      setMarcandoTodas(false);
    }
  };

  const secoes = useMemo(() => {
    const mapa = new Map<string, NotificacaoDTO[]>();
    notifications.forEach((n) => {
      const chave = rotuloDoDia(n.dataCriacao);
      mapa.set(chave, [...(mapa.get(chave) ?? []), n]);
    });
    return Array.from(mapa, ([title, data]) => ({ title, data }));
  }, [notifications]);

  const renderItem = ({ item }: { item: NotificacaoDTO }) => (
    <NotificationCard item={item} temDestino={!!destino(item)} onPress={abrir} />
  );

  const vazio =
    aba === 'NAO_LIDAS'
      ? { title: 'Tudo em dia', message: 'Você não tem notificações não lidas.' }
      : { title: 'Nenhuma notificação', message: 'Os avisos das viagens e dos vínculos aparecem aqui.' };

  const content = (
    <View style={styles.container}>
      <ScreenHeader
        title="Notificações"
        right={
          userRole === 'ESCOLA' ? (
            <Button
              label="Nova"
              icon="plus"
              size="md"
              accessibilityLabel="Nova notificação"
              onPress={() => navigation.navigate('NotificationCreate')}
            />
          ) : undefined
        }
      />

      <SegmentedControl<Aba>
        options={[
          { value: 'NAO_LIDAS', label: unreadCount > 0 ? `Não lidas (${unreadCount})` : 'Não lidas' },
          { value: 'TODAS', label: 'Todas' },
        ]}
        value={aba}
        onChange={setAba}
        style={styles.segment}
      />

      {/* Filtros em linhas que quebram (sem rolagem horizontal), para nenhum botão ficar cortado na borda. */}
      <View style={styles.filtros} accessibilityRole="radiogroup" accessibilityLabel="Filtrar notificações">
        {GRUPOS.map((g) => {
          const ativo = grupo === g.value;
          return (
            <Pressable
              key={g.value}
              onPress={() => setGrupo(g.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`Filtrar: ${g.label}`}
              style={[styles.filtro, ativo && styles.filtroAtivo]}
            >
              <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {unreadCount > 0 && (
        <View style={styles.acoes}>
          <Button
            label="Marcar todas como lidas"
            icon="check-circle"
            variant="tertiary"
            size="md"
            loading={marcandoTodas}
            onPress={marcarTodas}
          />
        </View>
      )}

      {loading ? (
        <StateView kind="loading" title="Carregando notificações..." style={styles.center} />
      ) : erro ? (
        <StateView
          kind="error"
          title="Não foi possível carregar as notificações"
          message="Verifique sua conexão e tente de novo."
          actionLabel="Tentar de novo"
          onAction={() => carregar(0, 'inicial')}
          style={styles.center}
        />
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.secao} accessibilityRole="header">
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (temMais && !loadingMais) carregar(pagina + 1, 'mais');
          }}
          ListFooterComponent={
            temMais ? (
              <Button
                label={loadingMais ? 'Carregando...' : 'Carregar mais'}
                variant="secondary"
                size="md"
                loading={loadingMais}
                onPress={() => carregar(pagina + 1, 'mais')}
                fullWidth
              />
            ) : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                carregar(0, 'refresh');
              }}
              colors={[colors.ink]}
              tintColor={colors.ink}
            />
          }
          ListEmptyComponent={<StateView kind="empty" icon="bell-off" title={vazio.title} message={vazio.message} />}
        />
      )}
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
  segment: { marginBottom: spacing.md },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  filtro: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtroAtivo: { backgroundColor: colors.ink, borderColor: colors.ink },
  filtroTexto: { ...typography.caption, color: colors.slate700 },
  filtroTextoAtivo: { ...typography.captionBold, color: colors.surface },
  acoes: { alignItems: 'flex-end', marginBottom: spacing.xs },
  list: { paddingBottom: spacing.xl, gap: spacing.sm },
  secao: { ...typography.captionBold, color: colors.slate500, marginTop: spacing.md, marginBottom: spacing.sm },
});
