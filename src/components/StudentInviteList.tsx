import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteDTO } from '../types';
import { Button, Card, Chip, StateView, TextField } from './ui';
import { isoToBrDate } from '../utils/masks';
import { ageLabel } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  viagemId: number;
  /** Texto exibido quando não há alunos (ex.: nome da escola da viagem). */
  escolaNome?: string | null;
  header?: React.ReactElement;
}

const initials = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Bairro aproximado a partir do endereço em texto "Rua X, 120 - Bairro, Cidade/UF - CEP ...". */
const bairroDe = (endereco?: string | null) => {
  if (!endereco) return '';
  const parte = endereco.split(' - ')[1];
  return parte ? parte.split(',')[0].trim() : '';
};

/**
 * Alunos que o motorista pode convidar para a viagem (mesma escola da viagem, ainda fora dela),
 * com busca por nome. O convite vai para o responsável, que aceita ou recusa.
 */
export default function StudentInviteList({ viagemId, escolaNome, header }: Props) {
  const { showToast } = useAppContext();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<DependenteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [invited, setInvited] = useState<number[]>([]);

  const load = useCallback(
    async (nome: string) => {
      setLoading(true);
      try {
        setStudents(await viagemService.listarDependentesDisponiveis(viagemId, nome));
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Não foi possível carregar os alunos.'), 'error');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viagemId],
  );

  useEffect(() => {
    setInvited([]);
    const timer = setTimeout(() => load(query), query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [query, load]);

  const invite = async (aluno: DependenteDTO) => {
    if (!aluno.id) return;
    setSendingId(aluno.id);
    try {
      await viagemService.solicitarDependente(viagemId, aluno.id);
      setInvited((ids) => [...ids, aluno.id!]);
      showToast(`Convite enviado ao responsável de ${aluno.nome.split(' ')[0]}.`, 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível enviar o convite.'), 'error');
    } finally {
      setSendingId(null);
    }
  };

  const renderItem = ({ item }: { item: DependenteDTO }) => {
    const idade = ageLabel(isoToBrDate(item.dataNascimento));
    const bairro = bairroDe(item.endereco);
    const sent = invited.includes(item.id!);
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{initials(item.nome)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.nome}</Text>
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {[idade, item.escola?.nome].filter(Boolean).join(' · ')}
            </Text>
            {!!bairro && (
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Bairro: {bairro}</Text>
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
            accessibilityLabel={`Convidar ${item.nome} para a viagem`}
            onPress={() => invite(item)}
            loading={sendingId === item.id}
            disabled={sendingId !== null}
            fullWidth
          />
        )}
      </Card>
    );
  };

  return (
    <FlatList
      data={students}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <TextField
            label="Buscar aluno"
            value={query}
            onChangeText={setQuery}
            placeholder="Digite o nome do aluno"
            leftIcon="search"
            autoCapitalize="words"
          />
          {loading && <StateView kind="loading" title="Buscando alunos..." style={styles.loading} />}
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : (
          <StateView
            kind="empty"
            icon="users"
            title={query ? 'Nenhum aluno com esse nome.' : 'Nenhum aluno disponível.'}
            message={
              escolaNome
                ? `Aparecem alunos de ${escolaNome} que ainda não estão nesta viagem.`
                : 'Aparecem alunos com escola cadastrada que ainda não estão nesta viagem.'
            }
          />
        )
      }
    />
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
