import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { escolasNomes, viagemNome, viagemService } from '../services/viagemService';
import { AgendaViagemDTO, EscolaResumoDTO, HistoricoViagemDiaDTO, HistoricoViagemPresencaDTO, MotoristaDTO, ParadaViagemDTO, ViagemDTO, ViagemDiaResumoDTO } from '../types';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDayShort, formatTime, todayIso } from '../utils/format';
import DriverLayout from '../components/DriverLayout';
import AvisoAtrasoModal from '../components/AvisoAtrasoModal';
import ConfigurarViagemModal from '../components/ConfigurarViagemModal';
import ParadaDetalhesModal from '../components/ParadaDetalhesModal';
import { rotuloParada } from '../utils/paradas';
import ConfirmDialog from '../components/ConfirmDialog';
import ReasonDialog from '../components/ReasonDialog';
import { Feather } from '@expo/vector-icons';
import { Button, Chip, ScreenHeader, StateView } from '../components/ui';
import { colors, layout, radius, spacing, typography } from '../theme';
import { statusExecucao, statusInfo } from '../utils/statusLabels';

/** Estados encerrados: a tela vira somente leitura (histórico). */
const ENCERRADAS = ['FINALIZADA', 'CANCELADA', 'INTERROMPIDA'];

type Props = NativeStackScreenProps<RootStackParamList, 'DriverTripDetails'>;

/** Casa do motorista usa o nome; alunos e escola usam rua e número (antes do primeiro " - "). */
function tituloParada(parada: ParadaViagemDTO): string {
  if (parada.tipoParada === 'MOTORISTA') return parada.nomeLocal || parada.endereco;
  return (parada.endereco ?? '').split(' - ')[0] || parada.nomeLocal;
}

