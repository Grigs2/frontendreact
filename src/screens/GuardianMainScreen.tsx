import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import HomeHeaderArt from '../components/HomeHeaderArt';
import { ProximaInteracaoBox, StatusLight } from '../components/TripProgress';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel } from '../services/viagemService';
import { acompanhamentoService, execucaoDeHoje, ViagemDoAluno } from '../services/acompanhamentoService';
import { Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Button, Card, ShortcutCard } from '../components/ui';
import { ConviteResponsavelDTO, DependenteDTO, ResponsavelDTO, SolicitacaoDTO } from '../types';
import { redeResponsaveisService } from '../services/redeResponsaveisService';
import { calcularProgresso, luzStatus, maisRecente } from '../utils/progressoViagem';
import { formatTime } from '../utils/format';
import { isoToBrDate } from '../utils/masks';
import { ageLabel } from '../utils/validators';
import { borders, colors, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianMain'>;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Atualização do estado das viagens enquanto o Início está aberto. */
const INTERVALO_ATUALIZACAO_MS = 30000;

/**
 * Início do responsável: arte do logo sobre o trilho de paradas, convites que pedem resposta e um card
 * por aluno com a luz de status e a próxima interação da viagem. Sem atalhos que repetem a barra inferior.
 */
export default function GuardianMainScreen({ navigation }: Props) {
  const { currentUser, pendingSolicitations, updateSolicitations } = useAppContext();
  const [convitesResp, setConvitesResp] = useState<ConviteResponsavelDTO[]>([]);
  const [viagens, setViagens] = useState<Record<number, ViagemDoAluno>>({});
  const guardian = currentUser as ResponsavelDTO;
  const dependentes = guardian?.dependentes ?? [];

  const carregarViagens = useCallback(() => {
    Promise.all(
      (guardian?.dependentes ?? []).filter((d) => d.id).map((d) =>
        acompanhamentoService.carregar(d.id!).then((v) => [d.id!, v] as const),
      ),
    ).then((res) => setViagens(Object.fromEntries(res)));
  }, [guardian?.dependentes]);

  useFocusEffect(
    useCallback(() => {
      if (!guardian?.id) return undefined;
      responsavelService.listarSolicitacoes(guardian.id).then(updateSolicitations).catch(() => undefined);
      redeResponsaveisService.pendentes().then(setConvitesResp).catch(() => setConvitesResp([]));
      carregarViagens();
      const timer = setInterval(carregarViagens, INTERVALO_ATUALIZACAO_MS);
      return () => clearInterval(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guardian?.id, carregarViagens]),
  );

  const convites = pendingSolicitations.filter((s) => !s.respondido && s.origem !== 'RESPONSAVEL');
  const ativos = pendingSolicitations.filter((s) => s.aceito && !s.dataFim);

  return (
    <GuardianLayout>
      <View style={homeStyles.wrapper}>
        <HomeScroll>
          <HomeHeaderArt />

          {convites.length > 0 && (
            <HighlightCard
              chip="Atenção"
              chipTone="danger"
              variant="alert"
              icon="mail"
              title={plural(convites.length, 'convite de transporte', 'convites de transporte')}
              lines={[`${convites[0].motoristaNome || 'Um motorista'} convidou ${convites[0].dependenteNome || 'seu aluno'} para a ${convites[0].viagemNome || 'viagem'}.`]}
            >
              <Button label="Responder convites" variant="secondary" onPress={() => navigation.navigate('GuardianInvites')} fullWidth />
            </HighlightCard>
          )}

          {convitesResp.length > 0 && (
            <HighlightCard
              chip="Convite"
              chipTone="warning"
              icon="users"
              title={plural(convitesResp.length, 'convite para acompanhar um aluno', 'convites para acompanhar alunos')}
              lines={[`${convitesResp[0].convidadorNome || 'Um responsável'} convidou você para acompanhar ${convitesResp[0].dependenteNome}.`]}
            >
              <Button label="Ver convites" variant="secondary" onPress={() => navigation.navigate('GuardianInvites')} fullWidth />
            </HighlightCard>
          )}

          {dependentes.length === 0 ? (
            <HighlightCard chip="Primeiros passos" chipTone="warning" icon="user-plus" title="Cadastre seu primeiro aluno" lines={['Com o aluno cadastrado, você encontra motoristas próximos e pede vaga.']}>
              <Button label="Cadastrar aluno" variant="secondary" onPress={() => navigation.navigate('GuardianDependentForm')} fullWidth />
            </HighlightCard>
          ) : (
            dependentes.map((d) => (
              <CardViagemAluno
                key={d.id}
                dependente={d}
                vinculo={ativos.find((s) => s.dependenteId === d.id)}
                viagem={d.id ? viagens[d.id] : undefined}
                onAbrir={() => d.id && navigation.navigate('GuardianDependentDetail', { dependenteId: d.id })}
                onAcompanhar={() => d.id && navigation.navigate('GuardianMonitoring', { dependenteId: d.id })}
                onBuscarMotorista={() => navigation.navigate('GuardianSearchDriver')}
              />
            ))
          )}

          {/* Só o que não está na barra inferior (Alunos, Motoristas, Vínculos e Perfil já estão; Notificações fica no sino). */}
          <SectionTitle>Atalhos</SectionTitle>
          <Grid>
            <ShortcutCard label="Histórico" icon="clock" caption="Ver viagens" onPress={() => navigation.navigate('GuardianHistory')} />
          </Grid>
        </HomeScroll>
      </View>
    </GuardianLayout>
  );
}

interface CardProps {
  dependente: DependenteDTO;
  vinculo?: SolicitacaoDTO;
  viagem?: ViagemDoAluno;
  onAbrir: () => void;
  onAcompanhar: () => void;
  onBuscarMotorista: () => void;
}

/** Card da viagem de um aluno: luz de status no canto, dados do transporte e a próxima interação. */
function CardViagemAluno({ dependente: d, vinculo, viagem, onAbrir, onAcompanhar, onBuscarMotorista }: CardProps) {
  const idade = ageLabel(isoToBrDate(d.dataNascimento));
  const hoje = execucaoDeHoje(viagem?.monitor ?? null);
  const execucao = viagem?.execucao ?? null;
  const periodo = execucao?.periodo ?? execucao?.viagem?.periodo ?? hoje?.periodoViagem ?? vinculo?.viagemPeriodo ?? null;
  const luz = vinculo || hoje ? luzStatus(execucao?.status ?? (hoje ? 'PLANEJADA' : null), hoje?.status ?? null, periodo) : null;
  const horaLuz = maisRecente(execucao?.dataUltimaAlteracaoStatus, hoje?.ultimaAlteracao, hoje?.horarioEmbarque, hoje?.horarioDesembarque);
  const progresso =
    d.id && viagem?.paradas.length
      ? calcularProgresso({
          paradas: viagem.paradas,
          dependenteId: d.id,
          dependenteNome: d.nome,
          periodo,
          statusViagem: execucao?.status ?? null,
          ultimosEventos: [execucao?.dataUltimaAlteracaoStatus, execucao?.ultimaAlteracao, hoje?.ultimaAlteracao],
        })
      : null;
  const proxima = progresso?.proxima ?? null;
  const destaque = proxima?.paradasAntes === 0 && execucao?.status === 'EM_ANDAMENTO';

  const linhas = [
    [idade, d.escola?.nome].filter(Boolean).join(' · '),
    vinculo ? [vinculo.viagemNome || 'Viagem', periodoLabel(vinculo.viagemPeriodo), vinculo.motoristaNome].filter(Boolean).join(' · ') : 'Ainda sem motorista.',
    !proxima && hoje?.horarioEmbarque ? `Embarcou às ${formatTime(hoje.horarioEmbarque)}` : null,
    !proxima && hoje?.horarioDesembarque ? `Desembarcou às ${formatTime(hoje.horarioDesembarque)}` : null,
  ].filter(Boolean) as string[];

  return (
    <Card
      onPress={onAbrir}
      style={destaque ? styles.cardDestaque : undefined}
      accessibilityLabel={[d.nome, luz?.texto, ...linhas, proxima?.titulo].filter(Boolean).join('. ')}
    >
      <View style={styles.topo}>
        <Text style={styles.nome} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>{d.nome}</Text>
        {luz ? <StatusLight luz={luz} hora={horaLuz} /> : <StatusLight luz={{ tone: 'neutral', texto: 'Sem transporte' }} />}
      </View>
      {linhas.map((l) => (
        <Text key={l} style={styles.linha} maxFontSizeMultiplier={maxFontSizeMultiplier}>{l}</Text>
      ))}
      {proxima && <ProximaInteracaoBox proxima={proxima} />}
      <Button
        label={vinculo ? 'Acompanhar viagem' : 'Encontrar motorista'}
        icon={vinculo ? 'navigation' : 'search'}
        variant={vinculo && destaque ? 'primary' : 'secondary'}
        size="md"
        onPress={vinculo ? onAcompanhar : onBuscarMotorista}
        fullWidth
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  cardDestaque: { borderColor: colors.primary, borderWidth: borders.alert },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  nome: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  linha: { ...typography.caption, color: colors.slate700 },
});
