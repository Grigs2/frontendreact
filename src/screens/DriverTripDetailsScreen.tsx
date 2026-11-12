import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { escolasNomes, periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { MotoristaDTO, ViagemDTO } from '../types';
import { todayIso } from '../utils/format';
import { Notice } from '../components/Feedback';
import DriverLayout from '../components/DriverLayout';

import ConfirmDialog from '../components/ConfirmDialog';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverTripDetails'>;

export default function DriverTripDetailsScreen({ route, navigation }: Props) {
  const { viagemId } = route.params;
  const { currentUser, showToast } = useAppContext();
  const capacidade = (currentUser as MotoristaDTO)?.veiculoDTO?.capacidade ?? 0;
  const [viagem, setViagem] = useState<ViagemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
  const [nomeEdit, setNomeEdit] = useState('');
  const [savingNome, setSavingNome] = useState(false);

  const loadViagem = useCallback(async () => {
    setLoading(true);
    try {
      const data = await viagemService.visualizar(viagemId);
      setViagem(data);
      setNomeEdit(data?.nome ?? '');
    } catch (error) {
      console.error('Error loading trip details:', error);
      showToast('Não foi possível carregar os detalhes da viagem.', 'error');
    } finally {
      setLoading(false);
    }
  }, [viagemId, showToast]);

  const handleSalvarNome = async () => {
    setSavingNome(true);
    try {
      const atualizada = await viagemService.atualizarNome(viagemId, nomeEdit);
      setViagem((atual) => (atual ? { ...atual, nome: atualizada.nome } : atualizada));
      setNomeEdit(atualizada.nome ?? '');
      showToast('Nome da viagem atualizado.', 'success');
    } catch (error) {
      console.error('Error renaming trip:', error);
      showToast('Não foi possível alterar o nome da viagem.', 'error');
    } finally {
      setSavingNome(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadViagem();
    }, [loadViagem])
  );

  // A viagem do dia é preparada e revisada antes de iniciar (5.5): abre a tela da execução de hoje.
  const handleIniciarViagem = () => {
    navigation.navigate('DriverTripDay', { viagemId, data: todayIso() });
  };

  const handleDesativarViagem = async () => {
    setLoading(true);
    try {
      await viagemService.desativarViagem(viagemId);
      showToast('Viagem desativada com sucesso!', 'success');
      setShowConfirmDeactivate(false);
      navigation.navigate('DriverTrips');
    } catch (error) {
      console.error('Error deactivating trip:', error);
      showToast('Não foi possível desativar a viagem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !viagem) {
    return (
      <DriverLayout>
        <StateView kind="loading" title="Carregando viagem..." style={styles.loading} />
      </DriverLayout>
    );
  }

  if (!viagem) return null;

  return (
    <DriverLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Detalhes da Viagem" onBack={() => navigation.goBack()} />

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{viagemNome(viagem)}</Text>
            <Chip label={viagem.ativo === false ? 'Encerrada' : 'Ativa'} tone={viagem.ativo === false ? 'neutral' : 'success'} />
          </View>
          <Text style={styles.cardSubtitle}>
            {periodoLabel(viagem.periodo)} · {viagem.dependentes?.length || 0} de {capacidade || '?'} lugares ocupados
          </Text>
          {!!escolasNomes(viagem) && (
            <Text style={styles.cardSubtitle}>Escolas: {escolasNomes(viagem)}</Text>
          )}
          <TextField
            label="Nome da viagem"
            value={nomeEdit}
            onChangeText={setNomeEdit}
            placeholder={viagemNome({ ...viagem, nome: null })}
            maxLength={200}
          />
          <Text style={styles.cardSubtitle}>Deixe em branco para voltar ao nome padrão.</Text>
          <Button label="Salvar nome" variant="secondary" onPress={handleSalvarNome} loading={savingNome} disabled={nomeEdit.trim() === (viagem.nome ?? '')} fullWidth />
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dependentes ({viagem.dependentes?.length || 0})</Text>
            <Button
              label="Adicionar"
              icon="plus"
              variant="tertiary"
              size="md"
              accessibilityLabel="Adicionar dependente"
              onPress={() => navigation.navigate('DriverAvailableDependents', { viagemId })}
              disabled={!!capacidade && (viagem.dependentes?.length || 0) >= capacidade}
            />
          </View>
          {!!capacidade && (viagem.dependentes?.length || 0) >= capacidade && (
            <Notice tone="warning">Veículo lotado. Não é possível adicionar mais alunos nesta viagem.</Notice>
          )}

          {viagem.dependentes && viagem.dependentes.length > 0 ? (
            viagem.dependentes.map((dep) => (
              <View key={dep.id} style={styles.depCard}>
                <View style={styles.depInfo}>
                  <Text style={styles.depName}>{dep.nome}</Text>
                  <Text style={styles.depDetail}>{dep.escola?.nome || 'Sem escola vinculada'}</Text>
                </View>
              </View>
            ))
          ) : (
            <StateView kind="empty" icon="users" title="Nenhum dependente vinculado." />
          )}
        </View>

        <View style={styles.actions}>
          <Button label="Preparar viagem de hoje" icon="play" onPress={handleIniciarViagem} disabled={loading || viagem.ativo === false} fullWidth />
          <Button
            label="Desativar Viagem"
            icon="trash-2"
            variant="destructive"
            onPress={() => setShowConfirmDeactivate(true)}
            disabled={loading}
            fullWidth
          />
        </View>

        <ConfirmDialog
          visible={showConfirmDeactivate}
          title="Desativar Viagem"
          message="Tem certeza que deseja desativar esta viagem permanentemente? Esta ação não pode ser desfeita."
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          onConfirm={handleDesativarViagem}
          onCancel={() => setShowConfirmDeactivate(false)}
          destructive={true}
          loading={loading}
        />
      </ScrollView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 800, alignSelf: 'center' },
  loading: { flex: 1 },
  card: { marginBottom: spacing.xxl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  cardTitle: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  cardSubtitle: { ...typography.caption, color: colors.slate500 },
  section: { marginBottom: spacing.xxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  depCard: {
    backgroundColor: colors.surface,
    padding: layout.cardPadding,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  depInfo: { flex: 1, gap: spacing.xs },
  depName: { ...typography.label, fontSize: 18, lineHeight: 22, color: colors.ink },
  depDetail: { ...typography.caption, color: colors.slate500 },
  actions: { gap: layout.buttonGap },
});
