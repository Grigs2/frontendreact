import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { viagemService, periodoLabel } from '../services/viagemService';
import { DependenteAnonimoDTO } from '../types';
import { Button, Card, Chip, StateView } from './ui';
import ConfirmDialog from './ConfirmDialog';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  viagemId: number;
  /** Texto exibido quando não há alunos (ex.: nome da escola da viagem). */
  escolaNome?: string | null;
  header?: React.ReactElement;
}

/**
 * Alunos que o motorista pode convidar para a viagem (mesma escola da viagem, ainda fora dela).
 * Os dados são anonimizados (iniciais e idade); o convite vai para o responsável, que aceita ou recusa
 * e só então os dados completos são compartilhados.
 */
export default function StudentInviteList({ viagemId, escolaNome, header }: Props) {
  const { showToast } = useAppContext();
  const [students, setStudents] = useState<DependenteAnonimoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [invited, setInvited] = useState<number[]>([]);
  const [pendingInvite, setPendingInvite] = useState<DependenteAnonimoDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStudents(await viagemService.listarDependentesDisponiveis(viagemId));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível carregar os alunos.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [viagemId, showToast]);

  useEffect(() => {
    setInvited([]);
    load();
  }, [load]);

  const confirmInvite = async () => {
    const aluno = pendingInvite;
    if (!aluno) return;
    setSendingId(aluno.id);
    try {
      await viagemService.solicitarDependente(viagemId, aluno.id);
      setInvited((ids) => [...ids, aluno.id]);
      showToast(`Convite enviado ao responsável de ${aluno.iniciais}.`, 'success');
      setPendingInvite(null);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível enviar o convite.'), 'error');
    } finally {
      setSendingId(null);
    }
  };

  const renderItem = ({ item }: { item: DependenteAnonimoDTO }) => {
    const sent = invited.includes(item.id);
    const detalhes = [item.idade != null ? `${item.idade} anos` : null, periodoLabel(item.periodo), item.escola?.nome]
      .filter(Boolean)
      .join(' · ');
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.iniciais}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.iniciais}</Text>
            {!!detalhes && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{detalhes}</Text>}
            {!!item.responsavelNome && (
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Responsável: {item.responsavelNome}
              </Text>
            )}
          </View>
        </View>
        {sent ? (
          <Chip label="Convite enviado · aguardando responsável" tone="success" icon="check" style={styles.sentChip} />
        ) : (
          <Button
            label="Convidar para a viagem"
            icon="send"
            variant="secondary"
            size="md"
            accessibilityLabel={`Convidar o aluno ${item.iniciais} para a viagem`}
            onPress={() => setPendingInvite(item)}
            loading={sendingId === item.id}
            disabled={sendingId !== null}
            fullWidth
          />
        )}
      </Card>
    );
  };

  return (
    <>
      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            {header}
            {loading && <StateView kind="loading" title="Buscando alunos..." style={styles.loading} />}
          </View>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <StateView
              kind="empty"
              icon="users"
              title="Nenhum aluno disponível."
              message={
                escolaNome
                  ? `Aparecem alunos de ${escolaNome} que ainda não estão nesta viagem.`
                  : 'Aparecem alunos com escola cadastrada que ainda não estão nesta viagem.'
              }
            />
          )
        }
      />
      <ConfirmDialog
        visible={!!pendingInvite}
        title="Convidar aluno?"
        message="Se o responsável aceitar, os dados completos do aluno e do responsável serão compartilhados com você."
        confirmLabel="Convidar"
        destructive={false}
        loading={sendingId !== null}
        onConfirm={confirmInvite}
        onCancel={() => setPendingInvite(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  loading: { paddingVertical: spacing.sm },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.label, color: colors.ink },
  info: { flex: 1, gap: 2 },
  name: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  sentChip: { alignSelf: 'flex-start' },
});
