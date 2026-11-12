import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { useConnectivity } from '../context/ConnectivityContext';
import DriverLayout from '../components/DriverLayout';
import TripMap from '../components/TripMap';
import ConfirmDialog from '../components/ConfirmDialog';
import ReasonDialog from '../components/ReasonDialog';
import ChoiceChips from '../components/ChoiceChips';
import Timeline from '../components/Timeline';
import { Notice, ProgressBar } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { viagemService } from '../services/viagemService';
import { authSession } from '../services/authSession';
import { offlineQueue, podeRegistrarOffline } from '../services/offlineQueue';
import { MENSAGEM_GPS, useDriverLocation } from '../hooks/useDriverLocation';
import {
  DependenteParadaDTO,
  HistoricoViagemDiaDTO,
  HistoricoViagemPresencaDTO,
  ParadaViagemDTO,
  StatusViagemPresenca,
  ViagemDiaDTO,
} from '../types';
import { statusInfo } from '../utils/statusLabels';
import { formatDateTime, formatTime } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverAttendance'>;
type Marca = 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU';

const ACAO: Record<Marca, { titulo: string; confirmar: string; ok: string }> = {
  EMBARCADO: { titulo: 'Confirmar embarque', confirmar: 'Confirmar embarque', ok: 'embarque registrado' },
  DESEMBARCADO: { titulo: 'Confirmar desembarque', confirmar: 'Confirmar desembarque', ok: 'desembarque registrado' },
  FALTOU: { titulo: 'Registrar ausência', confirmar: 'Registrar ausência', ok: 'ausência registrada' },
};

const TERMINAL = ['FINALIZADA', 'CANCELADA', 'INTERROMPIDA'];

/** Aplica sobre as paradas os registros feitos sem conexão (ainda não enviados). */
const aplicarLocais = (stops: ParadaViagemDTO[], locais: Record<number, StatusViagemPresenca>) =>
  Object.keys(locais).length
    ? stops.map((s) => ({
        ...s,
        listaDependentes: s.listaDependentes.map((d) => (locais[d.id] ? { ...d, statusEmbarque: locais[d.id] } : d)),
      }))
    : stops;

/**
 * 5.7, 5.9, 5.10, 6.x, 7.1 e 8.2 — execução da viagem do dia.
 * Topo fixo com mapa/status; paradas e chamada roláveis; presença registrada mesmo sem conexão.
 */
