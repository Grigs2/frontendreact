import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { escolasNomes, viagemNome, viagemService } from '../services/viagemService';
import { AgendaViagemDTO, MotoristaDTO, ParadaViagemDTO, ViagemDTO } from '../types';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDayShort, todayIso } from '../utils/format';
import DriverLayout from '../components/DriverLayout';
import AvisoAtrasoModal from '../components/AvisoAtrasoModal';
import EditarNomeViagemModal from '../components/EditarNomeViagemModal';

import ConfirmDialog from '../components/ConfirmDialog';
import { Button, Chip, ScreenHeader, StateView } from '../components/ui';
import { colors, layout, radius, spacing, typography } from '../theme';
import { statusExecucao } from '../utils/statusLabels';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverTripDetails'>;

/** Casa do motorista usa o nome; alunos e escola usam rua e número (antes do primeiro " - "). */
function tituloParada(parada: ParadaViagemDTO): string {
  if (parada.tipoParada === 'MOTORISTA') return parada.nomeLocal || parada.endereco;
  return (parada.endereco ?? '').split(' - ')[0] || parada.nomeLocal;
}

/** Ex.: "Embarque: Ana Clara, Pedro · 2 alunos" ou "Desembarque: Escola Estadual X - Ana Clara · 1 aluno". */
function subtituloParada(parada: ParadaViagemDTO, ida: boolean): string {
  const alunos = parada.listaDependentes ?? [];
  const resumo =
    alunos.length === 0
      ? 'Sem alunos'
      : `${alunos.map((a) => a.nomeDependente).join(', ')} · ${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'}`;
  if (parada.tipoParada === 'ESCOLA') {
    const escola = parada.nomeLocal.replace(/^Escola:\s*/, '');
    return `${ida ? 'Desembarque' : 'Embarque'}: ${escola}${alunos.length ? ` - ${resumo}` : ''}`;
  }
  if (alunos.length === 0) return resumo;
  return `${ida ? 'Embarque' : 'Desembarque'}: ${resumo}`;
}

