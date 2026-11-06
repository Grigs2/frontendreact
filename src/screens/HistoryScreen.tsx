import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import GuardianLayout from '../components/GuardianLayout';
import AbsenceModal from '../components/AbsenceModal';
import StatusBadge from '../components/StatusBadge';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel } from '../services/viagemService';
import { DependenteDTO, HistoricoAlunoDTO } from '../types';
import { Button, ScreenHeader, SegmentedControl, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';
import { dataCurta } from './DriverHistoryScreen';

type Faixa = '30' | '90' | '365';

const isoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

const PRESENCA: Record<string, { label: string; variant: 'success' | 'error' | 'info' | 'warning' | 'default' }> = {
  ESPERANDO: { label: 'Aguardando', variant: 'warning' },
  EMBARCADO: { label: 'Embarcou', variant: 'info' },
  DESEMBARCADO: { label: 'Entregue', variant: 'success' },
  FALTOU: { label: 'Faltou', variant: 'error' },
};

/** Histórico do responsável: o que aconteceu com cada aluno nas viagens, quando e com quem. */
export default function HistoryScreen() {
  const { currentUser } = useAppContext();
  const isFocused = useIsFocused();
  const dependentes: DependenteDTO[] = ((currentUser as any)?.dependentes ?? []).filter((d: DependenteDTO) => d.id);
  const [alunoId, setAlunoId] = useState<number | null>(dependentes[0]?.id ?? null);
  const [faixa, setFaixa] = useState<Faixa>('30');
  const [itens, setItens] = useState<HistoricoAlunoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [ausenciaAberta, setAusenciaAberta] = useState(false);

  useEffect(() => {
    if (!alunoId && dependentes[0]?.id) setAlunoId(dependentes[0].id);
  }, [dependentes, alunoId]);

  const carregar = useCallback(async () => {
    if (!alunoId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const de = new Date();
      de.setDate(de.getDate() - Number(faixa));
      setItens(await responsavelService.historicoDependente(alunoId, isoDia(de), isoDia(new Date())));
      setErro(false);
    } catch (error) {
      console.error('Error loading student history:', error);
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, [alunoId, faixa]);

  useEffect(() => {
    if (isFocused) carregar();
  }, [isFocused, carregar]);

  const aluno = dependentes.find((d) => d.id === alunoId);

  const renderItem = ({ item }: { item: HistoricoAlunoDTO }) => {
    const presenca = item.statusPresenca ? PRESENCA[item.statusPresenca] : null;
    const cancelada = item.statusViagem === 'CANCELADA';
    const embarque = hora(item.horarioEmbarque);
    const desembarque = hora(item.horarioDesembarque);
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.date}>{dataCurta(item.data)}</Text>
          {cancelada ? (
            <StatusBadge status="Cancelada" variant="error" />
          ) : presenca ? (
            <StatusBadge status={presenca.label} variant={presenca.variant} />
          ) : null}
        </View>
        <Text style={styles.nome}>{item.viagemNome || 'Viagem'}</Text>
        {item.periodo ? <Text style={styles.detail}>{periodoLabel(item.periodo)}</Text> : null}

        <View style={styles.linhaTempo}>
          <Linha icone="log-in" texto={embarque ? `Embarcou às ${embarque}` : 'Sem embarque registrado'} apagado={!embarque} />
          <Linha icone="log-out" texto={desembarque ? `Entregue às ${desembarque}` : 'Sem desembarque registrado'} apagado={!desembarque} />
        </View>

        {item.motoristaNome ? (
          <Text style={styles.detail}>
            Motorista: {item.motoristaNome}
            {item.placa ? ` · ${item.placa}` : ''}
          </Text>
        ) : null}
        {item.motivo ? <Text style={styles.motivo}>Motivo: {item.motivo}</Text> : null}
      </View>
    );
  };

  const content = (
    <View style={styles.container}>
      <ScreenHeader
        title="Histórico"
        right={
          aluno ? (
            <Button label="Avisar falta" icon="calendar" size="md" variant="secondary" onPress={() => setAusenciaAberta(true)} />
          ) : undefined
        }
      />

      {dependentes.length === 0 ? (
        <StateView kind="empty" icon="users" title="Nenhum aluno cadastrado" message="Cadastre um aluno para ver o histórico das viagens." />
      ) : (
        <>
          {dependentes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alunos} style={styles.alunosScroll}>
              {dependentes.map((d) => {
                const ativo = d.id === alunoId;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => setAlunoId(d.id!)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    style={[styles.aluno, ativo && styles.alunoAtivo]}
                  >
                    <Text style={[styles.alunoTexto, ativo && styles.alunoTextoAtivo]}>{d.nome.split(' ')[0]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <SegmentedControl<Faixa>
            options={[
              { value: '30', label: '30 dias' },
              { value: '90', label: '3 meses' },
              { value: '365', label: '1 ano' },
            ]}
            value={faixa}
            onChange={setFaixa}
            style={styles.segment}
          />

          {loading ? (
            <StateView kind="loading" title="Carregando histórico..." style={styles.center} />
          ) : erro ? (
            <StateView kind="error" title="Não foi possível carregar o histórico" actionLabel="Tentar de novo" onAction={carregar} style={styles.center} />
          ) : (
            <FlatList
              data={itens}
              keyExtractor={(item) => String(item.viagemDiaId)}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshing={loading}
              onRefresh={carregar}
              ListEmptyComponent={
                <StateView kind="empty" icon="clock" title="Nenhuma viagem nesse período" message={`As viagens de ${aluno?.nome.split(' ')[0] ?? 'seu aluno'} aparecem aqui.`} />
              }
            />
          )}
        </>
      )}

      {aluno?.id ? (
        <AbsenceModal
          visible={ausenciaAberta}
          dependenteId={aluno.id}
          dependenteNome={aluno.nome}
          onClose={() => setAusenciaAberta(false)}
        />
      ) : null}
    </View>
  );

  return <GuardianLayout>{content}</GuardianLayout>;
}

function Linha({ icone, texto, apagado }: { icone: React.ComponentProps<typeof Feather>['name']; texto: string; apagado?: boolean }) {
  return (
    <View style={styles.linha}>
      <Feather name={icone} size={14} color={apagado ? colors.slate500 : colors.ink} />
      <Text style={[styles.linhaTexto, apagado && { color: colors.slate500 }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  center: { flex: 1 },
  segment: { marginBottom: spacing.md },
  alunosScroll: { flexGrow: 0, marginBottom: spacing.md },
  alunos: { gap: spacing.sm },
  aluno: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alunoAtivo: { backgroundColor: colors.ink, borderColor: colors.ink },
  alunoTexto: { ...typography.caption, color: colors.slate700 },
  alunoTextoAtivo: { ...typography.captionBold, color: colors.surface },
  list: { paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    marginBottom: spacing.md,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  date: { ...typography.label, color: colors.ink },
  nome: { ...typography.body, color: colors.ink },
  detail: { ...typography.caption, color: colors.slate500 },
  motivo: { ...typography.caption, color: colors.danger },
  linhaTempo: { gap: spacing.xs, marginVertical: spacing.sm },
  linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linhaTexto: { ...typography.caption, color: colors.ink },
});
