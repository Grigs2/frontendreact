import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import DriverLayout from '../components/DriverLayout';
import { useAppContext } from '../context/AppContext';
import { periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { MotoristaDTO, ViagemDTO } from '../types';
import { Button, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface ResponsavelResumo {
  id: number;
  nome: string;
  telefone?: string | null;
}

/** Aluno como vem em GET /Viagem/Visualizar/{id}. */
interface AlunoDaViagem {
  id: number;
  nome: string;
  escola?: { id: number; nome: string } | null;
  responsaveis?: ResponsavelResumo[];
}

/** Um aluno com todas as viagens do motorista de que faz parte. */
interface AlunoVinculado extends AlunoDaViagem {
  viagens: { id: number; nome: string }[];
}

/**
 * Alunos que já têm vínculo com o motorista: os de todas as viagens ativas, sem repetição e em ordem alfabética.
 * Para buscar e convidar alunos novos há o botão no topo.
 */
export default function DriverStudentsScreen() {
  const navigation = useNavigation<any>();
  const { currentUser } = useAppContext();
  const driver = currentUser as MotoristaDTO;

  const [alunos, setAlunos] = useState<AlunoVinculado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    if (!driver?.id) return;
    setLoading(true);
    setErro(false);
    try {
      const viagens: ViagemDTO[] = (await viagemService.listarViagens(driver.id)).filter((v) => v.ativo && v.id);
      const detalhes = await Promise.all(
        viagens.map((v) =>
          viagemService
            .visualizar(v.id!)
            .then((d) => ({ viagem: v, dependentes: (d?.dependentes ?? []) as AlunoDaViagem[] }))
            .catch(() => ({ viagem: v, dependentes: [] as AlunoDaViagem[] })),
        ),
      );
      const porId = new Map<number, AlunoVinculado>();
      for (const { viagem, dependentes } of detalhes) {
        for (const dep of dependentes) {
          const atual = porId.get(dep.id) ?? { ...dep, viagens: [] };
          atual.viagens.push({ id: viagem.id!, nome: `${viagemNome(viagem)} (${periodoLabel(viagem.periodo)})` });
          porId.set(dep.id, atual);
        }
      }
      setAlunos(
        Array.from(porId.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
      );
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, [driver?.id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return alunos;
    return alunos.filter(
      (a) => a.nome.toLocaleLowerCase('pt-BR').includes(termo) || (a.escola?.nome ?? '').toLocaleLowerCase('pt-BR').includes(termo),
    );
  }, [alunos, busca]);

  const ligar = (telefone: string) => Linking.openURL(`tel:${telefone.replace(/[^\d+]/g, '')}`).catch(() => undefined);

  const renderAluno = ({ item }: { item: AlunoVinculado }) => {
    const responsavel = item.responsaveis?.[0];
    return (
      <View style={styles.card}>
        <View style={styles.topo}>
          <View style={styles.avatar}>
            <Feather name="user" size={22} color={colors.ink} />
          </View>
          <View style={styles.info}>
            <Text style={styles.nome} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.nome}</Text>
            <Text style={styles.detalhe} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.escola?.nome ?? 'Escola não informada'}</Text>
          </View>
          <Chip label={item.viagens.length === 1 ? '1 viagem' : `${item.viagens.length} viagens`} tone="success" size="sm" />
        </View>
        <Text style={styles.detalhe} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={2}>
          {item.viagens.map((v) => v.nome).join(' · ')}
        </Text>
        {responsavel && (
          <View style={styles.responsavel}>
            <Text style={[styles.detalhe, styles.flex]} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
              Responsável: {responsavel.nome}
              {item.responsaveis && item.responsaveis.length > 1 ? ` (+${item.responsaveis.length - 1})` : ''}
            </Text>
            {!!responsavel.telefone && (
              <Pressable
                onPress={() => ligar(responsavel.telefone!)}
                accessibilityRole="button"
                accessibilityLabel={`Ligar para ${responsavel.nome}`}
                style={({ pressed }) => [styles.ligar, pressed && styles.ligarPressed]}
              >
                <Feather name="phone" size={14} color={colors.ink} />
                <Text style={styles.ligarTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>{responsavel.telefone}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader
          title="Alunos vinculados"
          subtitle={!loading && alunos.length ? `${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'} nas suas viagens` : undefined}
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <Button
          label="Buscar e convidar alunos"
          icon="user-plus"
          variant="secondary"
          onPress={() => navigation.navigate('DriverSearchStudents')}
          fullWidth
        />
        {alunos.length > 5 && (
          <TextField placeholder="Buscar por nome ou escola" value={busca} onChangeText={setBusca} accessibilityLabel="Buscar aluno" />
        )}

        {loading ? (
          <StateView kind="loading" title="Carregando alunos..." />
        ) : erro ? (
          <StateView kind="error" title="Não foi possível carregar os alunos." actionLabel="Tentar de novo" onAction={carregar} />
        ) : (
          <FlatList
            data={filtrados}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderAluno}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <StateView
                kind="empty"
                icon="users"
                title={busca ? 'Nenhum aluno encontrado.' : 'Nenhum aluno vinculado ainda.'}
                message={busca ? undefined : 'Quando um responsável aceitar o convite (ou você aceitar um pedido de vaga), o aluno aparece aqui.'}
              />
            }
          />
        )}
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, gap: spacing.md, width: '100%', maxWidth: 800, alignSelf: 'center' },
  lista: { paddingBottom: spacing.xl, gap: spacing.md },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    gap: spacing.sm,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, gap: 2, minWidth: 0 },
  nome: { ...typography.heading, color: colors.ink },
  detalhe: { ...typography.caption, color: colors.slate700 },
  responsavel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ligar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  ligarPressed: { backgroundColor: colors.pressedNeutral },
  ligarTexto: { ...typography.captionBold, color: colors.ink },
});
