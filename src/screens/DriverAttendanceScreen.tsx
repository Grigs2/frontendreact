import React, { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { viagemService } from '../services/viagemService';
import { DependenteParadaDTO, ParadaViagemDTO, ViagemDiaDTO } from '../types';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { getApiErrorMessage } from '../utils/apiError';
import { StatusTone, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverAttendance'>;
type TripStatus = ViagemDiaDTO['status'] | 'INTERROMPIDA';
type Presence = DependenteParadaDTO['statusEmbarque'];

const TRIP_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PLANEJADA: { label: 'Planejada', tone: 'warning' },
  EM_ANDAMENTO: { label: 'Em rota', tone: 'info' },
  FINALIZADA: { label: 'Concluída', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'danger' },
  INTERROMPIDA: { label: 'Interrompida', tone: 'danger' },
};

const PRESENCE: Record<Presence, { label: string; tone: StatusTone }> = {
  ESPERANDO: { label: 'Aguardando', tone: 'neutral' },
  EMBARCADO: { label: 'Embarcou', tone: 'success' },
  DESEMBARCADO: { label: 'Desembarcou', tone: 'info' },
  FALTOU: { label: 'Faltou', tone: 'danger' },
};

/**
 * Chamada da viagem do dia. Cada aluno mostra só as ações válidas (regra da API):
 * Aguardando → Embarcou ou Faltou; Embarcou → Desembarcou.
 */
export default function DriverAttendanceScreen({ route, navigation }: Props) {
  const { activeViagemDia, setActiveViagemDia, currentStops, setCurrentStops, showToast } = useAppContext();
  const viagemDiaId = route.params?.viagemDiaId || activeViagemDia?.id;
  const status = (activeViagemDia?.status ?? 'PLANEJADA') as TripStatus;
  const closed = status === 'FINALIZADA' || status === 'CANCELADA' || status === 'INTERROMPIDA';

  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [updatingTrip, setUpdatingTrip] = useState(false);
  const [reasonFor, setReasonFor] = useState<'CANCELADA' | 'INTERROMPIDA' | null>(null);
  const [reason, setReason] = useState('');
  const [atrasoAberto, setAtrasoAberto] = useState(false);
  const [atrasoMin, setAtrasoMin] = useState(15);
  const [atrasoMotivo, setAtrasoMotivo] = useState('');
  const [enviandoAtraso, setEnviandoAtraso] = useState(false);
  const loadingRef = useRef(false);

  /** Avisa os responsáveis dos alunos que ainda vão embarcar ou estão no veículo. */
  const enviarAtraso = async () => {
    if (!viagemDiaId) return;
    setEnviandoAtraso(true);
    try {
      await viagemService.avisarAtraso(viagemDiaId, atrasoMin, atrasoMotivo);
      showToast('Responsáveis avisados do atraso.', 'success');
      setAtrasoAberto(false);
      setAtrasoMotivo('');
    } catch (error: any) {
      showToast(getApiErrorMessage(error, 'Não foi possível avisar o atraso.'), 'error');
    } finally {
      setEnviandoAtraso(false);
    }
  };

  const loadStops = useCallback(
    async (silent = false) => {
      if (!viagemDiaId || loadingRef.current) return;
      loadingRef.current = true;
      if (!silent) setRefreshing(true);
      try {
        setCurrentStops(await viagemService.buscarParadasViagemDia(viagemDiaId));
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Não foi possível carregar as paradas.'), 'error');
      } finally {
        setRefreshing(false);
        loadingRef.current = false;
      }
    },
    [viagemDiaId, setCurrentStops, showToast],
  );

  useFocusEffect(
    useCallback(() => {
      if (!viagemDiaId) {
        showToast('Nenhuma viagem em andamento. Escolha uma viagem em Rotas.', 'info');
        navigation.navigate('DriverTrips');
        return;
      }
      loadStops();
    }, [viagemDiaId, loadStops, navigation, showToast]),
  );

  const changeTrip = async (novo: TripStatus, motivo?: string) => {
    if (!viagemDiaId || updatingTrip) return;
    setUpdatingTrip(true);
    try {
      const updated = await viagemService.alterarStatusViagemDia(viagemDiaId, novo, motivo);
      setActiveViagemDia(updated);
      showToast(`Viagem ${TRIP_STATUS[novo].label.toLowerCase()}.`, 'success');
      setReasonFor(null);
      setReason('');
      loadStops(true);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível alterar a viagem.'), 'error');
    } finally {
      setUpdatingTrip(false);
    }
  };

  const mark = async (aluno: DependenteParadaDTO, novo: 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU') => {
    if (!viagemDiaId || closed || submitting !== null) return;
    setSubmitting(aluno.id);
    try {
      const stops = await viagemService.alterarStatusPresenca(viagemDiaId, aluno.id, novo);
      if (Array.isArray(stops)) setCurrentStops(stops);
      showToast(`${aluno.nomeDependente.split(' ')[0]}: ${PRESENCE[novo].label.toLowerCase()}. Responsável avisado.`, 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível registrar a presença.'), 'error');
    } finally {
      setSubmitting(null);
    }
  };

  // Resumo e próxima parada com aluno aguardando
  const alunos = currentStops.flatMap((s) => s.listaDependentes);
  const unique = Array.from(new Map(alunos.map((a) => [a.id, a])).values());
  const count = (st: Presence) => unique.filter((a) => a.statusEmbarque === st).length;
  const nextStop = currentStops.find((s) => s.listaDependentes.some((d) => d.statusEmbarque === 'ESPERANDO'));
  const waiting = nextStop?.listaDependentes.filter((d) => d.statusEmbarque === 'ESPERANDO') ?? [];

  const renderStudent = (aluno: DependenteParadaDTO, stop: ParadaViagemDTO) => {
    const st = aluno.statusEmbarque;
    const busy = submitting === aluno.id;
    return (
      <View key={`${stop.ordem}-${aluno.id}`} style={styles.student}>
        <View style={styles.studentHead}>
          <View style={styles.flex}>
            <Text style={styles.studentName} maxFontSizeMultiplier={maxFontSizeMultiplier}>{aluno.nomeDependente}</Text>
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Responsável: {aluno.nomeResponsavel}</Text>
          </View>
          <Chip label={PRESENCE[st].label} tone={PRESENCE[st].tone} size="sm" />
        </View>
        {!closed && status === 'EM_ANDAMENTO' && st === 'ESPERANDO' && (
          <View style={styles.actions}>
            <Button label="Embarcou" icon="log-in" size="md" onPress={() => mark(aluno, 'EMBARCADO')} loading={busy} disabled={submitting !== null} style={styles.flex} accessibilityLabel={`${aluno.nomeDependente} embarcou`} />
            <Button label="Faltou" icon="x" size="md" variant="secondary" onPress={() => mark(aluno, 'FALTOU')} disabled={submitting !== null} style={styles.flex} accessibilityLabel={`${aluno.nomeDependente} faltou`} />
          </View>
        )}
        {!closed && status === 'EM_ANDAMENTO' && st === 'EMBARCADO' && (
          <Button label="Desembarcou" icon="log-out" size="md" variant="secondary" onPress={() => mark(aluno, 'DESEMBARCADO')} loading={busy} disabled={submitting !== null} fullWidth accessibilityLabel={`${aluno.nomeDependente} desembarcou`} />
        )}
      </View>
    );
  };

  return (
    <DriverLayout>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStops()} colors={[colors.ink]} tintColor={colors.ink} />}
      >
        <ScreenHeader
          title="Chamada"
          subtitle="Registre embarque e desembarque em cada parada"
          onBack={() => navigation.goBack()}
          right={<Chip label={TRIP_STATUS[status]?.label ?? status} tone={TRIP_STATUS[status]?.tone ?? 'neutral'} />}
        />

        <Card>
          <View style={styles.summary}>
            {(['EMBARCADO', 'ESPERANDO', 'DESEMBARCADO', 'FALTOU'] as Presence[]).map((st) => (
              <View key={st} style={styles.summaryItem}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={maxFontSizeMultiplier}>{count(st)}</Text>
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{PRESENCE[st].label}</Text>
              </View>
            ))}
          </View>
          {status === 'PLANEJADA' && (
            <View style={styles.tripActions}>
              <Button label="Iniciar viagem" icon="play" onPress={() => changeTrip('EM_ANDAMENTO')} loading={updatingTrip} fullWidth />
              <Button label="Avisar atraso" icon="clock" variant="secondary" onPress={() => setAtrasoAberto(true)} disabled={updatingTrip} fullWidth />
              <Button label="Cancelar viagem de hoje" variant="tertiary" onPress={() => setReasonFor('CANCELADA')} disabled={updatingTrip} fullWidth />
            </View>
          )}
          {status === 'EM_ANDAMENTO' && (
            <View style={styles.tripActions}>
              <Button label="Finalizar viagem" icon="flag" onPress={() => changeTrip('FINALIZADA')} loading={updatingTrip} fullWidth />
              <Button label="Avisar atraso" icon="clock" variant="secondary" onPress={() => setAtrasoAberto(true)} disabled={updatingTrip} fullWidth />
              <Button label="Interromper viagem" variant="tertiary" onPress={() => setReasonFor('INTERROMPIDA')} disabled={updatingTrip} fullWidth />
            </View>
          )}
        </Card>

        {status === 'EM_ANDAMENTO' && waiting.length > 0 && nextStop && (
          <Card variant="alert">
            <Chip label="Atenção" tone="danger" size="sm" style={styles.alignStart} />
            <Text style={styles.alertTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {waiting.map((w) => w.nomeDependente.split(' ')[0]).join(', ')} ainda não {waiting.length > 1 ? 'embarcaram' : 'embarcou'}
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Parada {nextStop.ordem} · {nextStop.endereco || nextStop.nomeLocal}
            </Text>
          </Card>
        )}

        {refreshing && currentStops.length === 0 && <StateView kind="loading" title="Carregando paradas..." />}

        {currentStops.map((stop, index) => (
          <Card key={`${stop.ordem}-${index}`} variant={stop === nextStop && status === 'EM_ANDAMENTO' ? 'selected' : 'default'} style={styles.stop}>
            <View style={styles.stopHead}>
              <View style={[styles.stopBadge, stop.tipoParada === 'MOTORISTA' && styles.stopBadgeDriver]}>
                {stop.tipoParada === 'MOTORISTA' ? (
                  <Feather name="home" size={16} color={colors.surface} />
                ) : (
                  <Text style={styles.stopNumber} maxFontSizeMultiplier={maxFontSizeMultiplier}>{stop.ordem}</Text>
                )}
              </View>
              <View style={styles.flex}>
                <Text style={styles.stopTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{stop.nomeLocal}</Text>
                {!!stop.endereco && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{stop.endereco}</Text>}
              </View>
            </View>
            {stop.listaDependentes.map((aluno) => renderStudent(aluno, stop))}
          </Card>
        ))}

        {!refreshing && currentStops.length === 0 && (
          <StateView kind="empty" icon="map-pin" title="Nenhuma parada nesta viagem." message="Convide alunos para a viagem em Rotas." />
        )}
      </ScrollView>

      <Modal visible={reasonFor !== null} transparent animationType="slide" onRequestClose={() => setReasonFor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {reasonFor === 'CANCELADA' ? 'Cancelar viagem de hoje' : 'Interromper viagem'}
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Os responsáveis serão avisados. Informe o motivo.
            </Text>
            <TextField label="Motivo" value={reason} onChangeText={setReason} placeholder="Ex.: pneu furado, feriado" multiline maxLength={1000} />
            <Button
              label="Confirmar"
              variant="destructive"
              onPress={() => reasonFor && changeTrip(reasonFor, reason)}
              loading={updatingTrip}
              disabled={!reason.trim()}
              fullWidth
            />
            <Button label="Voltar" variant="tertiary" onPress={() => setReasonFor(null)} disabled={updatingTrip} fullWidth />
          </View>
        </View>
      </Modal>

      <Modal visible={atrasoAberto} transparent animationType="fade" onRequestClose={() => setAtrasoAberto(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Avisar atraso
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Os responsáveis dos alunos que ainda vão embarcar ou estão no veículo recebem o aviso.
            </Text>
            <View style={styles.atrasoOpcoes}>
              {ATRASO_OPCOES.map((min) => (
                <Pressable
                  key={min}
                  onPress={() => setAtrasoMin(min)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: atrasoMin === min }}
                  accessibilityLabel={`${min} minutos`}
                  style={[styles.atrasoOpcao, atrasoMin === min && styles.atrasoOpcaoAtiva]}
                >
                  <Text style={[styles.caption, atrasoMin === min && styles.atrasoTextoAtivo]}>{min} min</Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Motivo (opcional)"
              value={atrasoMotivo}
              onChangeText={setAtrasoMotivo}
              placeholder="Ex.: trânsito na avenida"
              maxLength={200}
            />
            <Button label="Enviar aviso" icon="send" onPress={enviarAtraso} loading={enviandoAtraso} fullWidth />
            <Button label="Voltar" variant="tertiary" onPress={() => setAtrasoAberto(false)} disabled={enviandoAtraso} fullWidth />
          </View>
        </View>
      </Modal>
    </DriverLayout>
  );
}

/** Opções rápidas de atraso (o backend aceita de 5 a 180 minutos). */
const ATRASO_OPCOES = [5, 10, 15, 20, 30, 45];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alignStart: { alignSelf: 'flex-start' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, gap: spacing.lg, width: '100%', maxWidth: 800, alignSelf: 'center' },
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background },
  summaryValue: { ...typography.title, color: colors.ink },
  tripActions: { gap: layout.buttonGap, marginTop: spacing.sm },
  atrasoOpcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  atrasoOpcao: {
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atrasoOpcaoAtiva: { backgroundColor: colors.ink, borderColor: colors.ink },
  atrasoTextoAtivo: { color: colors.surface, fontWeight: '700' },
  alertTitle: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
  stop: { gap: spacing.md },
  stopHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stopBadge: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stopBadgeDriver: { backgroundColor: colors.slate500 },
  stopNumber: { ...typography.captionBold, color: colors.onPrimary },
  stopTitle: { ...typography.label, color: colors.ink },
  student: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  studentHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  studentName: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  actions: { flexDirection: 'row', gap: layout.buttonGap },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalTitle: { ...typography.heading, color: colors.ink },
});