export default function DriverTripDetailsScreen({ route, navigation }: Props) {
  const { viagemId, data: dataParam } = route.params;
  const dataViagem = dataParam ?? todayIso();
  const { currentUser, showToast, setActiveViagemDia, setCurrentStops } = useAppContext();
  const [viagem, setViagem] = useState<ViagemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [carregado, setCarregado] = useState(false);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [escolasDisponiveis, setEscolasDisponiveis] = useState<EscolaResumoDTO[] | null>(null);
  const [diaViagem, setDiaViagem] = useState<AgendaViagemDTO | null>(null);
  const [detalhesParada, setDetalhesParada] = useState<ParadaViagemDTO | null>(null);
  const [paradas, setParadas] = useState<ParadaViagemDTO[]>([]);
  const [pronta, setPronta] = useState<boolean | null>(null);
  const [resumo, setResumo] = useState<ViagemDiaResumoDTO | null>(null);
  const [eventosStatus, setEventosStatus] = useState<HistoricoViagemDiaDTO[]>([]);
  const [eventosPresenca, setEventosPresenca] = useState<HistoricoViagemPresencaDTO[]>([]);
  const [showAviso, setShowAviso] = useState(false);
  const [horarioAjustado, setHorarioAjustado] = useState(false);
  const motoristaId = (currentUser as MotoristaDTO)?.id;
  // Mesma regra da presença: na ida o embarque é no aluno e o desembarque na escola.
  const ida = viagem?.periodo?.endsWith('IDA') ?? false;

  const loadViagem = useCallback(async () => {
    setLoading(true);
    try {
      const data = await viagemService.visualizar(viagemId);
      setViagem(data);
      const [agenda, historico] = motoristaId
        ? await Promise.all([
            viagemService.agenda(motoristaId).catch(() => [] as AgendaViagemDTO[]),
            viagemService.historico(motoristaId).catch(() => [] as ViagemDiaResumoDTO[]),
          ])
        : [[] as AgendaViagemDTO[], [] as ViagemDiaResumoDTO[]];
      // Dias passados só existem no histórico; dias da janela vêm da agenda.
      const naAgenda = agenda.find((a) => a.idViagem === viagemId && a.data === dataViagem);
      const noHistorico = historico.find((h) => h.viagemId === viagemId && h.data === dataViagem);
      const dia: AgendaViagemDTO | null =
        naAgenda ??
        (noHistorico
          ? { idViagem: viagemId, periodo: noHistorico.periodo ?? '', data: dataViagem, idViagemDia: noHistorico.id, status: noHistorico.status, materializada: true }
          : null);
      // Ao abrir um dia planejado ainda não materializado, cria a execução para exibir a sugestão de paradas.
      let diaFinal = dia;
      if (dia && !dia.idViagemDia && (!dia.status || dia.status === 'PLANEJADA')) {
        const criada = await viagemService.prepararViagemDia(viagemId, dataViagem);
        diaFinal = { ...dia, idViagemDia: criada.id as number, status: criada.status ?? 'PLANEJADA', materializada: true };
      }
      setDiaViagem(diaFinal);
      setResumo(noHistorico ?? null);
      const idEncerrado = diaFinal?.idViagemDia && ENCERRADAS.includes(diaFinal.status ?? '') ? diaFinal.idViagemDia : null;
      const [paradasDia, prontidao, eventos, presencas, execucao] = await Promise.all([
        diaFinal?.idViagemDia ? viagemService.buscarParadasViagemDia(diaFinal.idViagemDia).catch(() => []) : Promise.resolve([]),
        diaFinal?.idViagemDia && diaFinal.status === 'PLANEJADA' ? viagemService.prontidao(viagemId).catch(() => null) : Promise.resolve(null),
        idEncerrado ? viagemService.historicoStatus(idEncerrado).catch(() => []) : Promise.resolve([]),
        idEncerrado && diaFinal?.status === 'FINALIZADA' ? viagemService.historicoPresenca(idEncerrado).catch(() => []) : Promise.resolve([]),
        diaFinal?.idViagemDia ? viagemService.visualizarViagemDia(diaFinal.idViagemDia).catch(() => null) : Promise.resolve(null),
      ]);
      setHorarioAjustado(!!execucao?.horarioPartidaPersonalizado);
      setParadas(paradasDia);
      setPronta(prontidao ? prontidao.pronta : null);
      setEventosStatus(eventos);
      setEventosPresenca(presencas);
    } catch (error) {
      console.error('Error loading trip details:', error);
      showToast('Não foi possível carregar os detalhes da viagem.', 'error');
    } finally {
      setLoading(false);
      setCarregado(true);
    }
  }, [viagemId, dataViagem, showToast, motoristaId]);

  // Altera só a data aberta (null volta ao horário padrão da viagem). Retorna se salvou.
  const handleSalvarHorario = async (horario: string | null): Promise<boolean> => {
    try {
      await viagemService.alterarHorarioPartidaDia(viagemId, dataViagem, horario);
      showToast(horario ? 'Horário de partida deste dia atualizado.' : 'Dia voltou ao horário padrão da viagem.', 'success');
      loadViagem();
      return true;
    } catch (error) {
      console.error('Error changing departure time:', error);
      showToast(getApiErrorMessage(error, 'Não foi possível alterar o horário de partida.'), 'error');
      return false;
    }
  };

  const handleSalvarNome = async (nome: string): Promise<boolean> => {
    try {
      const atualizada = await viagemService.atualizarNome(viagemId, nome);
      setViagem((atual) => (atual ? { ...atual, nome: atualizada.nome } : atualizada));
      showToast('Nome da viagem atualizado.', 'success');
      return true;
    } catch (error) {
      console.error('Error renaming trip:', error);
      showToast(getApiErrorMessage(error, 'Não foi possível alterar o nome da viagem.'), 'error');
      return false;
    }
  };

  const carregarEscolasDisponiveis = async () => {
    setEscolasDisponiveis(null);
    try {
      setEscolasDisponiveis(await viagemService.listarEscolasDisponiveis(viagemId));
    } catch (error) {
      console.error('Error loading available schools:', error);
      setEscolasDisponiveis([]);
      showToast('Não foi possível carregar as escolas disponíveis.', 'error');
    }
  };

  const handleAbrirConfig = () => {
    setShowConfig(true);
    carregarEscolasDisponiveis();
  };

  // Não insere alunos nem paradas: a viagem só passa a atender a escola após o aceite de solicitações.
  const handleAdicionarEscolas = async (escolaIds: number[]): Promise<boolean> => {
    try {
      await viagemService.adicionarEscolas(viagemId, escolaIds);
      showToast('Escolas adicionadas à viagem.', 'success');
      loadViagem();
      carregarEscolasDisponiveis();
      return true;
    } catch (error) {
      console.error('Error adding schools to trip:', error);
      showToast(getApiErrorMessage(error, 'Não foi possível adicionar as escolas.'), 'error');
      return false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadViagem();
    }, [loadViagem])
  );

  // Prepara o dia se ainda não houver execução, inicia e abre o atendimento com o mapa.
  const iniciarViagem = async () => {
    setIniciando(true);
    try {
      const viagemDia = diaViagem?.idViagemDia
        ? { id: diaViagem.idViagemDia }
        : await viagemService.prepararViagemDia(viagemId, dataViagem);
      const viagemDiaId = viagemDia.id as number;
      const exec = await viagemService.alterarStatusViagemDia(viagemDiaId, 'EM_ANDAMENTO');
      const stops = await viagemService.buscarParadasViagemDia(viagemDiaId);
      setActiveViagemDia({ ...exec, viagemId });
      setCurrentStops(stops);
      setShowConfirmStart(false);
      showToast('Viagem iniciada. Os responsáveis foram avisados.', 'success');
      navigation.navigate('DriverAttendance', { viagemDiaId });
    } catch (error) {
      console.error('Error starting trip:', error);
      setShowConfirmStart(false);
      showToast(getApiErrorMessage(error, 'Não foi possível iniciar a viagem.'), 'error');
      loadViagem();
    } finally {
      setIniciando(false);
    }
  };

  // Garante a execução do dia (materializa) antes de editar paradas ou cancelar.
  const garantirViagemDia = async (): Promise<number> => {
    if (diaViagem?.idViagemDia) return diaViagem.idViagemDia;
    const viagemDia = await viagemService.prepararViagemDia(viagemId, dataViagem);
    return viagemDia.id as number;
  };

  // Salva o preparo do dia (cria a execução se ainda não existir) e volta para Rotas.
  const handlePreparar = async () => {
    setPreparando(true);
    try {
      await garantirViagemDia();
      showToast('Viagem preparada.', 'success');
      navigation.navigate('DriverTrips');
    } catch (error) {
      console.error('Error preparing trip day:', error);
      showToast(getApiErrorMessage(error, 'Não foi possível preparar a viagem.'), 'error');
    } finally {
      setPreparando(false);
    }
  };

  const handleCancelar = async (motivo: string) => {
    setCancelando(true);
    try {
      const viagemDiaId = await garantirViagemDia();
      await viagemService.alterarStatusViagemDia(viagemDiaId, 'CANCELADA', motivo);
      setShowCancelar(false);
      showToast('Viagem do dia cancelada.', 'success');
      loadViagem();
    } catch (error) {
      console.error('Error cancelling trip day:', error);
      showToast(getApiErrorMessage(error, 'Não foi possível cancelar a viagem.'), 'error');
    } finally {
      setCancelando(false);
    }
  };

  if (!carregado) {
    return (
      <DriverLayout>
        <StateView kind="loading" title="Carregando viagem..." style={styles.loading} />
      </DriverLayout>
    );
  }

  if (!viagem) return null;

  const concluida = diaViagem?.status === 'FINALIZADA';
  const encerrada = ENCERRADAS.includes(diaViagem?.status ?? '');
  const emAndamento = diaViagem?.status === 'EM_ANDAMENTO';
  const planejada = !diaViagem?.status || diaViagem.status === 'PLANEJADA';
  const horarioDoDia = diaViagem?.horarioPartida ?? viagem.horarioPartida;
  const hoje = dataViagem === todayIso();
  const statusChip = encerrada
    ? statusInfo('viagemDia', diaViagem?.status)
    : statusExecucao(diaViagem?.status, { materializada: !!diaViagem?.idViagemDia, pronta });
  const botaoBuscarAlunos = (
    <Button
      label="Buscar alunos"
      icon="search"
      variant="secondary"
      onPress={() => navigation.navigate('DriverSearchStudents', { viagemId })}
      disabled={loading}
      fullWidth
    />
  );

  // Linha do tempo do histórico. Concluída: Programada, Em andamento, embarques/desembarques por horário e Concluída.
  // Cancelada: ordem pelo horário do registro.
  const nomeDoAluno = (idDependente: number) =>
    paradas.flatMap((p) => p.listaDependentes ?? []).find((d) => d.id === idDependente)?.nomeDependente ?? `Aluno ${idDependente}`;
  // Na ida o embarque é na casa do aluno e o desembarque na escola; na volta é o contrário. Falta usa o local de embarque.
  const localDoAluno = (idDependente: number, statusNovo: string) => {
    const contem = (p: ParadaViagemDTO) => (p.listaDependentes ?? []).some((d) => d.id === idDependente);
    const paradaEscola = paradas.find((p) => p.tipoParada === 'ESCOLA' && contem(p));
    const paradaAluno = paradas.find((p) => p.tipoParada !== 'ESCOLA' && p.tipoParada !== 'MOTORISTA' && contem(p));
    const embarqueNaEscola = !ida;
    const parada =
      statusNovo === 'DESEMBARCADO' ? (embarqueNaEscola ? paradaAluno : paradaEscola) : embarqueNaEscola ? paradaEscola : paradaAluno;
    if (!parada) return '';
    return parada.tipoParada === 'ESCOLA' ? parada.nomeLocal.replace(/^Escola:\s*/, '') : tituloParada(parada);
  };
  const linhaDoTempo = [
    ...eventosStatus.map((evento) => ({
      chave: `status-${evento.id}`,
      ocorridoEm: evento.ocorridoEm,
      fase: evento.statusNovo === 'PLANEJADA' ? 0 : evento.statusNovo === 'EM_ANDAMENTO' ? 1 : 3,
      titulo: statusInfo('viagemDia', evento.statusNovo).label,
      detalhe: `${formatTime(evento.ocorridoEm)}${evento.motivo ? ` · ${evento.motivo}` : ''}`,
    })),
    ...eventosPresenca
      .filter((evento) => evento.statusNovo === 'EMBARCADO' || evento.statusNovo === 'DESEMBARCADO' || evento.statusNovo === 'FALTOU')
      .map((evento) => {
        const rotulo = evento.statusNovo === 'EMBARCADO' ? 'Embarque' : evento.statusNovo === 'DESEMBARCADO' ? 'Desembarque' : 'Falta';
        const local = localDoAluno(evento.idDependente, evento.statusNovo);
        return {
          chave: `presenca-${evento.id}`,
          ocorridoEm: evento.ocorridoEm,
          fase: 2,
          titulo: `${rotulo}: ${nomeDoAluno(evento.idDependente)}`,
          detalhe: `${formatTime(evento.ocorridoEm)}${local ? ` · ${local}` : ''}`,
        };
      }),
  ].sort((a, b) => (concluida ? a.fase - b.fase : 0) || new Date(a.ocorridoEm).getTime() - new Date(b.ocorridoEm).getTime());

  return (
    <DriverLayout>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <ScreenHeader
          title={viagemNome(viagem)}
          subtitle={[formatDayShort(dataViagem), horarioDoDia ? `saída ${horarioDoDia}` : null, escolasNomes(viagem)].filter(Boolean).join(' - ')}
          onBack={() => navigation.goBack()}
          titleAccessory={
            // Sempre disponível: o nome pode ser trocado mesmo depois da viagem do dia; horário e escolas mostram as próprias restrições.
            <Pressable
              onPress={handleAbrirConfig}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Configurar viagem"
              hitSlop={12}
            >
              <Feather name="settings" size={layout.icon} color={colors.slate500} />
            </Pressable>
          }
          right={<Chip label={statusChip.label} tone={statusChip.tone} size="sm" />}
        />

        {encerrada ? (
          <View style={styles.section}>
            <View style={styles.roteiro}>
              <Text style={styles.roteiroLabel}>Histórico da viagem</Text>
              {linhaDoTempo.map((item) => (
                <View key={item.chave} style={styles.paradaCard}>
                  <View style={styles.paradaInfo}>
                    <Text style={styles.depName}>{item.titulo}</Text>
                    <Text style={styles.depDetail}>{item.detalhe}</Text>
                  </View>
                </View>
              ))}
              {resumo && (
                <View style={styles.paradaCard}>
                  <View style={styles.paradaInfo}>
                    <Text style={styles.depName}>
                      {resumo.embarcados} embarcados · {resumo.desembarcados} desembarcados · {resumo.faltas} faltas
                    </Text>
                    <Text style={styles.depDetail}>
                      {resumo.inicio ? `Início ${formatTime(resumo.inicio)}` : 'Sem início registrado'}
                      {resumo.fim ? ` · Fim ${formatTime(resumo.fim)}` : ''}
                      {resumo.motivo ? ` · Motivo: ${resumo.motivo}` : ''}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            {diaViagem?.idViagemDia && paradas.length > 0 ? (
              <Pressable
                onPress={() => navigation.navigate('DriverRouteOrder', { viagemDiaId: diaViagem.idViagemDia!, emExecucao: emAndamento })}
                accessibilityRole="button"
                accessibilityLabel="Alterar ordem das paradas"
                style={({ pressed }) => [styles.roteiro, pressed && styles.roteiroPressed]}
              >
                <Text style={styles.roteiroLabel}>Roteiro · {paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'}</Text>
                {paradas.map((p, i) => (
                  <View key={p.id ?? i} style={styles.paradaCard}>
                    <View style={styles.paradaNumero}>
                      <Text style={styles.paradaNumeroTexto}>{i + 1}</Text>
                    </View>
                    <View style={styles.paradaInfo}>
                      {/* Sem endereço na lista: ele fica no pop-up de detalhes. */}
                      <Text style={styles.depName}>{rotuloParada(p, ida)}</Text>
                      {p.tipoParada !== 'MOTORISTA' && p.listaDependentes.length > 0 && (
                        <Text style={styles.depDetail}>
                          {p.listaDependentes.length} {p.listaDependentes.length === 1 ? 'aluno' : 'alunos'}
                        </Text>
                      )}
                    </View>
                    {p.tipoParada !== 'MOTORISTA' && (
                      <Pressable
                        onPress={() => setDetalhesParada(p)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver detalhes: ${rotuloParada(p, ida)}`}
                        hitSlop={8}
                        style={styles.paradaDetalhes}
                      >
                        <Feather name="info" size={20} color={colors.ink} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </Pressable>
            ) : (
              <StateView kind="empty" icon="map" title="Roteiro não preparado." message="Toque em Preparar viagem para montar o roteiro deste dia." />
            )}
          </View>
        )}


        <ParadaDetalhesModal parada={detalhesParada} ida={ida} onClose={() => setDetalhesParada(null)} />

        <AvisoAtrasoModal
          visible={showAviso}
          viagemDiaId={diaViagem?.idViagemDia}
          onClose={() => setShowAviso(false)}
        />

        <ConfigurarViagemModal
          visible={showConfig}
          nomeAtual={viagem.nome ?? ''}
          nomePadrao={viagemNome({ ...viagem, nome: null })}
          horarioAtual={horarioDoDia ?? '07:00'}
          horarioAjustado={horarioAjustado}
          podeEditarHorario={planejada}
          podeAdicionarEscolas={viagem.ativo !== false && !(hoje && (emAndamento || (encerrada && diaViagem?.status !== 'CANCELADA')))}
          escolasDisponiveis={escolasDisponiveis}
          onSalvarNome={handleSalvarNome}
          onSalvarHorario={handleSalvarHorario}
          onAdicionarEscolas={handleAdicionarEscolas}
          onClose={() => setShowConfig(false)}
        />

        <ConfirmDialog
          visible={showConfirmStart}
          title="Iniciar viagem agora?"
          message="O horário de início será registrado e os responsáveis serão avisados."
          confirmLabel="Iniciar viagem"
          cancelLabel="Voltar"
          destructive={false}
          loading={iniciando}
          onConfirm={iniciarViagem}
          onCancel={() => setShowConfirmStart(false)}
        />

        <ReasonDialog
          visible={showCancelar}
          title="Cancelar viagem do dia"
          message="A viagem deste dia será cancelada. Os responsáveis serão avisados."
          confirmLabel="Cancelar viagem"
          placeholder="Informe o motivo do cancelamento"
          destructive
          loading={cancelando}
          onConfirm={handleCancelar}
          onCancel={() => setShowCancelar(false)}
        />
      </ScrollView>

      {!encerrada && (
        <View style={styles.footer}>
          {emAndamento ? (
            <Button
              label="Abrir atendimento"
              icon="play"
              onPress={() => navigation.navigate('DriverAttendance', { viagemDiaId: diaViagem!.idViagemDia! })}
              fullWidth
            />
          ) : hoje ? (
            <>
              {botaoBuscarAlunos}
              <View style={styles.linhaSecundaria}>
                <View style={styles.flex}>
                  <Button
                    label="Enviar aviso"
                    icon="bell"
                    variant="secondary"
                    onPress={() => setShowAviso(true)}
                    disabled={loading || !diaViagem?.idViagemDia}
                    fullWidth
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar viagem"
                  onPress={() => setShowCancelar(true)}
                  disabled={loading}
                  style={({ pressed }) => [styles.cancelar, pressed && styles.cancelarPressionado]}
                >
                  <Text style={[styles.cancelarTexto, loading && styles.cancelarDesabilitado]}>Cancelar viagem</Text>
                </Pressable>
              </View>
              <Button label="Iniciar viagem" icon="play" onPress={() => setShowConfirmStart(true)} disabled={loading || iniciando || viagem.ativo === false} fullWidth />
            </>
          ) : (
            <>
              {botaoBuscarAlunos}
              <Button
                label="Preparar viagem"
                icon="edit-3"
                onPress={handlePreparar}
                disabled={loading || preparando || !planejada}
                fullWidth
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar viagem"
                onPress={() => setShowCancelar(true)}
                disabled={loading}
                style={({ pressed }) => [styles.cancelarFull, pressed && styles.cancelarPressionado]}
              >
                <Text style={[styles.cancelarTexto, loading && styles.cancelarDesabilitado]}>Cancelar viagem</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
      {encerrada && (
        <View style={styles.footer}>
          <Button label="Voltar para a home" icon="home" variant="success" onPress={() => navigation.navigate('DriverMain')} fullWidth />
        </View>
      )}
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 800, alignSelf: 'center' },
  scroll: { flex: 1 },
  footer: {
    padding: layout.screenMargin,
    gap: layout.buttonGap,
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  loading: { flex: 1 },
  section: { marginBottom: spacing.xxl },
  roteiro: {
    backgroundColor: colors.infoTint,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    gap: spacing.sm,
  },
  roteiroPressed: { opacity: 0.85 },
  roteiroLabel: { ...typography.captionBold, color: colors.info, textTransform: 'uppercase' },
  paradaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  paradaNumero: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paradaNumeroTexto: { ...typography.label, color: colors.ink },
  paradaInfo: { flex: 1, minWidth: 0, gap: spacing.xs },
  paradaDetalhes: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  depName: { ...typography.label, fontSize: 18, lineHeight: 22, color: colors.ink },
  depDetail: { ...typography.caption, color: colors.slate500 },
  linhaSecundaria: { flexDirection: 'row', alignItems: 'center', gap: layout.buttonGap },
  flex: { flex: 1 },
  cancelar: {
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelarPressionado: { opacity: 0.6 },
  cancelarFull: { minHeight: layout.minTouch, justifyContent: 'center', alignItems: 'center' },
  cancelarTexto: { ...typography.label, color: colors.danger },
  cancelarDesabilitado: { color: colors.disabledText },
});
