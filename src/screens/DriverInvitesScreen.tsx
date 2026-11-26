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
import CounterpartModal from '../components/CounterpartModal';
import { getApiErrorMessage } from '../utils/apiError';
import { statusInfo } from '../utils/statusLabels';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverInvites'>;
type Tab = 'RECEBIDOS' | 'ENVIADOS' | 'ATIVOS' | 'ENCERRADOS';

const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

const VAZIO: Record<Tab, { title: string; message: string; icon: 'inbox' | 'send' | 'link' }> = {
  RECEBIDOS: { title: 'Nenhum pedido de vaga.', message: 'Quando um responsável pedir vaga em uma das suas viagens, ele aparece aqui.', icon: 'inbox' },
  ENVIADOS: { title: 'Nenhum convite aguardando.', message: 'Use Buscar alunos para convidar alunos para suas viagens.', icon: 'send' },
  ATIVOS: { title: 'Nenhum aluno ativo.', message: 'Alunos com convite ou pedido aceito aparecem aqui.', icon: 'link' },
  ENCERRADOS: { title: 'Nada encerrado.', message: 'Pedidos e convites recusados ou expirados e transportes encerrados aparecem aqui.', icon: 'link' },
};

/**
 * Vínculos do motorista (mesmo padrão da tela do responsável):
 * - Pedidos: pedidos de vaga feitos por responsáveis (o motorista aceita ou recusa);
 * - Enviados: convites do motorista aguardando o responsável;
 * - Ativos: alunos que estão nas viagens do motorista;
 * - Encerrados: pedidos e convites recusados ou expirados e transportes encerrados.
 */
export default function DriverInvitesScreen({ navigation }: Props) {
  const { currentUser, showToast } = useAppContext();
  const [tab, setTab] = useState<Tab>('RECEBIDOS');
  const [items, setItems] = useState<SolicitacaoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState<number | null>(null);
  const [pendingAccept, setPendingAccept] = useState<SolicitacaoDTO | null>(null);
  // Pop-up só para ver os dados do responsável (convites enviados).
  const [verResponsavel, setVerResponsavel] = useState<SolicitacaoDTO | null>(null);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      setItems(await motoristaService.listarVinculos(currentUser.id));
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

  const aberta = (s: SolicitacaoDTO) => !s.respondido && s.status !== 'EXPIRADA';
  const received = items.filter((s) => aberta(s) && s.origem === 'RESPONSAVEL');
  const sent = items.filter((s) => aberta(s) && s.origem !== 'RESPONSAVEL');
  const ativos = items.filter((s) => s.aceito && !s.dataFim);
  const encerrados = items.filter((s) => (s.respondido && !s.aceito) || s.status === 'EXPIRADA' || (s.aceito && !!s.dataFim));
  const data = { RECEBIDOS: received, ENVIADOS: sent, ATIVOS: ativos, ENCERRADOS: encerrados }[tab];

  const chip = (item: SolicitacaoDTO) => {
    if (tab === 'RECEBIDOS') return <Chip label="Pedido de vaga" tone="info" size="sm" />;
    if (tab === 'ENVIADOS') return <Chip label="Aguardando" tone="warning" size="sm" />;
    if (tab === 'ATIVOS') return <Chip label="Ativo" tone="success" size="sm" />;
    const info = item.aceito && item.dataFim ? { label: 'Encerrado', tone: 'neutral' as const } : statusInfo('solicitacao', item.status ?? (item.aceito ? 'ACEITA' : 'RECUSADA'));
    return <Chip label={info.label} tone={info.tone} size="sm" />;
  };

  const legenda = (item: SolicitacaoDTO) => {
    const nome = item.responsavelNome || 'responsável';
    if (tab === 'RECEBIDOS') return `Pedido por ${nome}${item.dataInicio ? ` · ${formatDate(item.dataInicio)}` : ''}`;
    if (tab === 'ENVIADOS') return `Convite enviado a ${nome}${item.dataInicio ? ` · ${formatDate(item.dataInicio)}` : ''}`;
    if (tab === 'ATIVOS') return `Responsável: ${nome}${item.dataInicio ? ` · desde ${formatDate(item.dataInicio)}` : ''}`;
    return `Responsável: ${nome}${item.dataFim ? ` · até ${formatDate(item.dataFim)}` : ''}`;
  };

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
    const isReceived = tab === 'RECEBIDOS';
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {item.dependenteNome || `Aluno #${item.dependenteId}`}
          </Text>
          {chip(item)}
        </View>
        <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {item.viagemNome || 'Viagem'} · {periodoLabel(item.viagemPeriodo)}
        </Text>
        <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {legenda(item)}
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
              label="Ver e aceitar"
              icon="user-check"
              size="md"
              onPress={() => setPendingAccept(item)}
              loading={answering === item.id}
              disabled={answering !== null}
              style={styles.flex}
              accessibilityLabel={`Ver dados do responsável e aceitar o pedido de ${item.dependenteNome}`}
            />
          </View>
        )}
        {!isReceived && (
          <Button
            label="Ver dados do responsável"
            icon="user"
            variant="tertiary"
            size="md"
            onPress={() => setVerResponsavel(item)}
            fullWidth
          />
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
              <ScreenHeader title="Vínculos" subtitle="Pedidos de vaga, convites e alunos das suas viagens" />
              <Button label="Buscar alunos" icon="search" variant="secondary" onPress={() => navigation.navigate('DriverSearchStudents')} fullWidth />
              <SegmentedControl
                options={[
                  { value: 'RECEBIDOS', label: `Pedidos (${received.length})` },
                  { value: 'ENVIADOS', label: `Enviados (${sent.length})` },
                  { value: 'ATIVOS', label: `Ativos (${ativos.length})` },
                  { value: 'ENCERRADOS', label: 'Encerrados' },
                ]}
                value={tab}
                onChange={(v) => setTab(v as Tab)}
                grade
              />
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <StateView kind="loading" title="Carregando..." />
            ) : (
              <StateView kind="empty" icon={VAZIO[tab].icon} title={VAZIO[tab].title} message={VAZIO[tab].message} />
            )
          }
        />
        {/* Antes de aceitar, o motorista vê os dados do responsável e do aluno (telefone completo; CPF e e-mail mascarados). */}
        <CounterpartModal
          solicitacao={pendingAccept ?? verResponsavel}
          viewer="MOTORISTA"
          canAnswer={!!pendingAccept}
          loading={answering !== null}
          onAccept={() => confirmAccept()}
          onRefuse={(s) => {
            setPendingAccept(null);
            answer(s, false);
          }}
          onClose={() => {
            setPendingAccept(null);
            setVerResponsavel(null);
          }}
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
