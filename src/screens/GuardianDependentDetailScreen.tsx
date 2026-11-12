import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import AbsenceModal from '../components/AbsenceModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { InfoLine, Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, Chip, ListRow, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { redeResponsaveisService, categoriaLabel } from '../services/redeResponsaveisService';
import { localizacaoService, RETENCAO_GPS_DIAS } from '../services/localizacaoService';
import { periodoLabel, viagemNome } from '../services/viagemService';
import {
  EnderecoDependenteDTO,
  HistoricoAlunoDTO,
  ResponsavelDTO,
  SolicitacaoDTO,
  VinculoResponsavelDTO,
} from '../types';
import { isoToBrDate } from '../utils/masks';
import { ageLabel } from '../utils/validators';
import { statusInfo } from '../utils/statusLabels';
import { formatDate, formatDayShort, formatTime } from '../utils/format';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependentDetail'>;

const FINALIDADE: Record<string, string> = { EMBARQUE: 'Embarque', DESEMBARQUE: 'Desembarque', AMBOS: 'Embarque e desembarque' };

/** 3.3.8 — detalhe do aluno: dados, endereços, responsáveis, motoristas, histórico, ausências e localização. */
export default function GuardianDependentDetailScreen({ navigation, route }: Props) {
  const { dependenteId } = route.params;
  const { currentUser, showToast } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;
  const dependente = guardian?.dependentes?.find((d) => d.id === dependenteId);

  const [enderecos, setEnderecos] = useState<EnderecoDependenteDTO[] | null>(null);
  const [responsaveis, setResponsaveis] = useState<VinculoResponsavelDTO[] | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDTO[]>([]);
  const [historico, setHistorico] = useState<HistoricoAlunoDTO[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ausencia, setAusencia] = useState(false);

  // Consentimento de localização (decisão 10): basta um responsável ativo autorizar.
  const [gpsAutorizado, setGpsAutorizado] = useState<boolean | null>(null);
  const [gpsConfirm, setGpsConfirm] = useState<boolean | null>(null);
  const [gpsSalvando, setGpsSalvando] = useState(false);

  const load = useCallback(async () => {
    if (!guardian?.id) return;
    const [end, resp, sol, hist] = await Promise.allSettled([
      responsavelService.listarEnderecosDependente(dependenteId),
      redeResponsaveisService.responsaveis(dependenteId),
      responsavelService.listarSolicitacoes(guardian.id),
      responsavelService.historicoDependente(dependenteId),
    ]);
    setEnderecos(end.status === 'fulfilled' ? end.value : []);
    setResponsaveis(resp.status === 'fulfilled' ? resp.value : []);
    setSolicitacoes(sol.status === 'fulfilled' ? sol.value.filter((s) => s.dependenteId === dependenteId) : []);
    setHistorico(hist.status === 'fulfilled' ? hist.value : []);
    setRefreshing(false);
  }, [dependenteId, guardian?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!dependente) {
    return (
      <GuardianLayout>
        <StateView kind="error" title="Aluno não encontrado" message="Volte e abra o aluno novamente." actionLabel="Voltar" onAction={() => navigation.goBack()} />
      </GuardianLayout>
    );
  }

  const ativos = (enderecos ?? []).filter((e) => e.ativo !== false);
  const motoristas = solicitacoes.filter((s) => s.aceito && !s.dataFim);
  const transporteAtivo = motoristas.length > 0;
  const souCriador = responsaveis?.some((r) => r.responsavelCriador && r.responsavelId === guardian.id) ?? false;
  const idade = ageLabel(isoToBrDate(dependente.dataNascimento));

  const salvarGps = async (aceito: boolean) => {
    setGpsSalvando(true);
    try {
      const r = await localizacaoService.consentirDependente(dependenteId, aceito);
      setGpsAutorizado(r.aceito);
      showToast(aceito ? 'Compartilhamento de localização autorizado.' : 'Compartilhamento de localização revogado.', 'success');
      setGpsConfirm(null);
    } catch (e) {
      showToast(
        getApiStatus(e) === 503
          ? 'A localização está desativada no servidor no momento.'
          : getApiErrorMessage(e, 'Não foi possível salvar sua escolha.'),
        'error',
      );
    } finally {
      setGpsSalvando(false);
    }
  };

  return (
    <GuardianLayout>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <ScreenHeader
          title={dependente.nome}
          subtitle={[idade, periodoLabel(dependente.periodo)].filter(Boolean).join(' · ')}
          onBack={() => navigation.goBack()}
        />

        {/* Dados */}
        <Card style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Dados do aluno</Text>
            <Chip label={transporteAtivo ? 'Com transporte' : 'Sem transporte'} tone={transporteAtivo ? 'success' : 'neutral'} size="sm" />
          </View>
          <InfoLine label="Escola" value={dependente.escola?.nome || 'Não informada'} />
          <InfoLine label="Nascimento" value={formatDate(dependente.dataNascimento)} />
          <InfoLine label="Período" value={periodoLabel(dependente.periodo)} />
          <Button
            label="Editar dados"
            icon="edit-2"
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('GuardianDependentForm', { dependentId: dependenteId })}
            fullWidth
          />
        </Card>

        {/* Ações rápidas */}
        <View style={styles.actions}>
          {transporteAtivo ? (
            <>
              <Button label="Acompanhar viagem" icon="navigation" onPress={() => navigation.navigate('GuardianMonitoring', { dependenteId })} fullWidth />
              <Button label="Avisar falta" icon="calendar" variant="secondary" onPress={() => setAusencia(true)} fullWidth />
            </>
          ) : (
            <Button label="Achar motorista" icon="search" onPress={() => navigation.navigate('GuardianSearchDriver')} fullWidth />
          )}
        </View>

        {/* Endereços (3.4) */}
        <SectionTitle>Endereços</SectionTitle>
        <Card style={styles.card}>
          {enderecos === null ? (
            <StateView kind="loading" />
          ) : ativos.length ? (
            ativos.map((e, i) => (
              <ListRow
                key={e.id}
                icon="map-pin"
                title={`${e.logradouro}, ${e.numero}${e.complemento ? ` - ${e.complemento}` : ''}`}
                caption={`${FINALIDADE[e.finalidade] ?? e.finalidade} · ${e.bairro}, ${e.cidade}/${e.uf}`}
                divider={i > 0}
                right={e.statusValidacao === 'PENDENTE' ? <Chip label="CEP não confirmado" tone="warning" size="sm" /> : undefined}
              />
            ))
          ) : (
            <Notice tone="warning">Sem endereço ativo. O motorista precisa do endereço de embarque para montar a rota.</Notice>
          )}
          <Button
            label="Gerenciar endereços"
            icon="map"
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('GuardianDependentAddresses', { dependenteId })}
            fullWidth
          />
        </Card>

        {/* Responsáveis (3.5) */}
        <SectionTitle>Responsáveis</SectionTitle>
        <Card style={styles.card}>
          {responsaveis === null ? (
            <StateView kind="loading" />
          ) : (
            responsaveis.map((r, i) => (
              <ListRow
                key={r.responsavelId}
                icon="user"
                title={r.responsavelId === guardian.id ? `${r.nome} (você)` : r.nome}
                caption={categoriaLabel(r.categoria)}
                divider={i > 0}
                right={r.responsavelCriador ? <Chip label="Criador" tone="info" size="sm" /> : undefined}
              />
            ))
          )}
          <Button
            label={souCriador ? 'Convidar ou gerenciar' : 'Ver responsáveis'}
            icon="users"
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('GuardianDependentGuardians', { dependenteId })}
            fullWidth
          />
        </Card>

        {/* Motoristas vinculados (3.6.8) */}
        <SectionTitle>Motoristas</SectionTitle>
        <Card style={styles.card}>
          {motoristas.length ? (
            motoristas.map((s, i) => (
              <ListRow
                key={s.id}
                icon="truck"
                title={s.motoristaNome || 'Motorista'}
                caption={[s.viagemNome || viagemNome({ nome: null, escolas: null, periodo: s.viagemPeriodo || s.periodo || '' }), s.motoristaTelefone]
                  .filter(Boolean)
                  .join(' · ')}
                divider={i > 0}
                right={<Chip label="Ativo" tone="success" size="sm" />}
              />
            ))
          ) : (
            <Text style={styles.muted} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Nenhum motorista vinculado a este aluno.
            </Text>
          )}
          <Button label="Ver vínculos" icon="link" variant="tertiary" size="md" onPress={() => navigation.navigate('GuardianInvites')} fullWidth />
        </Card>

        {/* Localização */}
        <SectionTitle>Localização do transporte</SectionTitle>
        <Card style={styles.card}>
          <View style={styles.consentRow}>
            <View style={styles.iconSlot}>
              <Feather name="map-pin" size={layout.icon} color={colors.ink} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Compartilhar localização</Text>
              <Text style={styles.muted} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Permite ver o veículo no mapa durante as viagens deste aluno.
              </Text>
            </View>
            <Switch
              value={!!gpsAutorizado}
              onValueChange={(v) => setGpsConfirm(v)}
              disabled={gpsSalvando}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
              accessibilityLabel="Compartilhar localização do transporte"
            />
          </View>
          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            A posição é enviada a cada 15 segundos, só com a viagem em andamento, e guardada por {RETENCAO_GPS_DIAS} dias.
            Veem: você, os outros responsáveis do aluno e o motorista. Basta um responsável autorizar; revogar suspende o
            GPS da viagem atual, sem afetar o registro de embarque.
          </Text>
          {gpsAutorizado === null && (
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Sua escolha atual não é exibida pelo servidor; use a chave para autorizar ou revogar.
            </Text>
          )}
        </Card>

        {/* Histórico (3.3.10) */}
        <SectionTitle>Últimas viagens</SectionTitle>
        <Card style={styles.card}>
          {historico === null ? (
            <StateView kind="loading" />
          ) : historico.length ? (
            historico.slice(0, 5).map((h, i) => {
              const p = statusInfo('presenca', h.statusPresenca);
              return (
                <View key={`${h.viagemDiaId}-${i}`} style={[styles.histRow, i > 0 && styles.divider]}>
                  <View style={styles.flex}>
                    <Text style={styles.histTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {formatDayShort(h.data)} · {periodoLabel(h.periodo)}
                    </Text>
                    <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {[h.motoristaNome, h.horarioEmbarque && `embarque ${formatTime(h.horarioEmbarque)}`, h.horarioDesembarque && `desembarque ${formatTime(h.horarioDesembarque)}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Chip label={p.label} tone={p.tone} size="sm" />
                </View>
              );
            })
          ) : (
            <Text style={styles.muted} maxFontSizeMultiplier={maxFontSizeMultiplier}>Nenhuma viagem nos últimos 30 dias.</Text>
          )}
          <Button label="Ver histórico completo" icon="clock" variant="tertiary" size="md" onPress={() => navigation.navigate('GuardianHistory')} fullWidth />
        </Card>
      </ScrollView>

      <AbsenceModal
        visible={ausencia}
        dependenteId={dependenteId}
        dependenteNome={dependente.nome}
        onClose={() => setAusencia(false)}
      />

      <ConfirmDialog
        visible={gpsConfirm !== null}
        title={gpsConfirm ? 'Autorizar localização?' : 'Revogar localização?'}
        message={
          gpsConfirm
            ? 'Durante as viagens deste aluno, você e os demais responsáveis poderão ver a posição do veículo.'
            : 'O GPS da viagem atual será suspenso para todos. O embarque e o desembarque continuam sendo registrados.'
        }
        confirmLabel={gpsConfirm ? 'Autorizar' : 'Revogar'}
        destructive={!gpsConfirm}
        loading={gpsSalvando}
        onConfirm={() => salvarGps(!!gpsConfirm)}
        onCancel={() => setGpsConfirm(null)}
      />
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 800, alignSelf: 'center', gap: spacing.lg },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.ink },
  actions: { gap: layout.buttonGap },
  muted: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconSlot: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  histTitle: { ...typography.label, color: colors.ink },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
