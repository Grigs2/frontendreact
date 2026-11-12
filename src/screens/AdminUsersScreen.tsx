import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AdminLayout from '../components/AdminLayout';
import ChoiceChips from '../components/ChoiceChips';
import Pager from '../components/Pager';
import ReasonDialog from '../components/ReasonDialog';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { adminService } from '../services/adminService';
import { AdminUsuarioResumoDTO, Page } from '../types';
import { PERFIL_LABEL } from '../utils/statusLabels';
import { onlyDigits } from '../utils/masks';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUsers'>;
type Perfil = 'TODOS' | 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA' | 'ADMIN';
type Situacao = 'TODAS' | 'ATIVAS' | 'SUSPENSAS';

/** 10.2 — contas: pesquisa por ID, perfil, e-mail exato e situação; suspender e reativar. */
export default function AdminUsersScreen({ navigation }: Props) {
  const { currentUser, showToast } = useAppContext();
  const meuUsuarioId = (currentUser as any)?.usuarioId;
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('TODOS');
  const [situacao, setSituacao] = useState<Situacao>('TODAS');
  const [page, setPage] = useState<Page<AdminUsuarioResumoDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<{ user: AdminUsuarioResumoDTO; tipo: 'suspender' | 'reativar' } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(
    async (pagina = 0) => {
      setLoading(true);
      try {
        setErro(null);
        setPage(
          await adminService.usuarios({
            id: id ? Number(onlyDigits(id)) : undefined,
            email: email || undefined,
            tipoPerfil: perfil === 'TODOS' ? undefined : perfil,
            suspensa: situacao === 'TODAS' ? undefined : situacao === 'SUSPENSAS',
            pagina,
          }),
        );
      } catch (e) {
        setErro(getApiErrorMessage(e, 'Não foi possível pesquisar contas.'));
      } finally {
        setLoading(false);
      }
    },
    [id, email, perfil, situacao],
  );

  useEffect(() => {
    buscar(0);
    // Pesquisa inicial e ao trocar os filtros de escolha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil, situacao]);

  const executar = async (motivo: string) => {
    if (!acao) return;
    setSalvando(true);
    try {
      if (acao.tipo === 'suspender') await adminService.suspender(acao.user.id, motivo);
      else await adminService.reativar(acao.user.id, motivo);
      showToast(acao.tipo === 'suspender' ? 'Conta suspensa. As sessões dela foram encerradas.' : 'Conta reativada.', 'success');
      setAcao(null);
      buscar(page?.number ?? 0);
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível concluir a ação.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const filtros = (
    <View style={styles.header}>
      <ScreenHeader title="Contas" subtitle="Pesquisa com dados mínimos" />
      <Card style={styles.filters}>
        <View style={styles.row}>
          <TextField label="ID do usuário" value={id} onChangeText={(t) => setId(onlyDigits(t))} keyboardType="number-pad" containerStyle={styles.rowItem} />
          <TextField label="E-mail exato" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" containerStyle={styles.rowItemWide} />
        </View>
        <ChoiceChips
          options={[
            { value: 'TODOS', label: 'Todos' },
            { value: 'MOTORISTA', label: 'Motoristas' },
            { value: 'RESPONSAVEL', label: 'Responsáveis' },
            { value: 'ESCOLA', label: 'Escolas' },
            { value: 'ADMIN', label: 'Admins' },
          ]}
          value={perfil}
          onChange={setPerfil}
          accessibilityLabel="Perfil"
        />
        <ChoiceChips
          options={[
            { value: 'TODAS', label: 'Todas' },
            { value: 'ATIVAS', label: 'Ativas' },
            { value: 'SUSPENSAS', label: 'Suspensas' },
          ]}
          value={situacao}
          onChange={setSituacao}
          accessibilityLabel="Situação da conta"
        />
        <Button label="Pesquisar" icon="search" onPress={() => buscar(0)} loading={loading} fullWidth />
      </Card>
      {page && <Pager page={page.number} totalPages={page.totalPages} totalElements={page.totalElements} loading={loading} onChange={buscar} />}
    </View>
  );

  return (
    <AdminLayout>
      <FlatList
        data={page?.content ?? []}
        keyExtractor={(u) => String(u.id)}
        style={styles.list}
        contentContainerStyle={styles.content}
        ListHeaderComponent={filtros}
        ItemSeparatorComponent={() => <View style={{ height: layout.cardGap }} />}
        ListEmptyComponent={
          loading ? (
            <StateView kind="loading" />
          ) : erro ? (
            <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={() => buscar(0)} />
          ) : (
            <StateView kind="empty" icon="users" title="Nenhuma conta encontrada" />
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                #{item.id} · {PERFIL_LABEL[item.tipoPerfil] ?? item.tipoPerfil}
              </Text>
              <Chip label={item.suspensa ? 'Suspensa' : 'Ativa'} tone={item.suspensa ? 'danger' : 'success'} size="sm" />
            </View>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.emailMascarado}</Text>
            <View style={styles.actions}>
              {item.suspensa ? (
                <Button label="Reativar" icon="unlock" variant="secondary" size="md" onPress={() => setAcao({ user: item, tipo: 'reativar' })} style={styles.flex} />
              ) : (
                <Button
                  label="Suspender"
                  icon="lock"
                  variant="secondary"
                  size="md"
                  onPress={() => setAcao({ user: item, tipo: 'suspender' })}
                  disabled={item.id === meuUsuarioId}
                  style={styles.flex}
                />
              )}
              <Button
                label="Histórico"
                icon="clock"
                variant="tertiary"
                size="md"
                onPress={() => navigation.navigate('AdminAudit', { tipoAlvo: 'USUARIO', alvoId: item.id })}
                style={styles.flex}
              />
            </View>
          </Card>
        )}
      />

      <ReasonDialog
        visible={!!acao}
        title={acao?.tipo === 'suspender' ? 'Suspender conta?' : 'Reativar conta?'}
        message={
          acao?.tipo === 'suspender'
            ? 'A conta não poderá entrar nem renovar a sessão. Viagens em andamento não são alteradas; sessões abertas expiram em até 15 minutos.'
            : 'A conta volta a poder entrar no aplicativo.'
        }
        confirmLabel={acao?.tipo === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
        required={acao?.tipo === 'suspender'}
        maxLength={1000}
        destructive={acao?.tipo === 'suspender'}
        loading={salvando}
        onConfirm={executar}
        onCancel={() => setAcao(null)}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { width: '100%', maxWidth: 1000, alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  filters: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowItem: { flexGrow: 1, flexBasis: 120 },
  rowItemWide: { flexGrow: 2, flexBasis: 220 },
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.label, color: colors.ink },
  body: { ...typography.body, color: colors.slate700 },
  actions: { flexDirection: 'row', gap: layout.buttonGap },
});
