import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AdminLayout from '../components/AdminLayout';
import ChoiceChips from '../components/ChoiceChips';
import Pager from '../components/Pager';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { adminService } from '../services/adminService';
import { AdminAuditoriaDTO, Page } from '../types';
import { formatDateTime } from '../utils/format';
import { maskDate, onlyDigits } from '../utils/masks';
import { parseBrDate } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAudit'>;

const ALVOS = [
  { value: '', label: 'Todos' },
  { value: 'USUARIO', label: 'Contas' },
  { value: 'DOCUMENTO_MOTORISTA', label: 'Documentos' },
  { value: 'DEPENDENTE', label: 'Alunos' },
  { value: 'ESCOLA', label: 'Escolas' },
  { value: 'VINCULO_ESCOLA', label: 'Vínculos escola' },
  { value: 'VINCULO_RESPONSAVEL', label: 'Vínculos responsável' },
];

const humanize = (v: string) => {
  const t = v.toLowerCase().replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** 10.5 — auditoria: filtros por ator, ação, entidade, alvo e período; histórico preservado pelo backend (1 ano). */
export default function AdminAuditScreen({ navigation, route }: Props) {
  const [atorId, setAtorId] = useState('');
  const [acao, setAcao] = useState('');
  const [tipoAlvo, setTipoAlvo] = useState(route.params?.tipoAlvo ?? '');
  const [alvoId, setAlvoId] = useState(route.params?.alvoId ? String(route.params.alvoId) : '');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [page, setPage] = useState<Page<AdminAuditoriaDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(
    async (pagina = 0) => {
      const di = inicio ? parseBrDate(inicio) : null;
      const df = fim ? parseBrDate(fim) : null;
      if ((inicio && !di) || (fim && !df)) {
        setErro('Use datas no formato DD/MM/AAAA.');
        return;
      }
      if (df) df.setHours(23, 59, 59, 999);
      setLoading(true);
      try {
        setErro(null);
        setPage(
          await adminService.auditoria({
            atorId: atorId ? Number(atorId) : undefined,
            acao: acao || undefined,
            tipoAlvo: tipoAlvo || undefined,
            alvoId: alvoId ? Number(alvoId) : undefined,
            inicio: di ?? undefined,
            fim: df ?? undefined,
            pagina,
          }),
        );
      } catch (e) {
        setErro(getApiErrorMessage(e, 'Não foi possível consultar a auditoria.'));
      } finally {
        setLoading(false);
      }
    },
    [atorId, acao, tipoAlvo, alvoId, inicio, fim],
  );

  useEffect(() => {
    buscar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoAlvo]);

  return (
    <AdminLayout>
      <FlatList
        data={page?.content ?? []}
        keyExtractor={(a) => String(a.id)}
        style={styles.list}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: layout.cardGap }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Auditoria" subtitle="Acessos e alterações administrativas" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
            <Card style={styles.filters}>
              <ChoiceChips options={ALVOS} value={tipoAlvo} onChange={setTipoAlvo} accessibilityLabel="Entidade" />
              <View style={styles.row}>
                <TextField label="ID do ator" value={atorId} onChangeText={(t) => setAtorId(onlyDigits(t))} keyboardType="number-pad" containerStyle={styles.rowItem} />
                <TextField label="ID do alvo" value={alvoId} onChangeText={(t) => setAlvoId(onlyDigits(t))} keyboardType="number-pad" containerStyle={styles.rowItem} />
              </View>
              <TextField label="Ação" value={acao} onChangeText={(t) => setAcao(t.toUpperCase().replace(/\s+/g, '_'))} placeholder="Ex.: USUARIO_SUSPENSO" autoCapitalize="characters" />
              <View style={styles.row}>
                <TextField label="De" value={inicio} onChangeText={(t) => setInicio(maskDate(t))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} containerStyle={styles.rowItem} />
                <TextField label="Até" value={fim} onChangeText={(t) => setFim(maskDate(t))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} containerStyle={styles.rowItem} />
              </View>
              <Button label="Filtrar" icon="filter" onPress={() => buscar(0)} loading={loading} fullWidth />
            </Card>
            {page && <Pager page={page.number} totalPages={page.totalPages} totalElements={page.totalElements} loading={loading} onChange={buscar} />}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <StateView kind="loading" />
          ) : erro ? (
            <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={() => buscar(0)} />
          ) : (
            <StateView kind="empty" icon="shield" title="Nenhum registro encontrado" />
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{humanize(item.acao)}</Text>
              <Chip label={humanize(item.resultado || '—')} tone={item.resultado === 'SUCESSO' ? 'success' : 'neutral'} size="sm" />
            </View>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {humanize(item.tipoAlvo)}
              {item.alvoId ? ` #${item.alvoId}` : ''} · por usuário #{item.atorUsuarioId}
            </Text>
            {!!item.motivo && <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>Motivo: {item.motivo}</Text>}
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{formatDateTime(item.ocorridoEm)}</Text>
          </Card>
        )}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 1000, alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  filters: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowItem: { flexGrow: 1, flexBasis: 140 },
  card: { gap: spacing.xs },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.label, color: colors.ink, flex: 1 },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
});
