import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import GuardianLayout from '../components/GuardianLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel } from '../services/viagemService';
import { ResponsavelDTO, SolicitacaoDTO } from '../types';
import { Button, Card, Chip, ScreenHeader, SegmentedControl, StateView } from '../components/ui';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Tab = 'CONVITES' | 'PEDIDOS' | 'ATIVOS';

const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

/**
 * Vínculos do responsável:
 * - Convites: o motorista convidou o aluno (o responsável aceita ou recusa);
 * - Pedidos: o responsável pediu vaga (aguardando o motorista);
 * - Ativos: transporte em andamento, com opção de encerrar.
 */
export default function GuardianInvitesScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, pendingSolicitations, updateSolicitations, showToast } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;

  const [tab, setTab] = useState<Tab>('CONVITES');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [unlinkId, setUnlinkId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!guardian?.id) return;
    setLoading(true);
    try {
      updateSolicitations(await responsavelService.listarSolicitacoes(guardian.id));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível carregar os vínculos.'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardian?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const convites = pendingSolicitations.filter((s) => !s.respondido && s.origem !== 'RESPONSAVEL');
  const pedidos = pendingSolicitations.filter((s) => !s.respondido && s.origem === 'RESPONSAVEL');
  const ativos = pendingSolicitations.filter((s) => s.aceito && !s.dataFim);
  const data = tab === 'CONVITES' ? convites : tab === 'PEDIDOS' ? pedidos : ativos;

  const alunoNome = (s: SolicitacaoDTO) =>
    s.dependenteNome || guardian?.dependentes?.find((d) => d.id === s.dependenteId)?.nome || `Aluno #${s.dependenteId}`;

  const respond = async (item: SolicitacaoDTO, aceito: boolean) => {
    if (!item.id) return;
    setBusyId(item.id);
    try {
      await responsavelService.responderSolicitacao(item.id, aceito);
      showToast(aceito ? `${alunoNome(item)} entrou na viagem.` : 'Convite recusado.', aceito ? 'success' : 'info');
      load();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível registrar a resposta.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const unlink = async () => {
    if (unlinkId === null) return;
    setBusyId(unlinkId);
    try {
      await responsavelService.encerrarVinculo(unlinkId);
      showToast('Transporte encerrado.', 'success');
      setUnlinkId(null);
      load();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível encerrar o vínculo.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: SolicitacaoDTO }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{alunoNome(item)}</Text>
        {tab === 'CONVITES' && <Chip label="Convite" tone="info" size="sm" />}
        {tab === 'PEDIDOS' && <Chip label="Aguardando motorista" tone="warning" size="sm" />}
        {tab === 'ATIVOS' && <Chip label="Ativo" tone="success" size="sm" />}
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {item.viagemNome || 'Viagem'} · {periodoLabel(item.viagemPeriodo || item.periodo)}
      </Text>
      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Motorista: {item.motoristaNome || 'não informado'}
        {item.dataInicio ? ` · desde ${formatDate(item.dataInicio)}` : ''}
      </Text>
      {tab === 'CONVITES' && (
        <View style={styles.actions}>
          <Button label="Recusar" variant="secondary" size="md" onPress={() => respond(item, false)} disabled={busyId !== null} style={styles.flex} />
          <Button label="Aceitar" icon="check" size="md" onPress={() => respond(item, true)} loading={busyId === item.id} disabled={busyId !== null} style={styles.flex} />
        </View>
      )}
      {tab === 'ATIVOS' && (
        <Button
          label="Encerrar transporte"
          icon="user-x"
          variant="tertiary"
          size="md"
          onPress={() => setUnlinkId(item.id!)}
          disabled={busyId !== null}
          fullWidth
        />
      )}
    </Card>
  );

  const empty: Record<Tab, { title: string; message: string; icon: 'mail' | 'send' | 'link' }> = {
    CONVITES: { title: 'Nenhum convite pendente.', message: 'Quando um motorista convidar seu aluno, o convite aparece aqui.', icon: 'mail' },
    PEDIDOS: { title: 'Nenhum pedido aguardando.', message: 'Peça vaga para seu aluno na aba Motoristas.', icon: 'send' },
    ATIVOS: { title: 'Nenhum transporte ativo.', message: 'Aceite um convite ou peça vaga a um motorista.', icon: 'link' },
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenHeader title="Vínculos" subtitle="Convites, pedidos de vaga e transportes ativos" />
              <SegmentedControl
                options={[
                  { value: 'CONVITES', label: `Convites (${convites.length})` },
                  { value: 'PEDIDOS', label: `Pedidos (${pedidos.length})` },
                  { value: 'ATIVOS', label: `Ativos (${ativos.length})` },
                ]}
                value={tab}
                onChange={(v) => setTab(v as Tab)}
              />
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <StateView kind="loading" title="Carregando..." />
            ) : (
              <View style={styles.emptyBlock}>
                <StateView kind="empty" icon={empty[tab].icon} title={empty[tab].title} message={empty[tab].message} />
                {tab === 'PEDIDOS' && (
                  <Button label="Procurar motoristas" icon="search" variant="secondary" onPress={() => navigation.navigate('GuardianSearchDriver')} fullWidth />
                )}
              </View>
            )
          }
        />

        <ConfirmDialog
          visible={unlinkId !== null}
          title="Encerrar transporte"
          message="O aluno sai desta viagem. Para voltar, será preciso um novo convite ou pedido de vaga."
          confirmLabel="Encerrar"
          cancelLabel="Cancelar"
          onConfirm={unlink}
          onCancel={() => setUnlinkId(null)}
          destructive
          loading={busyId !== null}
        />
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink, flexShrink: 1 },
  body: { ...typography.body, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  actions: { flexDirection: 'row', gap: layout.buttonGap, marginTop: spacing.sm },
  emptyBlock: { gap: spacing.lg },
});
