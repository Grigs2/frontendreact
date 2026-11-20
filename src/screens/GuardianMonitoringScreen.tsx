import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAreaToque, useNivelMapa } from '../hooks/useNivelMapa';
import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import GuardianLayout from '../components/GuardianLayout';
import TripMap from '../components/TripMap';
import AbsenceModal from '../components/AbsenceModal';
import ChoiceChips from '../components/ChoiceChips';
import { InfoLine, Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, Chip, StateView } from '../components/ui';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel, viagemService } from '../services/viagemService';
import { INTERVALO_GPS_MS, localizacaoService } from '../services/localizacaoService';
import { LocalizacaoViagemDTO, MonitoramentoDTO, MotoristaViagemDTO, ParadaViagemDTO, ResponsavelDTO, ViagemDiaDTO } from '../types';
import MetroProgressMap from '../components/MetroProgressMap';
import { ProximaInteracaoBox } from '../components/TripProgress';
import { calcularProgresso } from '../utils/progressoViagem';
import { statusInfo } from '../utils/statusLabels';
import { formatDate, formatDayShort, formatRelative, formatTime } from '../utils/format';
import { maskPlate, maskPhone } from '../utils/masks';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

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
  const [paradas, setParadas] = useState<ParadaViagemDTO[]>([]);
  const [gpsAviso, setGpsAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ausencia, setAusencia] = useState(false);
  const [appAtivo, setAppAtivo] = useState(AppState.currentState === 'active');
  const [, setTick] = useState(0);
  const viagemDiaRef = useRef<number | null>(null);
  const insets = useSafeAreaInsets();
  // Mapa: 1 pequeno (topo), 2 tela cheia. Toque no mapa amplia; toque fora do mapa (sem botão) reduz.
  const { nivel: nivelMapa, setNivel: setNivelMapa, ampliar: ampliarMapa, reduzir: reduzirMapa } = useNivelMapa(1, 1);
  const areaFora = useAreaToque({ onToque: reduzirMapa });

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
        const [exec, mot, par] = await Promise.all([
          viagemService.visualizarViagemDia(vdId).catch(() => null),
          viagemService.consultarMotorista(vdId).catch(() => null),
          viagemService.buscarParadasViagemDia(vdId).catch(() => [] as ParadaViagemDTO[]),
        ]);
        setExecucao(exec);
        setMotorista(mot);
        setParadas(Array.isArray(par) ? par : []);
      } else {
        setExecucao(null);
        setMotorista(null);
        setPosicao(null);
        setParadas([]);
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
        setGpsAviso(p ? null : 'Aguardando a primeira posição do veículo.');
      } catch (e) {
        if (!ativo) return;
        const st = getApiStatus(e);
        setGpsAviso(
          st === 404
            ? 'Aguardando a primeira posição do veículo.'
            : st === 409 || st === 503 || st === 403
              ? 'Localização indisponível para esta viagem.'
              : 'Não foi possível atualizar a localização. Tentaremos de novo em instantes.',
        );
      }
      // Atualiza status/presença e o progresso das paradas junto com a posição.
      responsavelService.monitorar(selecionado!).then((m) => ativo && setMonitor(m)).catch(() => undefined);
      viagemService
        .buscarParadasViagemDia(id)
        .then((par) => ativo && Array.isArray(par) && setParadas(par))
        .catch(() => undefined);
    };
    buscar();
    const timer = setInterval(buscar, INTERVALO_GPS_MS);
    const relogio = setInterval(() => setTick((t) => t + 1), 10000);
    return () => {
      ativo = false;
      clearInterval(timer);
      clearInterval(relogio);
    };
  }, [emAndamento, isFocused, appAtivo, selecionado]);

  const aluno = dependentes.find((d) => d.id === selecionado);
  const atual = monitor?.statusAtual ?? null;
  const presenca = statusInfo('presenca', atual?.status);
  const viagemInfo = statusInfo('viagemDia', execucao?.status);
  const historico = [...(monitor?.historicoRecente ?? [])].sort(
    (a, b) => new Date(b.ultimaAlteracao || b.data || 0).getTime() - new Date(a.ultimaAlteracao || a.data || 0).getTime(),
  );
  const periodo = execucao?.periodo ?? execucao?.viagem?.periodo ?? atual?.periodoViagem ?? null;
  const progresso =
    selecionado && paradas.length
      ? calcularProgresso({
          paradas,
          dependenteId: selecionado,
          dependenteNome: aluno?.nome,
          periodo,
          statusViagem: execucao?.status ?? null,
          ultimosEventos: [execucao?.dataUltimaAlteracaoStatus, execucao?.ultimaAlteracao, atual?.ultimaAlteracao],
        })
      : null;
  const proxima = emAndamento ? progresso?.proxima ?? null : null;
  const destaque = proxima?.paradasAntes === 0;
  // Sem posição (GPS desligado, sem consentimento ou sem sinal): o mapa dá lugar à linha de metrô.
  const semLocalizacao = emAndamento && !posicao && !!progresso;
  const motivoSemLocalizacao = gpsAviso?.startsWith('Aguardando') ? 'Aguardando a localização' : 'Localização indisponível';

  if (!dependentes.length) {
    return (
      <GuardianLayout>
        <StateView kind="empty" icon="users" title="Nenhum aluno cadastrado" message="Cadastre um aluno para acompanhar o transporte." actionLabel="Cadastrar aluno" onAction={() => navigation.navigate('GuardianDependentForm')} />
      </GuardianLayout>
    );
  }

  const tituloStatus = !atual
    ? 'Nenhuma viagem em andamento'
    : atual.status === 'EMBARCADO'
      ? `${aluno?.nome.split(' ')[0]} está no veículo`
      : atual.status === 'DESEMBARCADO'
        ? `${aluno?.nome.split(' ')[0]} desembarcou`
        : atual.status === 'FALTOU'
          ? 'Ausência registrada'
          : 'Aguardando embarque';
  const posicaoMapa = posicao ? { latitude: posicao.latitude, longitude: posicao.longitude } : null;

  return (
    <GuardianLayout>
      <View style={styles.flex}>
      {/* Tela cheia: mapa inteiro, card flutuante embaixo. Tocar no card (fora dos botões) reduz o mapa. */}
      {emAndamento && nivelMapa === 2 && (
        <View style={styles.telaCheia}>
          {semLocalizacao && progresso ? (
            <View style={[styles.flex, { paddingTop: insets.top + layout.minTouch + spacing.lg }]}>
              <MetroProgressMap preencher paradas={progresso.paradas} indiceAtual={progresso.indiceAtual} motivo={motivoSemLocalizacao} />
            </View>
          ) : (
            <TripMap
              preencher
              posicao={posicaoMapa}
              ultimaAtualizacao={posicao?.recebidoEm}
              desatualizada={posicao?.desatualizada}
              mensagem={gpsAviso ?? 'Aguardando a posição do veículo'}
            />
          )}
          <View style={[styles.telaCheiaTopo, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
            <Button size="icon" variant="secondary" icon="arrow-left" accessibilityLabel="Reduzir mapa" onPress={() => setNivelMapa(1)} />
          </View>
          <View style={[styles.cardFlutuante, { bottom: insets.bottom + spacing.md }]} {...areaFora.panHandlers}>
            <View style={styles.rowBetween}>
              <Chip label={execucao ? viagemInfo.label : 'Sem viagem agora'} tone={execucao ? viagemInfo.tone : 'neutral'} size="sm" />
              <Pressable onPress={() => setNivelMapa(1)} accessibilityRole="button" accessibilityLabel="Reduzir mapa" style={styles.chipAcao}>
                <Text style={styles.chipAcaoTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>Reduzir mapa</Text>
              </Pressable>
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{tituloStatus}</Text>
            {proxima && <ProximaInteracaoBox proxima={proxima} />}
            {posicao && (
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Última localização {formatRelative(posicao.recebidoEm)} ({formatTime(posicao.recebidoEm)})
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Topo fixo: mapa ao vivo, ou a linha de metrô quando não há localização. Tocar amplia para tela cheia. */}
      {emAndamento &&
        (semLocalizacao && progresso ? (
          <MetroProgressMap
            paradas={progresso.paradas}
            indiceAtual={progresso.indiceAtual}
            motivo={motivoSemLocalizacao}
            altura={260}
            onPress={ampliarMapa}
          />
        ) : (
          <TripMap
            posicao={posicaoMapa}
            ultimaAtualizacao={posicao?.recebidoEm}
            desatualizada={posicao?.desatualizada}
            mensagem={gpsAviso ?? 'Aguardando a posição do veículo'}
            altura={220}
            onPress={ampliarMapa}
          />
        ))}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Topo: só voltar e a escolha do aluno (sem título), com espaço para o sino quando não há mapa. */}
        <View style={[styles.topo, !emAndamento && styles.topoComSino]}>
          <Button variant="tertiary" size="icon" icon="arrow-left" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.voltar} />
          {dependentes.length > 1 && (
            <View style={styles.flex}>
              <ChoiceChips
                scroll
                options={dependentes.map((d) => ({ value: String(d.id), label: d.nome.split(' ')[0] }))}
                value={selecionado ? String(selecionado) : null}
                onChange={(v) => {
                  setSelecionado(Number(v));
                  setPosicao(null);
                  setMonitor(null);
                  setParadas([]);
                }}
                accessibilityLabel="Aluno"
              />
            </View>
          )}
        </View>

        {loading ? (
          <StateView kind="loading" title="Carregando..." />
        ) : erro ? (
          <StateView kind="error" title="Não foi possível carregar" message={erro} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
        ) : (
          <>
            {/* card/status — destacado quando o próximo evento da viagem é com o aluno */}
            <Card style={[styles.card, destaque && styles.cardDestaque]}>
              <View style={styles.rowBetween}>
                <Chip label={execucao ? viagemInfo.label : 'Sem viagem agora'} tone={execucao ? viagemInfo.tone : 'neutral'} size="sm" />
                {atual && <Chip label={presenca.label} tone={presenca.tone} size="sm" />}
              </View>
              <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{tituloStatus}</Text>
              {proxima && <ProximaInteracaoBox proxima={proxima} />}
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
              {emAndamento && posicao && (
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Última localização {formatRelative(posicao.recebidoEm)} ({formatTime(posicao.recebidoEm)})
                </Text>
              )}
            </Card>

            {emAndamento && (posicao?.desatualizada || gpsAviso) && (
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
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  telaCheia: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, elevation: 20, backgroundColor: colors.surface },
  telaCheiaTopo: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.screenMargin, zIndex: 30, elevation: 30 },
  cardFlutuante: {
    position: 'absolute',
    left: layout.screenMargin,
    right: layout.screenMargin,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    gap: spacing.sm,
    zIndex: 30,
    elevation: 30,
  },
  chipAcao: { minHeight: layout.minTouch, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: borders.hairline, borderColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: spacing.md },
  chipAcaoTexto: { ...typography.captionBold, color: colors.ink },
  cardDestaque: { borderColor: colors.primary, borderWidth: borders.alert },
  topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topoComSino: { paddingRight: layout.bellReserve },
  // Mesmo recuo do botão voltar do ScreenHeader.
  voltar: { marginLeft: -spacing.md },
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