export default function DriverAttendanceScreen({ route, navigation }: Props) {
  const { activeViagemDia, setActiveViagemDia, currentStops, setCurrentStops, showToast } = useAppContext();
  const { online, pendentes, problemas, sincronizar, descartar, marcarFalhaDeRede } = useConnectivity();
  const viagemDiaId = route.params?.viagemDiaId || activeViagemDia?.id;
  const usuarioId = authSession.getPerfil()?.usuarioId ?? null;

  const [execucao, setExecucao] = useState<ViagemDiaDTO | null>(activeViagemDia);
  const [locais, setLocais] = useState<Record<number, StatusViagemPresenca>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState<{ aluno: DependenteParadaDTO; novo: Marca } | null>(null);
  const [detalhe, setDetalhe] = useState<{ aluno: DependenteParadaDTO; parada: ParadaViagemDTO } | null>(null);
  const [motivoPara, setMotivoPara] = useState<'CANCELADA' | 'INTERROMPIDA' | null>(null);
  const [confirmarFim, setConfirmarFim] = useState(false);
  const [updatingTrip, setUpdatingTrip] = useState(false);
  const [eventosAbertos, setEventosAbertos] = useState(false);
  const [eventos, setEventos] = useState<{ presenca: HistoricoViagemPresencaDTO[]; status: HistoricoViagemDiaDTO[] } | null>(null);
  const [atrasoAberto, setAtrasoAberto] = useState(false);
  const [atrasoMin, setAtrasoMin] = useState('15');
  const [atrasoMotivo, setAtrasoMotivo] = useState('');
  const [enviandoAtraso, setEnviandoAtraso] = useState(false);
  const loadingRef = useRef(false);

  const status = execucao?.status ?? 'PLANEJADA';
  const encerrada = TERMINAL.includes(status);
  const emAndamento = status === 'EM_ANDAMENTO';

  // GPS só com a execução em andamento (7.1.3 / 7.1.9).
  const gps = useDriverLocation(viagemDiaId, emAndamento);

  const atualizarLocais = useCallback(async () => {
    if (!usuarioId || !viagemDiaId) return {};
    const mapa = await offlineQueue.statusLocal(usuarioId, viagemDiaId);
    setLocais(mapa);
    return mapa;
  }, [usuarioId, viagemDiaId]);

  const load = useCallback(
    async (silent = false) => {
      if (!viagemDiaId || loadingRef.current) return;
      loadingRef.current = true;
      if (!silent) setRefreshing(true);
      try {
        const [exec, stops] = await Promise.all([
          viagemService.visualizarViagemDia(viagemDiaId),
          viagemService.buscarParadasViagemDia(viagemDiaId),
        ]);
        setExecucao(exec);
        setActiveViagemDia({ ...activeViagemDia, ...exec });
        const mapa = await atualizarLocais();
        setCurrentStops(aplicarLocais(stops, mapa));
      } catch (error: any) {
        if (!error?.response) {
          marcarFalhaDeRede();
          const mapa = await atualizarLocais();
          setCurrentStops(aplicarLocais(currentStops, mapa));
        } else {
          showToast(getApiErrorMessage(error, 'Não foi possível carregar a viagem.'), 'error');
        }
      } finally {
        setRefreshing(false);
        loadingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viagemDiaId, atualizarLocais],
  );

  useFocusEffect(
    useCallback(() => {
      if (!viagemDiaId) {
        showToast('Nenhuma viagem em andamento. Escolha uma viagem em Rotas.', 'info');
        navigation.navigate('DriverTrips');
        return;
      }
      load();
    }, [viagemDiaId, load, navigation, showToast]),
  );

  // Depois que a fila envia registros (8.3.6), recarrega o estado confirmado pelo servidor.
  const pendentesAntes = useRef(pendentes);
  useEffect(() => {
    if (pendentes < pendentesAntes.current && online) load(true);
    pendentesAntes.current = pendentes;
  }, [pendentes, online, load]);

  const registrarOffline = async (aluno: DependenteParadaDTO, novo: Marca) => {
    if (!usuarioId || !viagemDiaId) return false;
    if (!emAndamento || !podeRegistrarOffline(aluno.statusEmbarque, novo)) {
      showToast('Sem conexão: este registro só pode ser feito online.', 'warning');
      return false;
    }
    await offlineQueue.enfileirar(usuarioId, viagemDiaId, aluno.id, aluno.statusEmbarque, novo);
    const mapa = await atualizarLocais();
    setCurrentStops(aplicarLocais(currentStops, mapa));
    // 8.2.5: não afirmar que o servidor recebeu.
    showToast('Registro salvo neste aparelho. Será enviado quando a conexão voltar.', 'warning');
    return true;
  };

  const marcar = async () => {
    if (!confirmar || !viagemDiaId) return;
    const { aluno, novo } = confirmar;
    setSubmitting(aluno.id);
    try {
      if (!online || pendentes > 0) {
        // Com eventos na fila, o novo também entra nela para manter a ordem.
        await registrarOffline(aluno, novo);
      } else {
        const stops = await viagemService.alterarStatusPresenca(viagemDiaId, aluno.id, novo);
        if (Array.isArray(stops)) setCurrentStops(aplicarLocais(stops, locais));
        showToast(`${aluno.nomeDependente.split(' ')[0]}: ${ACAO[novo].ok}. Responsáveis avisados.`, 'success');
      }
      setConfirmar(null);
    } catch (error: any) {
      if (!error?.response) {
        marcarFalhaDeRede();
        if (await registrarOffline(aluno, novo)) setConfirmar(null);
      } else {
        showToast(getApiErrorMessage(error, 'Não foi possível registrar. Nada foi alterado.'), 'error');
        setConfirmar(null);
        load(true);
      }
    } finally {
      setSubmitting(null);
    }
  };

  const alterarViagem = async (novo: 'FINALIZADA' | 'CANCELADA' | 'INTERROMPIDA', motivo?: string) => {
    if (!viagemDiaId) return;
    setUpdatingTrip(true);
    try {
      if (novo === 'FINALIZADA' && pendentes > 0) {
        // 5.9: envia os registros guardados antes de encerrar.
        await sincronizar();
      }
      const updated = await viagemService.alterarStatusViagemDia(viagemDiaId, novo, motivo);
      setExecucao(updated);
      setActiveViagemDia(null);
      setMotivoPara(null);
      setConfirmarFim(false);
      showToast(`Viagem ${statusInfo('viagemDia', novo).label.toLowerCase()}. Os responsáveis foram avisados.`, 'success');
      if (novo === 'FINALIZADA') navigation.navigate('DriverTrips');
      else load(true);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível alterar a viagem.'), 'error');
    } finally {
      setUpdatingTrip(false);
    }
  };

  const abrirEventos = async () => {
    if (eventosAbertos) {
      setEventosAbertos(false);
      return;
    }
    setEventosAbertos(true);
    if (!viagemDiaId) return;
    const [presenca, statusHist] = await Promise.all([
      viagemService.historicoPresenca(viagemDiaId).catch(() => [] as HistoricoViagemPresencaDTO[]),
      viagemService.historicoStatus(viagemDiaId).catch(() => [] as HistoricoViagemDiaDTO[]),
    ]);
    setEventos({ presenca, status: statusHist });
  };

  const enviarAtraso = async () => {
    if (!viagemDiaId) return;
    const minutos = Number(atrasoMin);
    setEnviandoAtraso(true);
    try {
      await viagemService.avisarAtraso(viagemDiaId, minutos, atrasoMotivo);
      showToast('Responsáveis avisados do atraso.', 'success');
      setAtrasoAberto(false);
      setAtrasoMotivo('');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível avisar o atraso.'), 'error');
    } finally {
      setEnviandoAtraso(false);
    }
  };

  // Resumo, progresso e próxima parada (5.7.2, 5.7.9)
  const alunos = Array.from(new Map(currentStops.flatMap((s) => s.listaDependentes).map((a) => [a.id, a])).values());
  const concluidos = alunos.filter((a) => a.statusEmbarque === 'DESEMBARCADO' || a.statusEmbarque === 'FALTOU').length;
  const pendentesFim = alunos.filter((a) => a.statusEmbarque === 'ESPERANDO' || a.statusEmbarque === 'EMBARCADO');
  const proxima = currentStops.find((s) =>
    s.listaDependentes.some((d) =>
      s.tipoParada === 'ESCOLA' ? d.statusEmbarque === 'EMBARCADO' : d.statusEmbarque === 'ESPERANDO',
    ),
  );
  const nomeAluno = (id: number) => alunos.find((a) => a.id === id)?.nomeDependente ?? `Aluno ${id}`;

  const renderAluno = (aluno: DependenteParadaDTO, parada: ParadaViagemDTO) => {
    const st = aluno.statusEmbarque;
    const info = statusInfo('presenca', st);
    const local = locais[aluno.id];
    const busy = submitting === aluno.id;
    const pode = !encerrada && (emAndamento || status === 'PLANEJADA');
    return (
      <View key={`${parada.ordem}-${aluno.id}`} style={styles.student}>
        <View style={styles.studentHead}>
          <View style={styles.flex}>
            <Text
              style={styles.studentName}
              onPress={() => setDetalhe({ aluno, parada })}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${aluno.nomeDependente}`}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {aluno.nomeDependente}
            </Text>
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Responsável: {aluno.nomeResponsavel}</Text>
          </View>
          <View style={styles.chips}>
            <Chip label={info.label} tone={info.tone} size="sm" />
            {local && <Chip label="Salvo no aparelho" tone="warning" size="sm" icon="smartphone" />}
          </View>
        </View>
        {pode && st === 'ESPERANDO' && (
          <View style={styles.actions}>
            <Button label="Embarcou" icon="log-in" size="md" onPress={() => setConfirmar({ aluno, novo: 'EMBARCADO' })} loading={busy} disabled={submitting !== null} style={styles.flex} accessibilityLabel={`${aluno.nomeDependente} embarcou`} />
            <Button label="Ausente" icon="x" size="md" variant="secondary" onPress={() => setConfirmar({ aluno, novo: 'FALTOU' })} disabled={submitting !== null} style={styles.flex} accessibilityLabel={`Registrar ausência de ${aluno.nomeDependente}`} />
          </View>
        )}
        {pode && st === 'EMBARCADO' && (
          <Button label="Desembarcou" icon="log-out" size="md" variant="secondary" onPress={() => setConfirmar({ aluno, novo: 'DESEMBARCADO' })} loading={busy} disabled={submitting !== null} fullWidth accessibilityLabel={`${aluno.nomeDependente} desembarcou`} />
        )}
      </View>
    );
  };

  const statusExec = statusInfo('viagemDia', status);

  return (
    <DriverLayout>
      {/* Topo fixo: mapa e status (fora do ScrollView) */}
      {emAndamento && (
        <View>
          <TripMap
            posicao={gps.posicao}
            ultimaAtualizacao={gps.ultimoEnvio?.toISOString()}
            desatualizada={gps.estado === 'sem_sinal'}
            mensagem={MENSAGEM_GPS[gps.estado]}
            altura={180}
          />
          <Card style={styles.statusCard}>
            <View style={styles.rowBetween}>
              <Chip label={statusExec.label} tone={statusExec.tone} size="sm" />
              {gps.estado !== 'ativo' && <Chip label={gps.estado === 'bloqueado' ? 'Sem GPS' : 'GPS'} tone="warning" size="sm" icon="navigation" />}
            </View>
            <Text style={styles.statusTitle} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {proxima ? `Próxima parada: ${proxima.nomeLocal}` : 'Todas as paradas concluídas'}
            </Text>
            {!!proxima?.endereco && (
              <Text style={styles.caption} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>{proxima.endereco}</Text>
            )}
          </Card>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} colors={[colors.ink]} tintColor={colors.ink} />}
      >
        <ScreenHeader
          title="Chamada"
          subtitle="Embarque, desembarque e ausência em cada parada"
          onBack={() => navigation.goBack()}
          right={!emAndamento ? <Chip label={statusExec.label} tone={statusExec.tone} /> : undefined}
        />

        {/* Avisos do GPS (7.1.8) */}
        {emAndamento && (gps.estado === 'negado' || gps.estado === 'desligado' || gps.estado === 'bloqueado' || gps.estado === 'sem_sinal') && (
          <Notice
            tone={gps.estado === 'bloqueado' ? 'info' : 'warning'}
            title="Localização"
            action={
              gps.estado === 'negado' ? (
                <Button label="Abrir configurações" variant="secondary" size="md" onPress={gps.abrirConfiguracoes} />
              ) : gps.estado === 'desligado' || gps.estado === 'sem_sinal' ? (
                <Button label="Tentar novamente" variant="secondary" size="md" onPress={gps.tentarNovamente} />
              ) : undefined
            }
          >
            {gps.mensagem ?? MENSAGEM_GPS[gps.estado]}
          </Notice>
        )}

        {/* Problemas de sincronização (5.7.10 / 8.3.5) */}
        {problemas.length > 0 && (
          <Card variant="alert" style={styles.card}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Registros não aplicados</Text>
            {problemas.map((p) => (
              <View key={p.idEvento} style={styles.problem}>
                <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {nomeAluno(p.idDependente)}: {statusInfo('presenca', p.statusNovo).label.toLowerCase()} às {formatTime(p.ocorridoEm)}
                  {p.statusServidor ? ` — no servidor está "${statusInfo('presenca', p.statusServidor).label}"` : ''}.
                </Text>
                {!!p.mensagem && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{p.mensagem}</Text>}
                <Button label="Entendi" variant="tertiary" size="md" onPress={() => descartar(p.idEvento).then(() => load(true))} />
              </View>
            ))}
          </Card>
        )}

        {/* Progresso e ações da viagem */}
        <Card style={styles.card}>
          <ProgressBar value={concluidos} total={alunos.length} label={`${concluidos} de ${alunos.length} alunos concluídos`} />
          <View style={styles.summary}>
            {(['ESPERANDO', 'EMBARCADO', 'DESEMBARCADO', 'FALTOU'] as StatusViagemPresenca[]).map((st) => (
              <View key={st} style={styles.summaryItem}>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {alunos.filter((a) => a.statusEmbarque === st).length}
                </Text>
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{statusInfo('presenca', st).label}</Text>
              </View>
            ))}
          </View>

          {status === 'PLANEJADA' && (
            <View style={styles.tripActions}>
              <Notice tone="info">A viagem ainda não começou. Revise as pendências e inicie pela tela da viagem.</Notice>
              {activeViagemDia?.viagemId ? (
                <Button
                  label="Revisar e iniciar"
                  icon="play"
                  onPress={() => navigation.navigate('DriverTripDay', { viagemId: activeViagemDia.viagemId!, data: execucao?.data ?? '', viagemDiaId })}
                  fullWidth
                />
              ) : null}
              <Button label="Cancelar viagem do dia" variant="tertiary" onPress={() => setMotivoPara('CANCELADA')} disabled={!online} fullWidth />
            </View>
          )}
          {emAndamento && (
            <View style={styles.tripActions}>
              <Button
                label="Finalizar viagem"
                icon="flag"
                onPress={() => setConfirmarFim(true)}
                disabled={!online || pendentesFim.length > 0}
                fullWidth
              />
              {pendentesFim.length > 0 && (
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Registre desembarque ou ausência de todos os alunos para finalizar ({pendentesFim.length} pendente
                  {pendentesFim.length === 1 ? '' : 's'}).
                </Text>
              )}
              <Button label="Avisar atraso" icon="clock" variant="secondary" onPress={() => setAtrasoAberto(true)} disabled={!online} fullWidth />
              <Button
                label="Alterar ordem das paradas"
                icon="shuffle"
                variant="secondary"
                onPress={() => viagemDiaId && navigation.navigate('DriverRouteOrder', { viagemDiaId, emExecucao: true })}
                disabled={!online}
                fullWidth
              />
              <Button label="Interromper viagem" variant="tertiary" onPress={() => setMotivoPara('INTERROMPIDA')} disabled={!online} fullWidth />
              {!online && (
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Sem conexão: só embarque, desembarque e ausência podem ser registrados.
                </Text>
              )}
            </View>
          )}
          {encerrada && <Notice tone={status === 'FINALIZADA' ? 'success' : 'info'}>{`Viagem ${statusExec.label.toLowerCase()}.`}</Notice>}
        </Card>

        {refreshing && currentStops.length === 0 && <StateView kind="loading" title="Carregando paradas..." />}

        {/* Paradas (6.1) */}
        {currentStops.map((stop, index) => (
          <Card key={`${stop.ordem}-${index}`} variant={stop === proxima && emAndamento ? 'selected' : 'default'} style={styles.stop}>
            <View style={styles.stopHead}>
              <View style={[styles.stopBadge, stop.tipoParada === 'MOTORISTA' && styles.stopBadgeDriver]}>
                {stop.tipoParada === 'MOTORISTA' ? (
                  <Feather name="home" size={16} color={colors.surface} />
                ) : (
                  <Text style={styles.stopNumber} maxFontSizeMultiplier={maxFontSizeMultiplier}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.flex}>
                <Text style={styles.stopTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{stop.nomeLocal}</Text>
                {!!stop.endereco && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{stop.endereco}</Text>}
              </View>
              {stop === proxima && emAndamento && <Chip label="Próxima" tone="warning" size="sm" />}
            </View>
            {stop.listaDependentes.map((aluno) => renderAluno(aluno, stop))}
          </Card>
        ))}

        {!refreshing && currentStops.length === 0 && (
          <StateView kind="empty" icon="map-pin" title="Nenhuma parada nesta viagem." message="Convide alunos para a viagem em Rotas." />
        )}

        {/* Eventos registrados (5.7.8) */}
        <Button
          label={eventosAbertos ? 'Ocultar eventos' : 'Ver eventos registrados'}
          icon="list"
          variant="tertiary"
          onPress={abrirEventos}
          disabled={!online && !eventos}
          fullWidth
        />
        {eventosAbertos && (
          <Card>
            {!eventos ? (
              <StateView kind="loading" />
            ) : (
              <Timeline
                items={[
                  ...eventos.presenca.map((e) => {
                    const s = statusInfo('presenca', e.statusNovo);
                    return {
                      key: `p-${e.id}`,
                      at: e.ocorridoEm,
                      title: `${nomeAluno(e.idDependente)}: ${s.label.toLowerCase()}`,
                      caption: `${formatDateTime(e.ocorridoEm)}${e.eventoClienteId ? ' · registrado sem conexão' : ''}`,
                      tone: s.tone,
                    };
                  }),
                  ...eventos.status.map((e) => {
                    const s = statusInfo('viagemDia', e.statusNovo);
                    return { key: `s-${e.id}`, at: e.ocorridoEm, title: `Viagem: ${s.label.toLowerCase()}`, caption: formatDateTime(e.ocorridoEm), detail: e.motivo, tone: s.tone };
                  }),
                ]
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .map(({ at, ...item }) => item)}
                emptyText="Nenhum evento registrado ainda."
              />
            )}
          </Card>
        )}
        {emAndamento && (
          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            A posição do GPS não confirma embarque: registre cada aluno manualmente.
          </Text>
        )}
      </ScrollView>

      {/* Confirmação de presença (6.2.2, 6.3.2, 6.4.3) */}
      <ConfirmDialog
        visible={!!confirmar}
        title={confirmar ? ACAO[confirmar.novo].titulo : ''}
        message={
          confirmar
            ? `${confirmar.aluno.nomeDependente}. O horário e o seu usuário ficam registrados e os responsáveis são avisados.${
                !online ? ' Sem conexão: o registro fica salvo no aparelho até ser enviado.' : ''
              }`
            : ''
        }
        confirmLabel={confirmar ? ACAO[confirmar.novo].confirmar : 'Confirmar'}
        cancelLabel="Voltar"
        destructive={confirmar?.novo === 'FALTOU'}
        loading={submitting !== null}
        onConfirm={marcar}
        onCancel={() => setConfirmar(null)}
      />

      {/* Finalizar (5.9) */}
      <ConfirmDialog
        visible={confirmarFim}
        title="Finalizar viagem?"
        message={`O horário de término será registrado, o GPS será desligado e os responsáveis serão avisados.${
          pendentes ? ` Antes, ${pendentes} registro(s) salvo(s) no aparelho serão enviados.` : ''
        }`}
        confirmLabel="Finalizar viagem"
        cancelLabel="Voltar"
        destructive={false}
        loading={updatingTrip}
        onConfirm={() => alterarViagem('FINALIZADA')}
        onCancel={() => setConfirmarFim(false)}
      />

      {/* Cancelar ou interromper (5.10) */}
      <ReasonDialog
        visible={motivoPara !== null}
        title={motivoPara === 'CANCELADA' ? 'Cancelar a viagem do dia?' : 'Interromper a viagem?'}
        message={
          motivoPara === 'CANCELADA'
            ? 'Cancelar: a viagem não vai acontecer nesta data.'
            : 'Interromper: a viagem começou e não será concluída. O GPS será desligado e os responsáveis avisados.'
        }
        confirmLabel={motivoPara === 'CANCELADA' ? 'Cancelar viagem' : 'Interromper viagem'}
        loading={updatingTrip}
        onConfirm={(motivo) => motivoPara && alterarViagem(motivoPara, motivo)}
        onCancel={() => setMotivoPara(null)}
      />

      {/* Detalhe do aluno (6.1.4: só o que o backend informa nesta tela) */}
      <Modal visible={!!detalhe} transparent animationType="slide" onRequestClose={() => setDetalhe(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal>
            {detalhe && (
              <>
                <Text style={styles.modalTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {detalhe.aluno.nomeDependente}
                </Text>
                <Chip label={statusInfo('presenca', detalhe.aluno.statusEmbarque).label} tone={statusInfo('presenca', detalhe.aluno.statusEmbarque).tone} style={styles.alignStart} />
                <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>Responsável: {detalhe.aluno.nomeResponsavel}</Text>
                <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>Parada: {detalhe.parada.nomeLocal}</Text>
                {!!detalhe.parada.endereco && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{detalhe.parada.endereco}</Text>}
                <Button label="Fechar" variant="tertiary" onPress={() => setDetalhe(null)} fullWidth />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Atraso */}
      <Modal visible={atrasoAberto} transparent animationType="fade" onRequestClose={() => setAtrasoAberto(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>Avisar atraso</Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Os responsáveis dos alunos que ainda vão embarcar ou estão no veículo recebem o aviso.
            </Text>
            <ChoiceChips
              options={['5', '10', '15', '20', '30', '45'].map((m) => ({ value: m, label: `${m} min` }))}
              value={atrasoMin}
              onChange={setAtrasoMin}
              accessibilityLabel="Minutos de atraso"
            />
            <TextField label="Motivo (opcional)" value={atrasoMotivo} onChangeText={setAtrasoMotivo} placeholder="Ex.: trânsito na avenida" maxLength={200} />
            <Button label="Enviar aviso" icon="send" onPress={enviarAtraso} loading={enviandoAtraso} fullWidth />
            <Button label="Voltar" variant="tertiary" onPress={() => setAtrasoAberto(false)} disabled={enviandoAtraso} fullWidth />
          </View>
        </View>
      </Modal>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alignStart: { alignSelf: 'flex-start' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, gap: spacing.lg, width: '100%', maxWidth: 800, alignSelf: 'center' },
  statusCard: { marginHorizontal: layout.screenMargin, marginTop: -spacing.xl, gap: spacing.xs },
  statusTitle: { ...typography.heading, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.ink },
  problem: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background },
  summaryValue: { ...typography.title, color: colors.ink },
  tripActions: { gap: layout.buttonGap },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
  stop: { gap: spacing.md },
  stopHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stopBadge: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  stopBadgeDriver: { backgroundColor: colors.slate500 },
  stopNumber: { ...typography.captionBold, color: colors.surface },
  stopTitle: { ...typography.label, color: colors.ink },
  student: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  studentHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  studentName: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink, textDecorationLine: 'underline' },
  chips: { alignItems: 'flex-end', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: layout.buttonGap },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalTitle: { ...typography.heading, color: colors.ink },
});
