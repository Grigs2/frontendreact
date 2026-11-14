import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { PERIODOS, periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { motoristaService } from '../services/motoristaService';
import { AgendaViagemDTO, EscolaBuscaDTO, MotoristaDTO, ViagemDTO } from '../types';
import ChoiceChips from '../components/ChoiceChips';
import { SectionTitle } from '../components/HomeBlocks';
import { formatDayShort, nextSevenDays, todayIso } from '../utils/format';
import { statusExecucao } from '../utils/statusLabels';
import DriverLayout from '../components/DriverLayout';
import { Button, Card, Chip, ListRow, ScreenHeader, StateView, TextField } from '../components/ui';
import { getApiErrorMessage } from '../utils/apiError';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

/** Viagens do motorista. Cada viagem é criada para uma escola e um período: "Viagem para <escola>", Manhã · ida etc. */
export default function DriverTripsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, showToast } = useAppContext();
  const driver = currentUser as MotoristaDTO;
  const hasVehicle = !!driver?.veiculoDTO?.placa;

  const [trips, setTrips] = useState<ViagemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulário de nova viagem
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<EscolaBuscaDTO[]>([]);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [schools, setSchools] = useState<EscolaBuscaDTO[]>([]);
  const [period, setPeriod] = useState<string>(PERIODOS[0]);
  const [nome, setNome] = useState('');

  // Agenda: janela de 7 dias (5.1.2–5.1.4, 5.1.7)
  const [agenda, setAgenda] = useState<AgendaViagemDTO[]>([]);
  const [prontas, setProntas] = useState<Record<number, boolean>>({});
  const [dia, setDia] = useState(todayIso());
  const [sentido, setSentido] = useState<'TODOS' | 'IDA' | 'VOLTA'>('TODOS');

  const loadTrips = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const lista = await viagemService.listarViagens(currentUser.id);
      setTrips(lista);
      viagemService.agenda(currentUser.id).then(setAgenda).catch(() => setAgenda([]));
      // Prontidão de cada itinerário ativo: separa "Pronta para iniciar" de "Com pendências".
      Promise.all(
        lista.filter((t) => t.ativo && t.id).map((t) =>
          viagemService.prontidao(t.id!).then((p) => [t.id!, p.pronta] as const).catch(() => null),
        ),
      ).then((res) => setProntas(Object.fromEntries(res.filter(Boolean) as (readonly [number, boolean])[])));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível carregar as viagens.'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips]),
  );

  // Busca de escolas com atraso curto enquanto o motorista digita (mín. 2 letras, regra da API).
  useEffect(() => {
    const termo = schoolQuery.trim();
    if (termo.length < 2) {
      setSchoolResults([]);
      return;
    }
    let active = true;
    setSearchingSchools(true);
    const timer = setTimeout(() => {
      motoristaService
        .buscarEscolas(termo)
        .then((list) => active && setSchoolResults(list))
        .catch(() => active && setSchoolResults([]))
        .finally(() => active && setSearchingSchools(false));
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [schoolQuery]);

  const openCreate = () => {
    setSchools([]);
    setSchoolQuery('');
    setSchoolResults([]);
    setPeriod(PERIODOS[0]);
    setNome('');
    setShowCreateModal(true);
  };

  const toggleSchool = (s: EscolaBuscaDTO) => {
    setSchools((atual) => (atual.some((e) => e.id === s.id) ? atual.filter((e) => e.id !== s.id) : [...atual, s]));
  };

  const usedPeriods = new Set(trips.filter((t) => t.ativo).map((t) => t.periodo));

  const handleCreateTrip = async () => {
    if (!currentUser?.id || schools.length === 0) return;
    setCreating(true);
    try {
      await viagemService.criar(currentUser.id, period, schools.map((s) => s.id), nome);
      setShowCreateModal(false);
      showToast('Viagem criada.', 'success');
      loadTrips();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível criar a viagem.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const dias = nextSevenDays();
  const agendaDoDia = agenda
    .filter((a) => a.data === dia)
    .filter((a) => sentido === 'TODOS' || a.periodo.endsWith(sentido === 'IDA' ? '_IDA' : '_VOLTA'));

  const agendaHeader = (
    <View style={styles.agenda}>
      <Button label="Nova viagem" icon="plus" fullWidth onPress={openCreate} disabled={!hasVehicle} />
      <SectionTitle>Agenda</SectionTitle>
      <ChoiceChips
        scroll
        options={dias.map((d, i) => ({ value: d, label: i === 0 ? 'Hoje' : String(Number(d.slice(8, 10))), caption: formatDayShort(d).split(',')[0] }))}
        value={dia}
        onChange={setDia}
        accessibilityLabel="Data da viagem"
      />
      <ChoiceChips
        options={[
          { value: 'TODOS', label: 'Todas' },
          { value: 'IDA', label: 'Ida' },
          { value: 'VOLTA', label: 'Volta' },
        ]}
        value={sentido}
        onChange={setSentido}
        accessibilityLabel="Sentido da viagem"
      />
      {agendaDoDia.length ? (
        agendaDoDia.map((a) => {
          const trip = trips.find((t) => t.id === a.idViagem);
          const info = statusExecucao(a.status, { materializada: a.materializada, pronta: prontas[a.idViagem] });
          return (
            <Card
              key={`${a.idViagem}-${a.data}`}
              onPress={() => navigation.navigate('DriverTripDay', { viagemId: a.idViagem, data: a.data, viagemDiaId: a.idViagemDia })}
              accessibilityLabel={`${trip ? viagemNome(trip) : 'Viagem'}, ${periodoLabel(a.periodo)}, ${info.label}`}
            >
              <View style={styles.tripRow}>
                <View style={styles.flex}>
                  <Text style={styles.tripTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{trip ? viagemNome(trip) : 'Viagem'}</Text>
                  <Text style={styles.tripCaption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {periodoLabel(a.periodo)} · {formatDayShort(a.data)}
                  </Text>
                </View>
                <Chip label={info.label} tone={info.tone} size="sm" />
              </View>
            </Card>
          );
        })
      ) : (
        <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {trips.some((t) => t.ativo) ? 'Nenhuma viagem neste filtro.' : 'Crie uma viagem para vê-la na agenda.'}
        </Text>
      )}
      <SectionTitle>Itinerários</SectionTitle>
    </View>
  );

  const renderTrip = ({ item }: { item: ViagemDTO }) => (
    <Card
      onPress={() => navigation.navigate('DriverTripDetails', { viagemId: item.id! })}
      accessibilityLabel={`${viagemNome(item)}, ${periodoLabel(item.periodo)}, ${item.ativo ? 'ativa' : 'inativa'}`}
      style={styles.tripCard}
    >
      <View style={styles.tripRow}>
        <View style={styles.iconSlot}>
          <Feather name="map" size={layout.icon} color={colors.ink} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.tripTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{viagemNome(item)}</Text>
          <Text style={styles.tripCaption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{periodoLabel(item.periodo)}</Text>
        </View>
        <Chip label={item.ativo ? 'Ativa' : 'Encerrada'} tone={item.ativo ? 'success' : 'neutral'} size="sm" />
      </View>
    </Card>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader title="Rotas" subtitle="Agenda da semana e itinerários" />

        {!hasVehicle && (
          <Card variant="alert" style={styles.alert}>
            <Chip label="Atenção" tone="danger" size="sm" style={styles.alertChip} />
            <Text style={styles.alertTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Cadastre seu veículo</Text>
            <Text style={styles.alertText} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Para criar viagens, informe primeiro o modelo, a placa e a capacidade do veículo.
            </Text>
            <Button label="Cadastrar veículo" variant="secondary" icon="truck" onPress={() => navigation.navigate('DriverVehicle')} fullWidth />
          </Card>
        )}

        {loading && trips.length === 0 ? (
          <StateView kind="loading" title="Carregando viagens..." />
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTrip}
            contentContainerStyle={styles.list}
            ListHeaderComponent={agendaHeader}
            ListEmptyComponent={
              <StateView kind="empty" icon="map" title="Nenhuma viagem criada." message="Toque em Nova para criar a viagem de uma escola." />
            }
            refreshing={loading}
            onRefresh={loadTrips}
          />
        )}

        <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent} accessibilityViewIsModal>
              <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Nova viagem
                </Text>

                <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>1. Escolas de destino</Text>
                <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Você pode atender mais de uma escola na mesma viagem. Somente alunos dessas escolas poderão entrar nela.
                </Text>
                {schools.map((s) => (
                  <Card key={s.id} variant="selected">
                    <ListRow
                      icon="book-open"
                      title={s.nome}
                      right={<Button label="Remover" variant="tertiary" size="md" onPress={() => toggleSchool(s)} />}
                    />
                  </Card>
                ))}
                <TextField
                  label="Buscar escola"
                  value={schoolQuery}
                  onChangeText={setSchoolQuery}
                  placeholder="Digite o nome ou o CNPJ"
                  leftIcon="search"
                />
                {searchingSchools && <StateView kind="loading" title="Buscando..." style={styles.inlineState} />}
                {!searchingSchools && schoolQuery.trim().length >= 2 && schoolResults.length === 0 && (
                  <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>Nenhuma escola encontrada com esse nome.</Text>
                )}
                {schoolResults
                  .filter((s) => !schools.some((e) => e.id === s.id))
                  .map((s, i) => (
                    <ListRow key={s.id} icon="book-open" title={s.nome} divider={i > 0} onPress={() => toggleSchool(s)} />
                  ))}

                <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>2. Período</Text>
                <View style={styles.periodGrid} accessibilityRole="radiogroup">
                  {PERIODOS.map((p) => {
                    const selected = period === p;
                    const used = usedPeriods.has(p);
                    return (
                      <Pressable
                        key={p}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: used }}
                        accessibilityLabel={`${periodoLabel(p)}${used ? ', já existe uma viagem ativa' : ''}`}
                        disabled={used}
                        onPress={() => setPeriod(p)}
                        style={[styles.periodOption, selected && styles.periodSelected, used && styles.periodUsed]}
                      >
                        <Text style={[styles.periodText, selected && styles.periodTextSelected, used && styles.periodTextUsed]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                          {periodoLabel(p)}
                        </Text>
                        {used && <Text style={styles.periodNote} maxFontSizeMultiplier={maxFontSizeMultiplier}>já criada</Text>}
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Veículo: {driver?.veiculoDTO?.modelo || '—'} · {driver?.veiculoDTO?.capacidade ?? '?'} lugares. A data é escolhida ao preparar cada viagem na agenda.
                </Text>

                <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>3. Nome da viagem</Text>
                <TextField
                  label="Nome"
                  value={nome}
                  onChangeText={setNome}
                  placeholder={viagemNome({ periodo: period, escolas: schools.map((s) => ({ id: s.id, nome: s.nome })) })}
                  maxLength={200}
                />
                <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Se deixar em branco, o nome padrão será usado. Você pode alterá-lo depois.
                </Text>

                {schools.length > 0 && (
                  <Card variant="muted">
                    <Text style={styles.previewLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>Será criada</Text>
                    <Text style={styles.previewTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {nome.trim() || viagemNome({ periodo: period, escolas: schools.map((s) => ({ id: s.id, nome: s.nome })) })}
                    </Text>
                    <Text style={styles.tripCaption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{periodoLabel(period)}</Text>
                  </Card>
                )}

                <View style={styles.modalActions}>
                  <Button
                    label="Criar viagem"
                    icon="check"
                    onPress={handleCreateTrip}
                    loading={creating}
                    disabled={schools.length === 0 || usedPeriods.has(period)}
                    fullWidth
                  />
                  <Button label="Cancelar" variant="tertiary" onPress={() => setShowCreateModal(false)} disabled={creating} fullWidth />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  tripCard: { gap: 0 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconSlot: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  tripTitle: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  tripCaption: { ...typography.caption, color: colors.slate500 },
  alert: { marginBottom: spacing.lg },
  alertChip: { alignSelf: 'flex-start' },
  alertTitle: { ...typography.heading, color: colors.ink },
  alertText: { ...typography.body, color: colors.slate700 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalBody: { padding: spacing.xl, gap: spacing.md },
  modalTitle: { ...typography.title, color: colors.ink },
  label: { ...typography.captionBold, color: colors.slate700, marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.slate500 },
  inlineState: { paddingVertical: spacing.sm },
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  periodOption: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: layout.buttonLg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  periodSelected: { backgroundColor: colors.primaryTint, borderWidth: borders.alert, borderColor: colors.ink },
  periodUsed: { backgroundColor: colors.disabledBg, borderColor: colors.disabledBorder },
  periodText: { ...typography.body, color: colors.ink },
  periodTextSelected: { ...typography.label, color: colors.ink },
  periodTextUsed: { color: colors.disabledText },
  periodNote: { ...typography.caption, color: colors.disabledText },
  previewLabel: { ...typography.captionBold, color: colors.slate500 },
  previewTitle: { ...typography.label, color: colors.ink },
  modalActions: { gap: layout.buttonGap, marginTop: spacing.sm },
  agenda: { gap: spacing.md, marginBottom: spacing.sm },
});
