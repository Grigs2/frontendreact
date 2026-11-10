import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { motoristaService } from '../services/motoristaService';
import { periodoLabel } from '../services/viagemService';
import { SolicitacaoDTO } from '../types';
import { Button, Card, Chip, ScreenHeader, SegmentedControl, StateView } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverInvites'>;
type Tab = 'RECEBIDOS' | 'ENVIADOS';

const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

/**
 * Vínculos do motorista: pedidos de vaga feitos por responsáveis (o motorista aceita ou recusa)
 * e convites que o motorista enviou (aguardando o responsável).
 */
export default function DriverInvitesScreen({ navigation }: Props) {
  const { currentUser, showToast } = useAppContext();
  const [tab, setTab] = useState<Tab>('RECEBIDOS');
  const [items, setItems] = useState<SolicitacaoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState<number | null>(null);
  const [pendingAccept, setPendingAccept] = useState<SolicitacaoDTO | null>(null);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      setItems(await motoristaService.listarSolicitacoes(currentUser.id));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível carregar as solicitações.'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const received = items.filter((s) => s.origem === 'RESPONSAVEL');
  const sent = items.filter((s) => s.origem !== 'RESPONSAVEL');
  const data = tab === 'RECEBIDOS' ? received : sent;

  const answer = async (item: SolicitacaoDTO, aceito: boolean, compartilhamentoAutorizado = false) => {
    if (!item.id) return;
    setAnswering(item.id);
    try {
      await motoristaService.responderSolicitacao(item.id, aceito, compartilhamentoAutorizado);
      showToast(aceito ? `${item.dependenteNome || 'Aluno'} entrou na viagem.` : 'Pedido recusado.', aceito ? 'success' : 'info');
      load();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível registrar a resposta.'), 'error');
    } finally {
      setAnswering(null);
    }
  };

  const confirmAccept = async () => {
    if (!pendingAccept) return;
    const item = pendingAccept;
    setPendingAccept(null);
    await answer(item, true, true);
  };

  const renderItem = ({ item }: { item: SolicitacaoDTO }) => {
    const isReceived = item.origem === 'RESPONSAVEL';
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {item.dependenteNome || `Aluno #${item.dependenteId}`}
          </Text>
          <Chip label={isReceived ? 'Pedido de vaga' : 'Aguardando'} tone={isReceived ? 'info' : 'warning'} size="sm" />
        </View>
        <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {item.viagemNome || 'Viagem'} · {periodoLabel(item.viagemPeriodo)}
        </Text>
        <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {isReceived ? `Pedido por ${item.responsavelNome || 'responsável'}` : `Convite enviado a ${item.responsavelNome || 'responsável'}`}
          {item.dataInicio ? ` · ${formatDate(item.dataInicio)}` : ''}
        </Text>
        {isReceived && (
          <View style={styles.actions}>
            <Button
              label="Recusar"
              variant="secondary"
              size="md"
              onPress={() => answer(item, false)}
              disabled={answering !== null}
              style={styles.flex}
              accessibilityLabel={`Recusar pedido de ${item.dependenteNome}`}
            />
            <Button
              label="Aceitar"
              icon="check"
              size="md"
              onPress={() => setPendingAccept(item)}
              loading={answering === item.id}
              disabled={answering !== null}
              style={styles.flex}
              accessibilityLabel={`Aceitar pedido de ${item.dependenteNome}`}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <DriverLayout>
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
              <ScreenHeader title="Vínculos" subtitle="Pedidos de vaga e convites para suas viagens" />
              <Button label="Buscar alunos" icon="search" variant="secondary" onPress={() => navigation.navigate('DriverSearchStudents')} fullWidth />
              <SegmentedControl
                options={[
                  { value: 'RECEBIDOS', label: `Pedidos (${received.length})` },
                  { value: 'ENVIADOS', label: `Enviados (${sent.length})` },
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
              <StateView
                kind="empty"
                icon={tab === 'RECEBIDOS' ? 'inbox' : 'send'}
                title={tab === 'RECEBIDOS' ? 'Nenhum pedido de vaga.' : 'Nenhum convite aguardando.'}
                message={
                  tab === 'RECEBIDOS'
                    ? 'Quando um responsável pedir vaga em uma das suas viagens, ele aparece aqui.'
                    : 'Use Buscar alunos para convidar alunos para suas viagens.'
                }
              />
            )
          }
        />
        <ConfirmDialog
          visible={!!pendingAccept}
          title="Aceitar pedido?"
          message="Ao aceitar, os dados completos do aluno e do responsável serão compartilhados com você e o acordo de transporte será fechado."
          confirmLabel="Aceitar"
          destructive={false}
          loading={answering !== null}
          onConfirm={confirmAccept}
          onCancel={() => setPendingAccept(null)}
        />
      </View>
    </DriverLayout>
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
});
