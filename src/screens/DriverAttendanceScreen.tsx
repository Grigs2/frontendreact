import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAreaToque } from '../hooks/useNivelMapa';
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
import ParadaDetalhesModal from '../components/ParadaDetalhesModal';
import MensagensRapidasModal from '../components/MensagensRapidasModal';
import { notificacaoService } from '../services/notificacaoService';
import { MensagemRapida, sugestoesDoMotorista } from '../utils/mensagensRapidas';
import RotaEstacoes from '../components/RotaEstacoes';
import { Notice, ProgressBar } from '../components/Feedback';
import { Button, Card } from '../components/ui';
import { viagemService } from '../services/viagemService';
import { authSession } from '../services/authSession';
import { offlineQueue, podeRegistrarOffline } from '../services/offlineQueue';
import { localizacaoService } from '../services/localizacaoService';
import { MENSAGEM_GPS, useDriverLocation } from '../hooks/useDriverLocation';
import { useRotaViagem } from '../hooks/useRotaViagem';
import { distancia, instrucaoCurta, linhaDaRota, tempoAte } from '../utils/rota';
import { DependenteParadaDTO, ParadaViagemDTO, StatusViagemPresenca, ViagemDiaDTO } from '../types';
import { statusInfo } from '../utils/statusLabels';
import { formatTime } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import { ordenarAlunos, rotuloParada } from '../utils/paradas';
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
  const [interromperAberto, setInterromperAberto] = useState(false);
  const [detalhes, setDetalhes] = useState<ParadaViagemDTO | null>(null);
  // Alternativa ao mapa: a rota como linha de estações (também usada sem internet).
  const [vistaLinha, setVistaLinha] = useState(false);
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

  // Sem o consentimento do motorista o backend recusa a posição e o responsável não vê o veículo.
  const [semConsentimento, setSemConsentimento] = useState(false);
  const [consentindo, setConsentindo] = useState(false);
  useEffect(() => {
    if (!emAndamento || !viagemDiaId) return;
    localizacaoService
      .estadoConsentimento(viagemDiaId)
      .then((e) => setSemConsentimento(!e.motoristaConsentiu))
      .catch(() => undefined);
  }, [emAndamento, viagemDiaId]);
  const permitirLocalizacao = async () => {
    setConsentindo(true);
    try {
      await localizacaoService.consentirMotorista(true);
      setSemConsentimento(false);
      gps.tentarNovamente();
      showToast('Localização compartilhada com os responsáveis durante a viagem.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível ativar a localização.'), 'error');
    } finally {
      setConsentindo(false);
    }
  };

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
    if (!podeRegistrarOffline(aluno.statusEmbarque, novo)) {
      showToast('Esse registro não é possível para o status atual do aluno.', 'warning');
      setConfirmar(null);
      return;
    }
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
      setCancelarAberto(false);
      setInterromperAberto(false);
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

  // Só paradas com aluno pendente entram na navegação (setas e deslize); alunos já tratados não voltam a aparecer.
  const indicesPendentes = destinos.flatMap((s, i) => (s.listaDependentes.some((d) => pendenteNaParada(s, d)) ? [i] : []));
  const indice = indiceManual !== null && indicesPendentes.includes(indiceManual) ? indiceManual : (indicesPendentes[0] ?? 0);
  const indiceAnterior = indicesPendentes.filter((i) => i < indice).pop();
  const indiceProximo = indicesPendentes.find((i) => i > indice);
  const destino = destinos[indice];
  const destinoEhEmbarque = !!destino && embarqueNaParada(destino);
  // Num mesmo destino (ex.: escola com vários alunos) o atendimento segue a ordem alfabética.
  const pendentesNoDestino = destino ? ordenarAlunos(destino.listaDependentes.filter((d) => pendenteNaParada(destino, d))) : [];
  const aluno = pendentesNoDestino[0];
  const rotuloDestino = destino ? rotuloParada(destino, ida, pendentesNoDestino.length ? pendentesNoDestino : destino.listaDependentes) : '';
  // Rota do Google a partir da posição do aparelho; volta a ser buscada a cada embarque ou desembarque.
  const assinaturaRota = currentStops.map((s) => s.listaDependentes.map((d) => d.statusEmbarque).join(',')).join('|');
  const rota = useRotaViagem(viagemDiaId, emAndamento, gps.posicao, assinaturaRota);
  const linhaRota = linhaDaRota(rota);
  const paradasRota = rota?.disponivel ? rota.paradas : [];
  const pontosMapa = paradasRota.map((p, i) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    titulo: p.rotulo,
    numero: i + 1,
    destaque: !!destino && p.ordem === destino.ordem,
  }));
  const previsaoDestino = destino ? paradasRota.find((p) => p.ordem === destino.ordem) : undefined;
  const navegar = (app: 'maps' | 'waze') => {
    if (!previsaoDestino) return;
    const { latitude: lat, longitude: lng } = previsaoDestino;
    const url =
      app === 'waze'
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    Linking.openURL(url).catch(() => showToast('Não foi possível abrir o aplicativo de navegação.', 'error'));
  };

  // Destino seguinte, para o quadro "próxima parada".
  const destinoSeguinte = indiceProximo !== undefined ? destinos[indiceProximo] : undefined;
  const rotuloSeguinte = destinoSeguinte
    ? rotuloParada(destinoSeguinte, ida, destinoSeguinte.listaDependentes.filter((d) => pendenteNaParada(destinoSeguinte, d)))
    : '';
  const progressoValor = destinoEhEmbarque ? embarcados : desembarcados;
  const progressoRotulo = destinoEhEmbarque ? 'embarcados' : 'desembarcados';

  const irPara = (novo: number | undefined) => {
    if (novo !== undefined) setIndiceManual(novo);
  };
  // Mapa dinâmico: tocar no mapa amplia (pequeno → tela cheia); tocar fora do mapa, onde não há botão,
  // reduz um nível (tela cheia → pequeno → oculto). Os botões Ocultar/Ver linha/Tela cheia continuam.
  const ampliarMapa = () => {
    if (mapaOculto) setMapaOculto(false);
    else setTelaCheia(true);
  };
  const reduzirMapa = () => {
    if (telaCheia) setTelaCheia(false);
    else if (!mapaOculto) setMapaOculto(true);
  };
  // Fora do mapa: deslizar troca de aluno; tocar num ponto sem botão reduz o mapa.
  const deslize = useAreaToque({
    onToque: reduzirMapa,
    onDeslizarEsquerda: () => irPara(indiceProximo),
    onDeslizarDireita: () => irPara(indiceAnterior),
  });

  // Mensagens rápidas ao responsável do aluno ("Estou na porta", "Vou atrasar"...); "Escrever outra" abre o formulário.
  const [mensagemPara, setMensagemPara] = useState<DependenteParadaDTO | null>(null);
  const [enviandoMensagem, setEnviandoMensagem] = useState<MensagemRapida | null>(null);
  const escreverMensagem = (dependente: DependenteParadaDTO) =>
    navigation.navigate('NotificationCreate', {
      destinatarioId: dependente.responsavelUsuarioId ?? undefined,
      nomeDestinatario: dependente.nomeResponsavel,
      dependenteId: dependente.id,
      viagemDiaId,
    });
  const mensagemAoResponsavel = (dependente: DependenteParadaDTO) => {
    if (!dependente.responsavelUsuarioId || !usuarioId) escreverMensagem(dependente);
    else setMensagemPara(dependente);
  };
  const enviarMensagemRapida = async (m: MensagemRapida) => {
    if (!mensagemPara?.responsavelUsuarioId || !usuarioId) return;
    setEnviandoMensagem(m);
    try {
      await notificacaoService.enviar({
        titulo: m.titulo,
        mensagem: m.texto,
        visto: false,
        remetenteId: usuarioId,
        destinatarioId: mensagemPara.responsavelUsuarioId,
        dependenteId: mensagemPara.id,
        viagemDiaId: viagemDiaId ?? null,
      });
      showToast(`Mensagem enviada para ${mensagemPara.nomeResponsavel?.split(' ')[0] || 'o responsável'}.`, 'success');
      setMensagemPara(null);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível enviar a mensagem.'), 'error');
    } finally {
      setEnviandoMensagem(null);
    }
  };

  const voltarInicio = () => navigation.navigate('DriverMain');
  const mapaVisivel = emAndamento && !mapaOculto;
  // Sem internet o mapa não carrega: mostra a linha de estações no lugar.
  const modoLinha = vistaLinha || !online;
  const telaCheiaAtiva = emAndamento && telaCheia && !modoLinha;
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
              rota={linhaRota}
              paradas={pontosMapa}
              modo="seguir"
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
                  <View style={styles.linha}>
                    <Text style={[styles.body, styles.flex]} maxFontSizeMultiplier={maxFontSizeMultiplier}>{rotuloDestino}</Text>
                    <ChipAcao label="Ver detalhes" onPress={() => setDetalhes(destino!)} />
                  </View>
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
                  {podeRegistrarOffline(aluno.statusEmbarque, 'FALTOU') && (
                    <BotaoCard label="Faltou" cores={CORES_CARD.negativo} onPress={() => setConfirmar({ aluno, novo: 'FALTOU' })} />
                  )}

                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Mapa (40%): Ocultar mapa e Tela cheia ficam sobre ele; o voltar leva ao início */}
        {mapaVisivel ? (
          <View style={styles.mapa}>
            {modoLinha ? (
              <View style={[styles.linhaArea, { paddingTop: layout.minTouch + spacing.md }]}>
                <RotaEstacoes
                  paradas={destinos}
                  ida={ida}
                  indiceAtual={indice}
                  pendenteNaParada={pendenteNaParada}
                  onSelecionar={(i) => (indicesPendentes.includes(i) && i !== indice ? irPara(i) : setDetalhes(destinos[i]))}
                />
                {!online && (
                  <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    Sem internet: o mapa volta quando a conexão voltar.
                  </Text>
                )}
              </View>
            ) : (
              <TripMap
                preencher
                posicao={gps.posicao}
                ultimaAtualizacao={gps.ultimoEnvio?.toISOString()}
                desatualizada={gps.estado === 'sem_sinal'}
                mensagem={MENSAGEM_GPS[gps.estado]}
                rota={linhaRota}
                paradas={pontosMapa}
                modo="seguir"
                onPress={ampliarMapa}
              />
            )}
            <View style={styles.mapaVoltar} pointerEvents="box-none">
              <Button size="icon" variant="secondary" icon="arrow-left" accessibilityLabel="Voltar para o início" onPress={voltarInicio} />
            </View>
            <View style={styles.mapaChips} pointerEvents="box-none">
              <ChipAcao label="Ocultar mapa" onPress={() => setMapaOculto(true)} />
              {online && <ChipAcao label={vistaLinha ? 'Ver mapa' : 'Ver linha'} onPress={() => setVistaLinha((v) => !v)} />}
              {!modoLinha && <ChipAcao label="Tela cheia" onPress={() => setTelaCheia(true)} />}
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

          {emAndamento && semConsentimento && (
            <Card variant="alert" style={styles.card}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Compartilhar sua localização</Text>
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Os responsáveis acompanham a perua no mapa só durante a viagem. Você pode desligar em Perfil → Configurações.
              </Text>
              <Button label="Permitir" icon="map-pin" size="md" loading={consentindo} onPress={permitirLocalizacao} fullWidth />
            </Card>
          )}
          {emAndamento && destino && (
            <>
              <Card style={styles.card}>
                <View style={styles.linha}>
                  <Text style={[styles.nomeAluno, styles.flex]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {aluno ? aluno.nomeDependente : 'Todos os alunos registrados'}
                  </Text>
                  {mapaVisivel && aluno && <ChipAcao label="Mensagem" onPress={() => mensagemAoResponsavel(aluno)} />}
                </View>
                <View style={styles.linha}>
                  <Text style={[styles.body, styles.flex]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {aluno ? rotuloDestino : 'Embarques e desembarques concluídos. Finalize a viagem abaixo.'}
                  </Text>
                  {aluno && <ChipAcao label="Ver detalhes" onPress={() => setDetalhes(destino)} />}
                </View>
              </Card>

              {aluno && (
                <View style={styles.direcoes}>
                  <Feather
                    name={rota?.proximaInstrucao ? 'navigation' : destinoSeguinte ? 'arrow-right-circle' : 'flag'}
                    size={28}
                    color={colors.primary}
                  />
                  <View style={styles.direcoesTextos}>
                    <Text style={styles.direcoesTitulo} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={2}>
                      {rota?.proximaInstrucao
                        ? `${instrucaoCurta(rota.proximaInstrucao)}${rota.metrosAteInstrucao ? ` · ${distancia(rota.metrosAteInstrucao)}` : ''}`
                        : indicesPendentes.length <= 1
                          ? 'Última parada'
                          : `Faltam ${indicesPendentes.length} paradas`}
                    </Text>
                    {previsaoDestino ? (
                      <Text style={styles.direcoesEta} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
                        Chega em {tempoAte(previsaoDestino.segundos)} · {formatTime(previsaoDestino.previsaoChegada)} ·{' '}
                        {distancia(previsaoDestino.metros)}
                      </Text>
                    ) : rota && !rota.disponivel && rota.mensagem ? (
                      <Text style={styles.direcoesSub} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
                        {rota.mensagem}
                      </Text>
                    ) : null}
                    <Text style={styles.direcoesSub} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
                      {destinoSeguinte ? `Depois: ${rotuloSeguinte}` : 'Esta é a última parada com alunos.'}
                    </Text>
                    {previsaoDestino && (
                      <View style={styles.navegar}>
                        <ChipAcao label="Abrir no Maps" onPress={() => navegar('maps')} />
                        <ChipAcao label="Abrir no Waze" onPress={() => navegar('waze')} />
                      </View>
                    )}
                  </View>
                </View>
              )}

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
              <Button size="icon" variant="secondary" icon="chevron-left" accessibilityLabel="Destino anterior" disabled={indiceAnterior === undefined} onPress={() => irPara(indiceAnterior)} />
              <Button label="Alterar viagem" icon="shuffle" variant="secondary" size="md" style={styles.flex} disabled={!online} onPress={() => viagemDiaId && navigation.navigate('DriverRouteOrder', { viagemDiaId, emExecucao: true })} />
              <Button size="icon" variant="secondary" icon="chevron-right" accessibilityLabel="Próximo destino" disabled={indiceProximo === undefined} onPress={() => irPara(indiceProximo)} />
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
              {podeRegistrarOffline(aluno.statusEmbarque, 'FALTOU') && (
                <BotaoCard label="Faltou" icone="x" cores={CORES_CARD.negativo} onPress={() => setConfirmar({ aluno, novo: 'FALTOU' })} />
              )}
            </View>
          )}
          {emAndamento && pendentesFim.length > 0 && (
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Faltam {pendentesFim.length} aluno{pendentesFim.length === 1 ? '' : 's'} para finalizar.
              {!online ? ' Sem conexão: só embarque, desembarque e ausência podem ser registrados.' : ''}
            </Text>
          )}
          {emAndamento && pendentesFim.length > 0 && (
            <Button
              label="Interromper viagem"
              icon="octagon"
              variant="tertiary"
              size="md"
              disabled={!online}
              fullWidth
              onPress={() => setInterromperAberto(true)}
            />
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
                  onPress={() => navigation.navigate('DriverTripDetails', { viagemId: activeViagemDia.viagemId!, data: activeViagemDia.data })}
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

      {/* Interromper: a viagem começou mas não pode continuar (pane, acidente, saúde). */}
      <ReasonDialog
        visible={interromperAberto}
        title="Interromper a viagem?"
        message="Use quando a viagem já começou e não pode continuar (pane, acidente, problema de saúde). O GPS é desligado e os responsáveis recebem o motivo."
        confirmLabel="Interromper viagem"
        loading={updatingTrip}
        onConfirm={(motivo) => alterarViagem('INTERROMPIDA', motivo)}
        onCancel={() => setInterromperAberto(false)}
      />

      <MensagensRapidasModal
        visible={!!mensagemPara}
        titulo={`Mensagem para ${mensagemPara?.nomeResponsavel?.split(' ')[0] || 'o responsável'}`}
        sugestoes={sugestoesDoMotorista(
          mensagemPara?.nomeDependente,
          // Na ida a casa é a busca; na volta é a entrega.
          ida,
          previsaoDestino && destino?.listaDependentes.some((d) => d.id === mensagemPara?.id)
            ? Math.max(1, Math.round(previsaoDestino.segundos / 60))
            : null,
        )}
        enviando={enviandoMensagem}
        onEnviar={enviarMensagemRapida}
        onEscrever={() => {
          const d = mensagemPara;
          setMensagemPara(null);
          if (d) escreverMensagem(d);
        }}
        onClose={() => setMensagemPara(null)}
      />

      <ParadaDetalhesModal
        parada={detalhes}
        ida={ida}
        onClose={() => setDetalhes(null)}
        onMensagem={(a) => {
          setDetalhes(null);
          mensagemAoResponsavel(a);
        }}
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
  direcoesEta: { ...typography.captionBold, color: colors.primary },
  navegar: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  mapa: { flex: 2, overflow: 'hidden', position: 'relative' },
  linhaArea: { flex: 1, justifyContent: 'center', gap: spacing.sm, paddingHorizontal: layout.screenMargin, backgroundColor: colors.background },
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
