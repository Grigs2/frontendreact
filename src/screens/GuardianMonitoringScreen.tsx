import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import GuardianLayout from '../components/GuardianLayout';
import TripMap from '../components/TripMap';
import LinhaResponsavel from '../components/LinhaResponsavel';
import AbsenceModal from '../components/AbsenceModal';
import ChoiceChips from '../components/ChoiceChips';
import { InfoLine, Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, Chip, ScreenHeader, StateView } from '../components/ui';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel, viagemService } from '../services/viagemService';
import { INTERVALO_GPS_MS, localizacaoService } from '../services/localizacaoService';
import { useRotaViagem } from '../hooks/useRotaViagem';
import { distancia, linhaDaRota, tempoAte } from '../utils/rota';
import { LinhaViagemDTO, LocalizacaoViagemDTO, MonitoramentoDTO, MotoristaViagemDTO, ResponsavelDTO, ViagemDiaDTO } from '../types';
import { statusInfo } from '../utils/statusLabels';
import { formatDate, formatDayShort, formatRelative, formatTime } from '../utils/format';
import { maskPlate, maskPhone } from '../utils/masks';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

const ALTURA_MAPA = 280;

/** Chip pequeno sobre o mapa, igual ao da tela do motorista. */
function ChipAcao({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.chip}>
      <Text style={styles.chipTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>{label}</Text>
    </Pressable>
  );
}