export default function DriverTripDetailsScreen({ route, navigation }: Props) {
  const { viagemId, data: dataParam } = route.params;
  const dataViagem = dataParam ?? todayIso();
  const { currentUser, showToast, setActiveViagemDia, setCurrentStops } = useAppContext();
  const [viagem, setViagem] = useState<ViagemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
  const [showEditarNome, setShowEditarNome] = useState(false);
  const [savingNome, setSavingNome] = useState(false);
  const [diaViagem, setDiaViagem] = useState<AgendaViagemDTO | null>(null);
  const [paradas, setParadas] = useState<ParadaViagemDTO[]>([]);
  const [showAviso, setShowAviso] = useState(false);
  const motoristaId = (currentUser as MotoristaDTO)?.id;
  // Mesma regra da presença: na ida o embarque é no aluno e o desembarque na escola.
  const ida = viagem?.periodo?.endsWith('IDA') ?? false;

  const loadViagem = useCallback(async () => {
    setLoading(true);
    try {
      const data = await viagemService.visualizar(viagemId);
      setViagem(data);
      const agenda = motoristaId ? await viagemService.agenda(motoristaId).catch(() => [] as AgendaViagemDTO[]) : [];
      const dia = agenda.find((a) => a.idViagem === viagemId && a.data === dataViagem) ?? null;
      setDiaViagem(dia);
      setParadas(dia?.idViagemDia ? await viagemService.buscarParadasViagemDia(dia.idViagemDia).catch(() => []) : []);
    } catch (error) {
      console.error('Error loading trip details:', error);
      showToast('Não foi possível carregar os detalhes da viagem.', 'error');
    } finally {
      setLoading(false);
    }
  }, [viagemId, dataViagem, showToast, motoristaId]);

  const handleSalvarNome = async (nome: string) => {
    setSavingNome(true);
    try {
      const atualizada = await viagemService.atualizarNome(viagemId, nome);
      setViagem((atual) => (atual ? { ...atual, nome: atualizada.nome } : atualizada));
      setShowEditarNome(false);
      showToast('Nome da viagem atualizado.', 'success');
    } catch (error) {
      console.error('Error renaming trip:', error);
      showToast('Não foi possível alterar o nome da viagem.', 'error');
    } finally {
      setSavingNome(false);
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

  const handleDesativarViagem = async () => {
    setLoading(true);
    try {
      await viagemService.desativarViagem(viagemId);
      showToast('Viagem desativada com sucesso!', 'success');
      setShowConfirmDeactivate(false);
      navigation.navigate('DriverTrips');
    } catch (error) {
      console.error('Error deactivating trip:', error);
      showToast('Não foi possível desativar a viagem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !viagem) {
    return (
      <DriverLayout>
        <StateView kind="loading" title="Carregando viagem..." style={styles.loading} />
      </DriverLayout>
    );
  }

  if (!viagem) return null;

  const concluida = diaViagem?.status === 'FINALIZADA';
  const statusChip = statusExecucao(diaViagem?.status, { materializada: !!diaViagem?.idViagemDia });


  return (
    <DriverLayout>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <ScreenHeader
          title={viagemNome(viagem)}
          subtitle={[formatDayShort(dataViagem), escolasNomes(viagem)].filter(Boolean).join(' - ')}
          onBack={() => navigation.goBack()}
          onTitlePress={() => setShowEditarNome(true)}
          right={<Chip label={statusChip.label} tone={statusChip.tone} size="sm" />}
        />


        <View style={styles.section}>
          {diaViagem?.idViagemDia && paradas.length > 0 ? (
            <Pressable
              onPress={() => navigation.navigate('DriverRouteOrder', { viagemDiaId: diaViagem.idViagemDia!, emExecucao: diaViagem.status === 'EM_ANDAMENTO' })}
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
                    <Text style={styles.depName}>{tituloParada(p)}</Text>
                    {p.tipoParada !== 'MOTORISTA' && <Text style={styles.depDetail}>{subtituloParada(p, ida)}</Text>}
                  </View>
                </View>
              ))}
            </Pressable>
          ) : (
            <StateView kind="empty" icon="map" title="Roteiro não preparado." message="Toque em Iniciar viagem para preparar o dia e montar o roteiro." />
          )}
        </View>

        <AvisoAtrasoModal
          visible={showAviso}
          viagemDiaId={diaViagem?.idViagemDia}
          onClose={() => setShowAviso(false)}
        />

        <EditarNomeViagemModal
          visible={showEditarNome}
          nomeAtual={viagem.nome ?? ''}
          nomePadrao={viagemNome({ ...viagem, nome: null })}
          saving={savingNome}
          onSave={handleSalvarNome}
          onClose={() => setShowEditarNome(false)}
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

        <ConfirmDialog
          visible={showConfirmDeactivate}
          title="Cancelar viagem"
          message="Tem certeza que deseja cancelar esta viagem permanentemente? Esta ação não pode ser desfeita."
          confirmLabel="Cancelar viagem"
          cancelLabel="Voltar"
          onConfirm={handleDesativarViagem}
          onCancel={() => setShowConfirmDeactivate(false)}
          destructive={true}
          loading={loading}
        />
      </ScrollView>

      <View style={styles.footer}>
        {concluida ? (
          <Button label="Voltar para a home" icon="home" variant="success" onPress={() => navigation.navigate('DriverMain')} fullWidth />
        ) : (
          <>
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
                onPress={() => setShowConfirmDeactivate(true)}
                disabled={loading}
                style={({ pressed }) => [styles.cancelar, pressed && styles.cancelarPressionado]}
              >
                <Text style={[styles.cancelarTexto, loading && styles.cancelarDesabilitado]}>Cancelar viagem</Text>
              </Pressable>
            </View>
            <Button label="Iniciar viagem" icon="play" onPress={() => setShowConfirmStart(true)} disabled={loading || iniciando || viagem.ativo === false} fullWidth />
          </>
        )}
      </View>
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
  cancelarTexto: { ...typography.label, color: colors.danger },
  cancelarDesabilitado: { color: colors.disabledText },
});
