import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import ReasonDialog from '../components/ReasonDialog';
import Timeline from '../components/Timeline';
import { Notice, PendingIssue, PendingIssuesList } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, Chip, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { useConnectivity } from '../context/ConnectivityContext';
import { periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { localizacaoService } from '../services/localizacaoService';
import {
  EstadoConsentimentoLocalizacaoDTO,
  HistoricoViagemDiaDTO,
  MotoristaDTO,
  ParadaViagemDTO,
  ProntidaoViagemDTO,
  ViagemDTO,
  ViagemDiaDTO,
} from '../types';
import { statusExecucao, statusInfo } from '../utils/statusLabels';
import { formatDateTime, formatDayRelative, todayIso } from '../utils/format';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverTripDay'>;

const TIPO_PARADA: Record<string, string> = { MOTORISTA: 'Ponto do motorista', RESPONSAVEL: 'Aluno', ESCOLA: 'Escola' };

/** Converte os bloqueios de prontidão do backend em pendências com caminho de correção (5.5.5–5.5.6). */
const toIssues = (bloqueios: string[], navigate: (route: keyof RootStackParamList) => void): PendingIssue[] =>
  bloqueios.map((texto, i) => {
    const key = `${i}-${texto}`;
    if (/CNH|vistoria|licenciamento|documento/i.test(texto)) {
      return { key, text: texto, actionLabel: 'Documentos', onPress: () => navigate('DriverDocuments') };
    }
    if (/ve[ií]culo|capacidade/i.test(texto)) {
      return { key, text: texto, actionLabel: 'Veículo', onPress: () => navigate('DriverVehicle') };
    }
    if (/v[ií]nculo operacional|escola/i.test(texto) && !/Dependente/i.test(texto)) {
      return { key, text: texto, actionLabel: 'Escolas', onPress: () => navigate('DriverSchools') };
    }
    if (/endere[cç]o estruturado do motorista/i.test(texto)) {
      return { key, text: texto, actionLabel: 'Perfil', onPress: () => navigate('DriverProfile') };
    }
    if (/Dependente/i.test(texto)) {
      return { key, text: texto, actionLabel: 'Avisar responsável', onPress: () => navigate('NotificationCreate') };
    }
    return { key, text: texto };
  });

/** 5.5, 5.6 e 5.10 — viagem de uma data: preparar, revisar, iniciar ou cancelar. */
export default function DriverTripDayScreen({ navigation, route }: Props) {
  const { viagemId, data } = route.params;
  const { currentUser, showToast, setActiveViagemDia, setCurrentStops } = useAppContext();
  const { online } = useConnectivity();
  const driver = currentUser as MotoristaDTO;
  const capacidade = driver?.veiculoDTO?.capacidade ?? 0;

  const [viagemDiaId, setViagemDiaId] = useState<number | null>(route.params.viagemDiaId ?? null);
  const [viagem, setViagem] = useState<ViagemDTO | null>(null);
  const [execucao, setExecucao] = useState<ViagemDiaDTO | null>(null);
  const [paradas, setParadas] = useState<ParadaViagemDTO[]>([]);
  const [prontidao, setProntidao] = useState<ProntidaoViagemDTO | null>(null);
  const [consent, setConsent] = useState<EstadoConsentimentoLocalizacaoDTO | null>(null);
  const [historico, setHistorico] = useState<HistoricoViagemDiaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  const [cancelar, setCancelar] = useState(false);

  const load = useCallback(async () => {
    try {
      setErro(null);
      const [v, p] = await Promise.all([viagemService.visualizar(viagemId), viagemService.prontidao(viagemId)]);
      setViagem(v);
      setProntidao(p);
      if (viagemDiaId) {
        const [exec, stops, hist] = await Promise.all([
          viagemService.visualizarViagemDia(viagemDiaId),
          viagemService.buscarParadasViagemDia(viagemDiaId).catch(() => [] as ParadaViagemDTO[]),
          viagemService.historicoStatus(viagemDiaId).catch(() => [] as HistoricoViagemDiaDTO[]),
        ]);
        setExecucao(exec);
        setParadas(stops);
        setHistorico([...hist].sort((a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime()));
        localizacaoService.estadoConsentimento(viagemDiaId).then(setConsent).catch(() => setConsent(null));
      }
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar a viagem.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viagemId, viagemDiaId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const status = execucao?.status ?? null;
  const bloqueios = prontidao?.bloqueios ?? [];
  const avisos = prontidao?.avisos ?? [];
  const alunos = viagem?.dependentes?.length ?? 0;
  const info = statusExecucao(status, { materializada: !!viagemDiaId, pronta: prontidao?.pronta });
  const ehHoje = data === todayIso();

  const preparar = async () => {
    setBusy(true);
    try {
      const exec = await viagemService.prepararViagemDia(viagemId, data);
      setViagemDiaId(exec.id ?? null);
      navigation.setParams({ viagemDiaId: exec.id ?? null });
      showToast('Viagem preparada. Revise as paradas antes de iniciar.', 'success');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível preparar a viagem.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const iniciar = async () => {
    if (!viagemDiaId) return;
    setBusy(true);
    try {
      const exec = await viagemService.alterarStatusViagemDia(viagemDiaId, 'EM_ANDAMENTO');
      const stops = await viagemService.buscarParadasViagemDia(viagemDiaId);
      setActiveViagemDia({ ...exec, viagemId });
      setCurrentStops(stops);
      setConfirmStart(false);
      showToast('Viagem iniciada. Os responsáveis foram avisados.', 'success');
      navigation.navigate('DriverAttendance', { viagemDiaId });
    } catch (e) {
      setConfirmStart(false);
      showToast(getApiErrorMessage(e, 'Não foi possível iniciar a viagem.'), 'error');
      load();
    } finally {
      setBusy(false);
    }
  };

  // Antes de iniciar: se o motorista ainda não autorizou o GPS, oferece autorizar (não é obrigatório para iniciar).
  const pedirInicio = () => {
    if (consent && !consent.motoristaConsentiu && !consent.gpsSuspenso) setAskConsent(true);
    else setConfirmStart(true);
  };

  const responderConsent = async (aceito: boolean) => {
    if (aceito) {
      try {
        await localizacaoService.consentirMotorista(true);
        if (viagemDiaId) localizacaoService.estadoConsentimento(viagemDiaId).then(setConsent).catch(() => undefined);
      } catch (e) {
        showToast(
          getApiStatus(e) === 503 ? 'Localização desativada no servidor. A viagem segue sem GPS.' : getApiErrorMessage(e, 'Não foi possível salvar a autorização.'),
          'warning',
        );
      }
    }
    setAskConsent(false);
    setConfirmStart(true);
  };

  const confirmarCancelamento = async (motivo: string) => {
    if (!viagemDiaId) return;
    setBusy(true);
    try {
      await viagemService.alterarStatusViagemDia(viagemDiaId, 'CANCELADA', motivo);
      showToast('Viagem do dia cancelada. Os responsáveis foram avisados.', 'success');
      setCancelar(false);
      load();
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível cancelar a viagem.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const abrirExecucao = async () => {
    if (!viagemDiaId || !execucao) return;
    setActiveViagemDia({ ...execucao, viagemId });
    setCurrentStops(paradas);
    navigation.navigate('DriverAttendance', { viagemDiaId });
  };

  if (loading) {
    return (
      <DriverLayout>
        <StateView kind="loading" title="Carregando viagem..." />
      </DriverLayout>
    );
  }
  if (erro || !viagem) {
    return (
      <DriverLayout>
        <StateView kind="error" title="Não foi possível carregar" message={erro ?? undefined} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
      </DriverLayout>
    );
  }

  const consentTexto = !consent
    ? null
    : consent.gpsSuspenso
      ? { tone: 'danger' as const, text: 'GPS suspenso nesta viagem: um responsável revogou a autorização. A presença continua funcionando.' }
      : !consent.motoristaConsentiu
        ? { tone: 'warning' as const, text: 'Você ainda não autorizou o envio da sua localização.' }
        : consent.dependentesPendentes.length
          ? { tone: 'warning' as const, text: `Aguardando autorização de responsáveis de ${consent.dependentesPendentes.length} aluno(s). Sem ela, o GPS fica desligado.` }
          : { tone: 'success' as const, text: 'GPS autorizado: a localização será enviada durante a viagem.' };

  return (
    <DriverLayout>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <ScreenHeader title={viagemNome(viagem)} subtitle={`${periodoLabel(viagem.periodo)} · ${formatDayRelative(data)}`} onBack={() => navigation.goBack()} />

        {/* Resumo (5.5.1–5.5.3) */}
        <Card style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Resumo</Text>
            <Chip label={info.label} tone={info.tone} size="sm" />
          </View>
          <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {alunos} aluno(s) · {capacidade ? `${alunos} de ${capacidade} lugares` : 'capacidade não informada'}
          </Text>
          {capacidade > 0 && alunos > capacidade && (
            <Notice tone="danger">A quantidade de alunos excede a capacidade do veículo.</Notice>
          )}
          {!!viagem.escolas?.length && (
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Escolas: {viagem.escolas.map((e) => e.nome).join(', ')}
            </Text>
          )}
        </Card>

        {/* Pendências (5.5.4–5.5.6) */}
        {status !== 'FINALIZADA' && status !== 'CANCELADA' && status !== 'INTERROMPIDA' && (
          bloqueios.length ? (
            <PendingIssuesList issues={toIssues(bloqueios, (r) => navigation.navigate(r as any))} />
          ) : (
            <Notice tone="success">Nenhuma pendência: veículo, alunos e endereços estão em ordem.</Notice>
          )
        )}
        {/* Avisos que não impedem iniciar: documentos do motorista ainda não têm como ser validados. */}
        {status !== 'FINALIZADA' && status !== 'CANCELADA' && status !== 'INTERROMPIDA' && avisos.length > 0 && (
          <PendingIssuesList
            title="Para regularizar (não impede iniciar)"
            issues={toIssues(avisos, (r) => navigation.navigate(r as any))}
          />
        )}

        {/* Preparação */}
        {!viagemDiaId ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Viagem ainda não preparada</Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Preparar gera as paradas a partir dos endereços dos alunos e das escolas. Depois você pode ajustar a ordem.
            </Text>
            <Button label={`Preparar viagem de ${formatDayRelative(data).toLowerCase()}`} icon="clipboard" onPress={preparar} loading={busy} disabled={!online} fullWidth />
            {!online && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Disponível apenas com conexão.</Text>}
          </Card>
        ) : (
          <>
            {/* Paradas (5.3 / 5.5.2) */}
            <SectionTitle>{`Paradas (${paradas.length})`}</SectionTitle>
            <Card style={styles.card}>
              {paradas.length ? (
                paradas.map((p, i) => (
                  <View key={`${p.id ?? i}-${p.ordem}`} style={[styles.stop, i > 0 && styles.divider]}>
                    <View style={styles.order}>
                      <Text style={styles.orderText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{i + 1}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.stopTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{p.nomeLocal || TIPO_PARADA[p.tipoParada]}</Text>
                      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{p.endereco}</Text>
                      {p.listaDependentes.length > 0 && (
                        <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                          {p.listaDependentes.map((d) => d.nomeDependente).join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Sem paradas. Verifique se os alunos têm endereço cadastrado.
                </Text>
              )}
              {(status === 'PLANEJADA' || status === 'EM_ANDAMENTO') && paradas.length > 2 && (
                <Button
                  label="Alterar ordem das paradas"
                  icon="shuffle"
                  variant="secondary"
                  size="md"
                  onPress={() => navigation.navigate('DriverRouteOrder', { viagemDiaId, emExecucao: status === 'EM_ANDAMENTO' })}
                  disabled={!online}
                  fullWidth
                />
              )}
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Cálculo automático de rota indisponível nesta versão: a ordem é definida por você.
              </Text>
            </Card>

            {consentTexto && (status === 'PLANEJADA' || status === 'EM_ANDAMENTO') && (
              <Notice tone={consentTexto.tone} title="Localização">
                {consentTexto.text}
              </Notice>
            )}

            {/* Ações (5.6 e 5.10) */}
            <View style={styles.actions}>
              {status === 'PLANEJADA' && (
                <>
                  {!ehHoje && <Notice tone="info">A viagem só pode ser iniciada no dia programado.</Notice>}
                  <Button
                    label="Iniciar viagem"
                    icon="play"
                    onPress={pedirInicio}
                    disabled={!online || !ehHoje || bloqueios.length > 0}
                    fullWidth
                  />
                  {!online && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Iniciar exige conexão.</Text>}
                  <Button label="Cancelar viagem do dia" icon="x-circle" variant="tertiary" onPress={() => setCancelar(true)} disabled={!online} fullWidth />
                </>
              )}
              {status === 'EM_ANDAMENTO' && (
                <Button label="Abrir viagem em andamento" icon="navigation" onPress={abrirExecucao} fullWidth />
              )}
            </View>

            {historico.length > 0 && (
              <>
                <SectionTitle>Histórico</SectionTitle>
                <Card>
                  <Timeline
                    items={historico.map((h) => {
                      const s = statusInfo('viagemDia', h.statusNovo);
                      return { key: h.id, title: s.label, caption: formatDateTime(h.ocorridoEm), detail: h.motivo, tone: s.tone };
                    })}
                  />
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={askConsent}
        title="Compartilhar sua localização?"
        message="Durante a viagem, sua posição é enviada a cada 15 segundos para os responsáveis dos alunos e guardada por 7 dias. Você pode revogar depois em Configurações."
        confirmLabel="Autorizar"
        cancelLabel="Agora não"
        destructive={false}
        onConfirm={() => responderConsent(true)}
        onCancel={() => responderConsent(false)}
      />
      <ConfirmDialog
        visible={confirmStart}
        title="Iniciar viagem agora?"
        message="O horário de início será registrado e os responsáveis serão avisados."
        confirmLabel="Iniciar viagem"
        cancelLabel="Voltar"
        destructive={false}
        loading={busy}
        onConfirm={iniciar}
        onCancel={() => setConfirmStart(false)}
      />
      <ReasonDialog
        visible={cancelar}
        title="Cancelar a viagem do dia?"
        message="Cancelar: a viagem não vai acontecer nesta data. Os responsáveis serão avisados com o motivo."
        confirmLabel="Cancelar viagem"
        loading={busy}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCancelar(false)}
      />
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 800, alignSelf: 'center', gap: spacing.lg },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
  stop: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  order: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  orderText: { ...typography.captionBold, color: colors.surface },
  stopTitle: { ...typography.label, color: colors.ink },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  actions: { gap: layout.buttonGap },
});