/** 3.7 e 7.2 — acompanhamento do aluno: estado da viagem, presença, motorista e localização ao vivo. */
export default function GuardianMonitoringScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { currentUser } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;
  const dependentes = guardian?.dependentes ?? [];

  const [selecionado, setSelecionado] = useState<number | null>(route.params?.dependenteId ?? dependentes[0]?.id ?? null);
  const [monitor, setMonitor] = useState<MonitoramentoDTO | null>(null);
  const [execucao, setExecucao] = useState<ViagemDiaDTO | null>(null);
  const [motorista, setMotorista] = useState<MotoristaViagemDTO | null>(null);
  const [posicao, setPosicao] = useState<LocalizacaoViagemDTO | null>(null);
  const [gpsAviso, setGpsAviso] = useState<string | null>(null);
  const [linha, setLinha] = useState<LinhaViagemDTO | null>(null);
  // null: automático (linha quando não há previsão do Google); true/false: escolha do responsável.
  const [vistaLinha, setVistaLinha] = useState<boolean | null>(null);
  // O backend pede o consentimento deste responsável antes de mostrar o veículo.
  const [precisaAutorizar, setPrecisaAutorizar] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ausencia, setAusencia] = useState(false);
  const [appAtivo, setAppAtivo] = useState(AppState.currentState === 'active');
  const [, setTick] = useState(0);
  const viagemDiaRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!selecionado) {
      setLoading(false);
      return;
    }
    try {
      setErro(null);
      const data = await responsavelService.monitorar(selecionado);
      setMonitor(data);
      const vdId = data?.statusAtual?.viagemDiaId ?? null;
      viagemDiaRef.current = vdId;
      if (vdId) {
        const [exec, mot] = await Promise.all([
          viagemService.visualizarViagemDia(vdId).catch(() => null),
          viagemService.consultarMotorista(vdId).catch(() => null),
        ]);
        setExecucao(exec);
        setMotorista(mot);
      } else {
        setExecucao(null);
        setMotorista(null);
        setPosicao(null);
      }
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar o acompanhamento.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selecionado]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppAtivo(s === 'active'));
    return () => sub.remove();
  }, []);

  const emAndamento = execucao?.status === 'EM_ANDAMENTO';

  // Posição a cada 15 s, só com a tela em foco, app ativo e viagem em andamento (7.2.3–7.2.6).
  useEffect(() => {
    if (!emAndamento || !isFocused || !appAtivo || !viagemDiaRef.current) return undefined;
    let ativo = true;
    const buscar = async () => {
      const id = viagemDiaRef.current;
      if (!id) return;
      try {
        const p = await localizacaoService.posicaoAtual(id);
        if (!ativo) return;
        setPosicao(p);
        setPrecisaAutorizar(false);
        setGpsAviso(p ? null : 'Aguardando a primeira posição do veículo.');
      } catch (e) {
        if (!ativo) return;
        const st = getApiStatus(e);
        const texto = getApiErrorMessage(e, '');
        if (st === 409 && /^autorize/i.test(texto)) {
          setPrecisaAutorizar(true);
          setGpsAviso(null);
          return;
        }
        setPrecisaAutorizar(false);
        setGpsAviso(
          st === 404
            ? 'Aguardando a primeira posição do veículo.'
            : st === 409 || st === 503 || st === 403
              ? /motorista/i.test(texto)
                ? 'O motorista ainda não ativou o compartilhamento da localização.'
                : 'Localização indisponível para esta viagem.'
              : 'Não foi possível atualizar a localização. Tentaremos de novo em instantes.',
        );
      }
      // Atualiza status/presença junto com a posição.
      responsavelService.monitorar(selecionado!).then((m) => ativo && setMonitor(m)).catch(() => undefined);
    };
    buscar();
    const timer = setInterval(buscar, INTERVALO_GPS_MS);
    const relogio = setInterval(() => setTick((t) => t + 1), 10000);
    return () => {
      ativo = false;
      clearInterval(timer);
      clearInterval(relogio);
    };
  }, [emAndamento, isFocused, appAtivo, selecionado, autorizando]);

  // Linha de estações: não usa o Google, então segue atualizada mesmo sem mapa.
  useEffect(() => {
    if (!emAndamento || !isFocused || !appAtivo || !selecionado || !viagemDiaRef.current) {
      setLinha(null);
      return undefined;
    }
    let ativo = true;
    const buscar = () => {
      const id = viagemDiaRef.current;
      if (!id) return;
      localizacaoService
        .linha(id, selecionado)
        .then((l) => ativo && setLinha(l))
        .catch(() => ativo && setLinha(null));
    };
    buscar();
    const timer = setInterval(buscar, INTERVALO_GPS_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [emAndamento, isFocused, appAtivo, selecionado]);

  const autorizarLocalizacao = async () => {
    if (!selecionado) return;
    setAutorizando(true);
    try {
      await localizacaoService.consentirDependente(selecionado, true);
      setPrecisaAutorizar(false);
      setGpsAviso('Aguardando a primeira posição do veículo.');
    } catch (e) {
      setGpsAviso(getApiErrorMessage(e, 'Não foi possível autorizar agora. Tente de novo.'));
    } finally {
      // Muda a dependência do efeito acima, que busca a posição de novo na hora.
      setAutorizando(false);
    }
  };

  const aluno = dependentes.find((d) => d.id === selecionado);
  const atual = monitor?.statusAtual ?? null;
  const presenca = statusInfo('presenca', atual?.status);
  const viagemInfo = statusInfo('viagemDia', execucao?.status);
  // Rota e previsão (estilo Uber): só o trecho até a parada deste aluno. Rebusca a cada mudança de embarque.
  const rota = useRotaViagem(
    viagemDiaRef.current,
    emAndamento && !precisaAutorizar && !!posicao,
    null,
    `${selecionado}-${atual?.status ?? ''}`,
  );
  const alvo = rota?.disponivel ? rota.paradas.find((p) => p.dependenteId === selecionado) ?? null : null;
  const pontosMapa = alvo
    ? [{ latitude: alvo.latitude, longitude: alvo.longitude, titulo: alvo.rotulo, destaque: true, icone: alvo.tipoParada === 'ESCOLA' ? ('book-open' as const) : ('home' as const) }]
    : [];
  const linhaAtiva = emAndamento && (vistaLinha ?? (!alvo && !!linha));

  const historico = [...(monitor?.historicoRecente ?? [])].sort(
    (a, b) => new Date(b.ultimaAlteracao || b.data || 0).getTime() - new Date(a.ultimaAlteracao || a.data || 0).getTime(),
  );

  if (!dependentes.length) {
    return (
      <GuardianLayout>
        <StateView kind="empty" icon="users" title="Nenhum aluno cadastrado" message="Cadastre um aluno para acompanhar o transporte." actionLabel="Cadastrar aluno" onAction={() => navigation.navigate('GuardianDependentForm')} />
      </GuardianLayout>
    );
  }

  return (
    <GuardianLayout>
      {/* Topo fixo com o mapa (ou a linha) quando há viagem em andamento */}
      {emAndamento && (
        <View style={styles.mapaArea}>
          {linhaAtiva ? (
            <View style={styles.linhaArea}>
              {linha ? <LinhaResponsavel linha={linha} /> : <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Carregando a linha...</Text>}
            </View>
          ) : (
            <TripMap
              posicao={posicao ? { latitude: posicao.latitude, longitude: posicao.longitude } : null}
              ultimaAtualizacao={posicao?.recebidoEm}
              desatualizada={posicao?.desatualizada}
              mensagem={precisaAutorizar ? 'Autorize abaixo para ver a perua no mapa.' : gpsAviso ?? 'Aguardando a posição do veículo'}
              altura={ALTURA_MAPA}
              rota={alvo ? linhaDaRota(rota) : []}
              paradas={pontosMapa}
              modo="enquadrar"
            />
          )}
          <View style={styles.mapaChips} pointerEvents="box-none">
            <ChipAcao label={linhaAtiva ? 'Ver mapa' : 'Ver linha'} onPress={() => setVistaLinha(!linhaAtiva)} />
            {!linhaAtiva && viagemDiaRef.current && selecionado && (
              <ChipAcao
                label="Tela cheia"
                onPress={() => navigation.navigate('GuardianFullMap', { dependenteId: selecionado, viagemDiaId: viagemDiaRef.current })}
              />
            )}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <ScreenHeader title="Acompanhar" subtitle={aluno?.nome} onBack={() => navigation.goBack()} />

        {dependentes.length > 1 && (
          <ChoiceChips
            scroll
            options={dependentes.map((d) => ({ value: String(d.id), label: d.nome.split(' ')[0] }))}
            value={selecionado ? String(selecionado) : null}
            onChange={(v) => {
              setSelecionado(Number(v));
              setPosicao(null);
              setMonitor(null);
            }}
            accessibilityLabel="Aluno"
          />
        )}

        {loading ? (
          <StateView kind="loading" title="Carregando..." />
        ) : erro ? (
          <StateView kind="error" title="Não foi possível carregar" message={erro} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
        ) : (
          <>
            {/* card/status */}
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Chip label={execucao ? viagemInfo.label : 'Sem viagem agora'} tone={execucao ? viagemInfo.tone : 'neutral'} size="sm" />
                {atual && <Chip label={presenca.label} tone={presenca.tone} size="sm" />}
              </View>
              <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {!atual
                  ? 'Nenhuma viagem em andamento'
                  : atual.status === 'EMBARCADO'
                    ? `${aluno?.nome.split(' ')[0]} está no veículo`
                    : atual.status === 'DESEMBARCADO'
                      ? `${aluno?.nome.split(' ')[0]} desembarcou`
                      : atual.status === 'FALTOU'
                        ? 'Ausência registrada'
                        : 'Aguardando embarque'}
              </Text>
              {atual && (
                <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {[
                    atual.periodoViagem && periodoLabel(atual.periodoViagem),
                    atual.horarioEmbarque && `embarque ${formatTime(atual.horarioEmbarque)}`,
                    atual.horarioDesembarque && `desembarque ${formatTime(atual.horarioDesembarque)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Sem horários registrados ainda.'}
                </Text>
              )}
              {emAndamento && alvo && (
                <View style={styles.previsao}>
                  <Text style={styles.previsaoTempo} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {alvo.segundos < 60 ? 'Chegando agora' : `Chega em ${tempoAte(alvo.segundos)}`}
                  </Text>
                  <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {alvo.rotulo} · previsão {formatTime(alvo.previsaoChegada)} · {distancia(alvo.metros)}
                  </Text>
                </View>
              )}
              {emAndamento && !alvo && rota && !rota.disponivel && rota.mensagem && (
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{rota.mensagem}</Text>
              )}
              {emAndamento && posicao && (
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Última localização {formatRelative(posicao.recebidoEm)} ({formatTime(posicao.recebidoEm)})
                </Text>
              )}
            </Card>

            {emAndamento && precisaAutorizar && (
              <Card variant="alert" style={styles.autorizar}>
                <Text style={styles.autorizarTitulo} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Ver a perua no mapa
                </Text>
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Autorize o compartilhamento da localização do transporte deste aluno. A posição só aparece durante a
                  viagem em andamento, e você pode desligar quando quiser nos dados do aluno.
                </Text>
                <Button label="Permitir e ver no mapa" icon="map-pin" loading={autorizando} onPress={autorizarLocalizacao} fullWidth />
              </Card>
            )}
            {emAndamento && !precisaAutorizar && (posicao?.desatualizada || gpsAviso) && (
              <Notice tone="warning" title="Localização">
                {posicao?.desatualizada ? 'A localização está desatualizada. O veículo pode estar sem sinal.' : gpsAviso!}
              </Notice>
            )}
            {!atual && (
              <Notice tone="info">
                Quando o motorista iniciar a viagem, o estado do embarque e a localização aparecem aqui.
              </Notice>
            )}

            {motorista && (
              <Card style={styles.card}>
                <Text style={styles.sectionCardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Motorista</Text>
                <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>{motorista.nomeMotorista}</Text>
                <InfoLine label="Veículo" value={[motorista.modeloVeiculo, motorista.corVeiculo].filter(Boolean).join(' · ')} />
                <InfoLine label="Placa" value={motorista.placaVeiculo ? maskPlate(motorista.placaVeiculo) : null} />
                <InfoLine label="Telefone" value={motorista.telefone ? maskPhone(motorista.telefone) : null} />
              </Card>
            )}

            <View style={styles.actions}>
              <Button label="Avisar falta" icon="calendar" variant="secondary" onPress={() => setAusencia(true)} fullWidth />
              <Button label="Notificações da viagem" icon="bell" variant="tertiary" onPress={() => navigation.navigate('NotificationList')} fullWidth />
            </View>

            <SectionTitle>Eventos recentes</SectionTitle>
            {historico.length ? (
              historico.slice(0, 10).map((h, i) => {
                const s = statusInfo('presenca', h.status);
                return (
                  <Card key={`${h.viagemDiaId}-${i}`} style={styles.histCard}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                        {h.data ? formatDayShort(h.data) : formatDate(h.ultimaAlteracao)}
                        {h.periodoViagem ? ` · ${periodoLabel(h.periodoViagem)}` : ''}
                      </Text>
                      <Chip label={s.label} tone={s.tone} size="sm" />
                    </View>
                    <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {[h.horarioEmbarque && `Embarque ${formatTime(h.horarioEmbarque)}`, h.horarioDesembarque && `Desembarque ${formatTime(h.horarioDesembarque)}`]
                        .filter(Boolean)
                        .join(' · ') || 'Sem horários'}
                    </Text>
                  </Card>
                );
              })
            ) : (
              <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>Nenhum evento recente.</Text>
            )}

            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              A posição no mapa não confirma embarque. O embarque é confirmado pelo motorista.
            </Text>
          </>
        )}
      </ScrollView>

      {aluno?.id && (
        <AbsenceModal visible={ausencia} dependenteId={aluno.id} dependenteNome={aluno.nome} onClose={() => setAusencia(false)} />
      )}
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  mapaArea: { height: ALTURA_MAPA },
  linhaArea: { flex: 1, justifyContent: 'center', padding: spacing.md, paddingBottom: 64, backgroundColor: colors.surface },
  mapaChips: { position: 'absolute', bottom: spacing.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, zIndex: 10, elevation: 10 },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  chipTexto: { ...typography.captionBold, color: colors.ink },
  previsao: { gap: 2, paddingTop: spacing.xs },
  previsaoTempo: { ...typography.title, color: colors.ink },
  autorizar: { gap: spacing.sm },
  autorizarTitulo: { ...typography.heading, color: colors.ink },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 800, alignSelf: 'center', gap: spacing.lg },
  card: { gap: spacing.sm },
  histCard: { gap: spacing.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.title, color: colors.ink },
  sectionCardTitle: { ...typography.captionBold, color: colors.slate500 },
  name: { ...typography.label, color: colors.ink, flexShrink: 1 },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
  actions: { gap: layout.buttonGap },
});
