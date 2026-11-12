import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel, viagemNome } from '../services/viagemService';
import { DependenteDTO, MotoristaDisponivelDTO, ResponsavelDTO, ViagemDTO } from '../types';
import { Button, Card, Chip, ScreenHeader, SegmentedControl, StateView, TextField } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianSearchDriver'>;
type Mode = 'PROXIMOS' | 'NOME';

const PROXIMIDADE: Record<MotoristaDisponivelDTO['proximidade'], { label: string; tone: 'success' | 'info' | 'neutral' } | null> = {
  MESMO_BAIRRO: { label: 'Mesmo bairro', tone: 'success' },
  MESMA_CIDADE: { label: 'Mesma cidade', tone: 'info' },
  OUTRA_CIDADE: { label: 'Outra cidade', tone: 'neutral' },
  SEM_REFERENCIA: null,
};

const initials = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/**
 * O responsável encontra motoristas próximos (mesmo bairro/cidade do endereço do aluno) ou pelo nome,
 * vê o veículo e as viagens de cada um e pede vaga para o aluno. O motorista aceita ou recusa.
 */
export default function GuardianSearchDriverScreen({ navigation }: Props) {
  const { currentUser, showToast } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;
  const dependentes = guardian?.dependentes ?? [];

  const [mode, setMode] = useState<Mode>('PROXIMOS');
  const [aluno, setAluno] = useState<DependenteDTO | null>(dependentes[0] ?? null);
  const [nome, setNome] = useState('');
  const [drivers, setDrivers] = useState<MotoristaDisponivelDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [requested, setRequested] = useState<number[]>([]);
  const [pendingSeat, setPendingSeat] = useState<ViagemDTO | null>(null);

  const search = useCallback(async () => {
    if (!guardian?.id) return;
    setLoading(true);
    try {
      setDrivers(
        await responsavelService.buscarMotoristas(guardian.id, {
          nome: mode === 'NOME' ? nome : undefined,
          idDependente: aluno?.id,
          somenteProximos: mode === 'PROXIMOS',
        }),
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível buscar motoristas.'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardian?.id, mode, nome, aluno?.id]);

  useEffect(() => {
    if (mode === 'NOME' && nome.trim().length < 2) {
      setDrivers([]);
      return;
    }
    const timer = setTimeout(search, mode === 'NOME' ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, mode, nome]);

  const requestSeat = async (viagem: ViagemDTO) => {
    if (!aluno?.id || !viagem.id) return;
    setSending(viagem.id);
    try {
      await responsavelService.solicitarTransporte(viagem.id, aluno.id);
      setRequested((ids) => [...ids, viagem.id!]);
      showToast('Pedido enviado. O motorista vai aceitar ou recusar.', 'success');
      setPendingSeat(null);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível enviar o pedido.'), 'error');
    } finally {
      setSending(null);
    }
  };

  const confirmRequest = () => {
    if (pendingSeat) requestSeat(pendingSeat);
  };

  const renderTrip = (viagem: ViagemDTO, motoristaNome: string) => {
    const outraEscola = !!viagem.escolas?.length && !!aluno?.escola?.id && !viagem.escolas.some((e) => e.id === aluno.escola?.id);
    const sent = requested.includes(viagem.id!);
    return (
      <View key={viagem.id} style={styles.trip}>
        <View style={styles.flex}>
          <Text style={styles.tripTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{viagemNome(viagem)}</Text>
          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {outraEscola ? 'Vai para outra escola' : periodoLabel(viagem.periodo)}
          </Text>
        </View>
        {sent ? (
          <Chip label="Pedido enviado" tone="success" icon="check" size="sm" />
        ) : (
          <Button
            label="Pedir vaga"
            size="md"
            variant={outraEscola ? 'secondary' : 'primary'}
            disabled={outraEscola || !aluno || sending !== null}
            loading={sending === viagem.id}
            onPress={() => setPendingSeat(viagem)}
            accessibilityLabel={`Pedir vaga para ${aluno?.nome ?? 'o aluno'} na ${viagemNome(viagem)}, ${periodoLabel(viagem.periodo)}, com ${motoristaNome}`}
          />
        )}
      </View>
    );
  };

  const renderDriver = ({ item }: { item: MotoristaDisponivelDTO }) => {
    const prox = PROXIMIDADE[item.proximidade];
    const veiculo = [item.veiculoModelo, item.veiculoCor].filter(Boolean).join(' · ');
    return (
      <Card style={styles.card}>
        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{initials(item.nome)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.driverName} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.nome}</Text>
            {!!veiculo && (
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {veiculo}
                {item.veiculoCapacidade ? ` · ${item.veiculoCapacidade} lugares` : ''}
              </Text>
            )}
          </View>
          {prox && <Chip label={prox.label} tone={prox.tone} size="sm" />}
        </View>
        {!!(item.bairro || item.cidade) && (
          <View style={styles.place}>
            <Feather name="map-pin" size={16} color={colors.slate500} />
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Atende a partir de {[item.bairro, item.cidade && `${item.cidade}${item.uf ? `/${item.uf}` : ''}`].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
        {item.viagens.length > 0 ? (
          <View style={styles.trips}>{item.viagens.map((v) => renderTrip(v, item.nome))}</View>
        ) : (
          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Ainda sem viagens abertas.</Text>
        )}
      </Card>
    );
  };

  const header = (
    <View style={styles.header}>
      <ScreenHeader title="Motoristas" subtitle="Encontre um motorista e peça vaga para o seu aluno" />
      {dependentes.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Para qual aluno?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alunos}>
            {dependentes.map((d) => {
              const active = aluno?.id === d.id;
              return (
                <Pressable
                  key={d.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setAluno(d);
                    setRequested([]);
                  }}
                  style={[styles.alunoChip, active && styles.alunoChipActive]}
                >
                  <Text style={[styles.alunoName, active && styles.alunoNameActive]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {d.nome.split(' ')[0]}
                  </Text>
                  <Text style={styles.caption} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {d.escola?.nome || 'Sem escola'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <Card variant="alert">
          <Text style={styles.alertTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Cadastre um aluno primeiro</Text>
          <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            O pedido de vaga é feito para um aluno, e o endereço dele é usado para achar motoristas próximos.
          </Text>
          <Button label="Cadastrar aluno" variant="secondary" icon="user-plus" onPress={() => navigation.navigate('GuardianDependentForm')} fullWidth />
        </Card>
      )}
      <SegmentedControl
        options={[
          { value: 'PROXIMOS', label: 'Próximos' },
          { value: 'NOME', label: 'Por nome' },
        ]}
        value={mode}
        onChange={(v) => setMode(v as Mode)}
      />
      {mode === 'NOME' ? (
        <TextField label="Nome do motorista" value={nome} onChangeText={setNome} placeholder="Digite ao menos 2 letras" leftIcon="search" autoCapitalize="words" />
      ) : (
        <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          Motoristas do mesmo bairro ou da mesma cidade do endereço do aluno.
        </Text>
      )}
    </View>
  );

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <FlatList
          data={drivers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDriver}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            loading ? (
              <StateView kind="loading" title="Buscando motoristas..." />
            ) : mode === 'NOME' && nome.trim().length < 2 ? undefined : (
              <StateView
                kind="empty"
                icon="truck"
                title={
                  !aluno?.escola
                    ? 'Informe a escola do aluno.'
                    : mode === 'PROXIMOS'
                      ? 'Nenhum motorista perto deste endereço.'
                      : 'Nenhum motorista com esse nome.'
                }
                message={
                  !aluno?.escola
                    ? 'A busca mostra apenas motoristas vinculados à escola do aluno. Edite o cadastro do aluno e escolha a escola.'
                    : `Aparecem apenas motoristas com vínculo ativo com ${aluno.escola.nome || 'a escola do aluno'} e veículo cadastrado.${
                        mode === 'PROXIMOS' ? ' Tente também a busca por nome.' : ''
                      }`
                }
              />
            )
          }
        />
        <ConfirmDialog
          visible={!!pendingSeat}
          title="Pedir vaga?"
          message={`Se o motorista aceitar, os dados de ${aluno?.nome ?? 'seu aluno'} e os seus serão compartilhados com ele e o acordo de transporte será fechado.`}
          confirmLabel="Pedir vaga"
          destructive={false}
          loading={sending !== null}
          onConfirm={confirmRequest}
          onCancel={() => setPendingSeat(null)}
        />
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  block: { gap: spacing.sm },
  label: { ...typography.captionBold, color: colors.slate700 },
  alunos: { gap: spacing.sm },
  alunoChip: { minWidth: 120, maxWidth: 200, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 2 },
  alunoChipActive: { backgroundColor: colors.primaryTint, borderColor: colors.ink, borderWidth: 2 },
  alunoName: { ...typography.label, color: colors.slate700 },
  alunoNameActive: { color: colors.ink },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  card: { gap: spacing.md },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.label, color: colors.ink },
  driverName: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  place: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trips: { gap: spacing.sm },
  trip: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background },
  tripTitle: { ...typography.label, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  body: { ...typography.body, color: colors.slate700 },
  alertTitle: { ...typography.heading, color: colors.ink },
});
