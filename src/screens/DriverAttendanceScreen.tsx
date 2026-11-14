import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { useConnectivity } from '../context/ConnectivityContext';
import DriverLayout from '../components/DriverLayout';
import TripMap from '../components/TripMap';
import ConfirmDialog from '../components/ConfirmDialog';
import ReasonDialog from '../components/ReasonDialog';
import AvisoAtrasoModal from '../components/AvisoAtrasoModal';
import { Notice, ProgressBar } from '../components/Feedback';
import { Button, Card } from '../components/ui';
import { viagemService } from '../services/viagemService';
import { authSession } from '../services/authSession';
import { offlineQueue, podeRegistrarOffline } from '../services/offlineQueue';
import { MENSAGEM_GPS, useDriverLocation } from '../hooks/useDriverLocation';
import { DependenteParadaDTO, ParadaViagemDTO, StatusViagemPresenca, ViagemDiaDTO } from '../types';
import { statusInfo } from '../utils/statusLabels';
import { formatTime } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import { enderecoResumido } from '../utils/paradas';
import { rotuloRota } from '../utils/periodo';
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
 * Sem rolagem: mapa (40%) e atendimento do destino atual (60%). Presença registrada mesmo sem conexão.
 */
export default function DriverAttendanceScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { activeViagemDia, setActiveViagemDia, currentStops, setCurrentStops, showToast } = useAppContext();
  const { online, pendentes, problemas, sincronizar, descartar, marcarFalhaDeRede } = useConnectivity();
  const viagemDiaId = route.params?.viagemDiaId || activeViagemDia?.id;
  const usuarioId = authSession.getPerfil()?.usuarioId ?? null;

  const [execucao, setExecucao] = useState<ViagemDiaDTO | null>(activeViagemDia);
  const [locais, setLocais] = useState<Record<number, StatusViagemPresenca>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState<{ aluno: DependenteParadaDTO; novo: Marca } | null>(null);
  const [cancelarAberto, setCancelarAberto] = useState(false);
  const [confirmarFim, setConfirmarFim] = useState(false);
  const [updatingTrip, setUpdatingTrip] = useState(false);
  const [avisoAberto, setAvisoAberto] = useState(false);
  const [mapaOculto, setMapaOculto] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  // null = acompanha o primeiro destino pendente; depois o motorista navega pelas setas ou pelo deslize.
  const [indiceManual, setIndiceManual] = useState<number | null>(null);
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
        } else if (!silent) {
          showToast(getApiErrorMessage(error, 'Não foi possível carregar a viagem.'), 'error');
        }
      } finally {
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

  const alterarViagem = async (novo: 'FINALIZADA' | 'CANCELADA', motivo?: string) => {
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
      setCancelarAberto(false);
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

  // Destinos com alunos (a casa do motorista fica fora da navegação) e alunos sem repetição.
  const destinos = currentStops.filter((s) => s.listaDependentes.length > 0);
  const alunos = Array.from(new Map(currentStops.flatMap((s) => s.listaDependentes).map((a) => [a.id, a])).values());
  const embarcados = alunos.filter((a) => a.statusEmbarque === 'EMBARCADO' || a.statusEmbarque === 'DESEMBARCADO').length;
  const desembarcados = alunos.filter((a) => a.statusEmbarque === 'DESEMBARCADO').length;
  const pendentesFim = alunos.filter((a) => a.statusEmbarque === 'ESPERANDO' || a.statusEmbarque === 'EMBARCADO');

  // Na ida o embarque é na casa do aluno e o desembarque na escola; na volta é o contrário.
  const periodo = execucao?.periodo ?? execucao?.viagem?.periodo ?? '';
  const ida = periodo.endsWith('IDA');
  const tituloViagem = rotuloRota(periodo) ? `Rota da ${rotuloRota(periodo)}` : 'Rota';
  // Diminui a fonte conforme o tamanho do nome, para caber ao lado do botão Ver mapa.
  const tamanhoTitulo = Math.max(12, Math.min(18, Math.floor(330 / tituloViagem.length)));
  const embarqueNaParada = (s: ParadaViagemDTO) => (ida ? s.tipoParada !== 'ESCOLA' : s.tipoParada === 'ESCOLA');
  // Num destino de embarque falta quem está ESPERANDO; num de desembarque, quem está EMBARCADO.
  const pendenteNaParada = (s: ParadaViagemDTO, d: DependenteParadaDTO) =>
    embarqueNaParada(s) ? d.statusEmbarque === 'ESPERANDO' : d.statusEmbarque === 'EMBARCADO';

  const primeiroPendente = Math.max(0, destinos.findIndex((s) => s.listaDependentes.some((d) => pendenteNaParada(s, d))));
  const indice = Math.min(indiceManual ?? primeiroPendente, Math.max(destinos.length - 1, 0));
  const destino = destinos[indice];
  const destinoEhEmbarque = !!destino && embarqueNaParada(destino);
  const aluno = destino?.listaDependentes.find((d) => pendenteNaParada(destino, d));
  const progressoValor = destinoEhEmbarque ? embarcados : desembarcados;
  const progressoRotulo = destinoEhEmbarque ? 'embarcados' : 'desembarcados';

  const irPara = (novo: number) => {
    if (destinos.length) setIndiceManual(Math.max(0, Math.min(novo, destinos.length - 1)));
  };
  const deslize = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50) irPara(indice + 1);
      else if (g.dx > 50) irPara(indice - 1);
    },
  });

  const mensagemAoResponsavel = (dependente: DependenteParadaDTO) =>
    navigation.navigate('NotificationCreate', {
      destinatarioId: dependente.responsavelUsuarioId ?? undefined,
      nomeDestinatario: dependente.nomeResponsavel,
      dependenteId: dependente.id,
      viagemDiaId,
    });

  const voltarInicio = () => navigation.navigate('DriverMain');
  const mapaVisivel = emAndamento && !mapaOculto;
  const telaCheiaAtiva = emAndamento && telaCheia;
  const nomeAluno = (id: number) => alunos.find((a) => a.id === id)?.nomeDependente ?? `Aluno ${id}`;

  return (
    <DriverLayout>
      <View style={[styles.tela, { paddingTop: insets.top }]}>
        {/* Tela cheia: mapa inteiro, voltar à direita do topo e card de atendimento flutuante embaixo */}
        {telaCheiaAtiva && (
          <View style={styles.telaCheia}>
            <TripMap
              preencher
              posicao={gps.posicao}
              ultimaAtualizacao={gps.ultimoEnvio?.toISOString()}
              desatualizada={gps.estado === 'sem_sinal'}
              mensagem={MENSAGEM_GPS[gps.estado]}
            />
            <View style={[styles.telaCheiaTopo, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
              <Button size="icon" variant="secondary" icon="arrow-left" accessibilityLabel="Voltar para o início" onPress={voltarInicio} />
              <ChipAcao label="Reduzir mapa" onPress={() => setTelaCheia(false)} />
            </View>
            <View style={[styles.cardFlutuante, { bottom: insets.bottom + spacing.md }]} {...deslize.panHandlers}>
              <ProgressBar value={progressoValor} total={alunos.length} label={`${progressoValor}/${alunos.length} ${progressoRotulo}`} />
              {aluno ? (
                <>
                  <Text style={styles.nomeAluno} maxFontSizeMultiplier={maxFontSizeMultiplier}>{aluno.nomeDependente}</Text>
                  <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {destinoEhEmbarque ? 'Embarque' : 'Desembarque'}: {enderecoResumido(destino!)}
                  </Text>
                </>
              ) : null}
              {pendentesFim.length === 0 ? (
                <Button label="Finalizar viagem" icon="flag" disabled={!online} fullWidth onPress={() => setConfirmarFim(true)} />
              ) : aluno ? (
                <View style={styles.linha}>
                  <BotaoCard
                    label={destinoEhEmbarque ? 'Embarcou' : 'Desembarcou'}
                    cores={CORES_CARD.positivo}
                    onPress={() => setConfirmar({ aluno, novo: destinoEhEmbarque ? 'EMBARCADO' : 'DESEMBARCADO' })}
                  />
                  <BotaoCard label="Mensagem" cores={CORES_CARD.neutro} onPress={() => mensagemAoResponsavel(aluno)} />
                  <BotaoCard label="Faltou" cores={CORES_CARD.negativo} onPress={() => setConfirmar({ aluno, novo: 'FALTOU' })} />

                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Mapa (40%): Ocultar mapa e Tela cheia ficam sobre ele; o voltar leva ao início */}
        {mapaVisivel ? (
          <View style={styles.mapa}>
            <TripMap
              preencher
              posicao={gps.posicao}
              ultimaAtualizacao={gps.ultimoEnvio?.toISOString()}
              desatualizada={gps.estado === 'sem_sinal'}
              mensagem={MENSAGEM_GPS[gps.estado]}
            />
            <View style={styles.mapaVoltar} pointerEvents="box-none">
              <Button size="icon" variant="secondary" icon="arrow-left" accessibilityLabel="Voltar para o início" onPress={voltarInicio} />
            </View>
            <View style={styles.mapaChips} pointerEvents="box-none">
              <ChipAcao label="Ocultar mapa" onPress={() => setMapaOculto(true)} />
              <ChipAcao label="Tela cheia" onPress={() => setTelaCheia(true)} />
            </View>
          </View>
        ) : null}

        {/* Atendimento (60%, ou tudo quando o mapa está oculto). Deslizar nesta região troca de aluno. */}
        <View style={[styles.conteudo, { flex: mapaVisivel ? 3 : 1, gap: mapaVisivel ? spacing.sm : spacing.md }]} {...deslize.panHandlers}>
          {!mapaVisivel && (
            <View style={styles.topoSemMapa}>
              <Button size="icon" variant="secondary" icon="arrow-left" accessibilityLabel="Voltar para o início" onPress={voltarInicio} />
              <Text style={[styles.tituloViagem, { fontSize: tamanhoTitulo, lineHeight: tamanhoTitulo + 8 }]} numberOfLines={1}>
                {tituloViagem}
              </Text>
              {emAndamento && <ChipAcao label="Ver mapa" onPress={() => setMapaOculto(false)} />}
            </View>
          )}
          {!mapaVisivel && (
            <View style={styles.linha}>
              <Button label="Aviso geral" icon="alert-triangle" variant="secondary" size="md" style={styles.flex} onPress={() => setAvisoAberto(true)} />
              <Button
                label="Mensagem"
                icon="message-square"
                variant="secondary"
                size="md"
                style={styles.flex}
                onPress={() => navigation.navigate('NotificationCreate', { viagemDiaId })}
              />
            </View>
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

          {emAndamento && destino && (
            <>
              <Card style={styles.card}>
                <View style={styles.linha}>
                  <Text style={[styles.nomeAluno, styles.flex]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {aluno ? aluno.nomeDependente : destino.nomeLocal}
                  </Text>
                  {mapaVisivel && aluno && <ChipAcao label="Mensagem" onPress={() => mensagemAoResponsavel(aluno)} />}
                </View>
                <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {destinoEhEmbarque ? 'Embarque' : 'Desembarque'}: {enderecoResumido(destino)}
                </Text>
              </Card>

              <View style={styles.direcoes}>
                <Feather name="corner-up-right" size={28} color={colors.primary} />
                <View style={styles.direcoesTextos}>
                  <Text style={styles.direcoesTitulo} maxFontSizeMultiplier={maxFontSizeMultiplier}>Em 120 m, vire à direita</Text>
                  <Text style={styles.direcoesSub} maxFontSizeMultiplier={maxFontSizeMultiplier}>Trânsito moderado · 29 °C · chega em 2 min</Text>
                </View>
              </View>

              <ProgressBar
                value={progressoValor}
                total={alunos.length}
                label={`${progressoValor}/${alunos.length} ${progressoRotulo}`}
              />
            </>
          )}

          {emAndamento && (
            <View style={styles.espaco} />
          )}
          {emAndamento && (
            <View style={styles.linha}>
              <Button size="icon" variant="secondary" icon="chevron-left" accessibilityLabel="Destino anterior" disabled={indice <= 0} onPress={() => irPara(indice - 1)} />
              <Button label="Alterar viagem" icon="shuffle" variant="secondary" size="md" style={styles.flex} disabled={!online} onPress={() => viagemDiaId && navigation.navigate('DriverRouteOrder', { viagemDiaId, emExecucao: true })} />
              <Button size="icon" variant="secondary" icon="chevron-right" accessibilityLabel="Próximo destino" disabled={indice >= destinos.length - 1} onPress={() => irPara(indice + 1)} />
            </View>
          )}

          {emAndamento && pendentesFim.length === 0 && (
            <Button label="Finalizar viagem" icon="flag" disabled={!online} fullWidth onPress={() => setConfirmarFim(true)} />
          )}
          {emAndamento && pendentesFim.length > 0 && aluno && (
            <View style={styles.linha}>
              <BotaoCard
                label={destinoEhEmbarque ? 'Embarcou' : 'Desembarcou'}
                icone="check"
                cores={CORES_CARD.positivo}
                onPress={() => setConfirmar({ aluno, novo: destinoEhEmbarque ? 'EMBARCADO' : 'DESEMBARCADO' })}
              />
              <BotaoCard label="Faltou" icone="x" cores={CORES_CARD.negativo} onPress={() => setConfirmar({ aluno, novo: 'FALTOU' })} />
            </View>
          )}
          {emAndamento && pendentesFim.length > 0 && (
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Faltam {pendentesFim.length} aluno{pendentesFim.length === 1 ? '' : 's'} para finalizar.
              {!online ? ' Sem conexão: só embarque, desembarque e ausência podem ser registrados.' : ''}
            </Text>
          )}

          {!emAndamento && destinos.length === 0 && (
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>Nenhuma parada nesta viagem.</Text>
          )}
          {status === 'PLANEJADA' && (
            <>
              <Notice tone="info">A viagem ainda não começou. Inicie pela tela da viagem.</Notice>
              {activeViagemDia?.viagemId ? (
                <Button
                  label="Revisar e iniciar"
                  icon="play"
                  onPress={() => navigation.navigate('DriverTripDay', { viagemId: activeViagemDia.viagemId!, data: execucao?.data ?? '', viagemDiaId })}
                  fullWidth
                />
              ) : null}
              <Button label="Cancelar viagem do dia" variant="tertiary" onPress={() => setCancelarAberto(true)} disabled={!online} fullWidth />
            </>
          )}
          {encerrada && <Notice tone={status === 'FINALIZADA' ? 'success' : 'info'}>{`Viagem ${statusInfo('viagemDia', status).label.toLowerCase()}.`}</Notice>}
        </View>
      </View>

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

      {/* Cancelar a viagem do dia (5.10) */}
      <ReasonDialog
        visible={cancelarAberto}
        title="Cancelar a viagem do dia?"
        message="Cancelar: a viagem não vai acontecer nesta data."
        confirmLabel="Cancelar viagem"
        loading={updatingTrip}
        onConfirm={(motivo) => alterarViagem('CANCELADA', motivo)}
        onCancel={() => setCancelarAberto(false)}
      />

      <AvisoAtrasoModal
        visible={avisoAberto}
        viagemDiaId={viagemDiaId}
        onClose={() => setAvisoAberto(false)}
        onSent={() => load(true)}
      />
    </DriverLayout>
  );
}

type CoresCard = { fundo: string; borda: string; texto: string };
const CORES_CARD: Record<'positivo' | 'neutro' | 'negativo', CoresCard> = {
  positivo: { fundo: colors.success, borda: colors.ink, texto: colors.surface },
  neutro: { fundo: colors.surface, borda: colors.ink, texto: colors.ink },
  negativo: { fundo: colors.dangerTint, borda: colors.danger, texto: colors.danger },
};

/** Botões Embarcou/Faltou (e Mensagem da tela cheia): verde, branco e vermelho, como na referência. */
function BotaoCard({ label, icone, cores, onPress }: { label: string; icone?: 'check' | 'x'; cores: CoresCard; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.botaoCard, { backgroundColor: cores.fundo, borderColor: cores.borda }]}
    >
      {icone ? (
        <View style={styles.botaoCardIcone}>
          <Feather name={icone} size={18} color={cores.texto} />
        </View>
      ) : null}
      <Text style={[styles.botaoCardTexto, { color: cores.texto }]} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChipAcao({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.chip}>
      <Text style={styles.chipTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1 },
  telaCheia: { ...StyleSheet.absoluteFill, zIndex: 20, elevation: 20, backgroundColor: colors.surface },
  telaCheiaTopo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenMargin,
    zIndex: 30,
    elevation: 30,
  },
  cardFlutuante: {
    position: 'absolute',
    left: layout.screenMargin,
    right: layout.screenMargin,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    zIndex: 30,
    elevation: 30,
  },
  botaoCard: {
    flex: 1,
    minHeight: 48,
    borderWidth: 2,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  botaoCardIcone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: spacing.sm,
    justifyContent: 'center',
  },
  botaoCardTexto: { ...typography.captionBold },
  direcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  direcoesTextos: { flex: 1, gap: 2 },
  direcoesTitulo: { ...typography.label, color: colors.surface },
  direcoesSub: { ...typography.caption, color: colors.slate500 },
  mapa: { flex: 2, overflow: 'hidden', position: 'relative' },
  mapaVoltar: { position: 'absolute', top: 0, left: 0, padding: layout.screenMargin, zIndex: 10, elevation: 10 },
  mapaChips: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    zIndex: 10,
    elevation: 10,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipTexto: { ...typography.captionBold, color: colors.ink },
  topoSemMapa: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tituloViagem: { ...typography.heading, flex: 1, minWidth: 0, color: colors.ink },
  espaco: { flex: 1 },
  conteudo: {
    padding: layout.screenMargin,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: layout.buttonGap },
  card: { gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.ink },
  nomeAluno: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  problem: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
});
