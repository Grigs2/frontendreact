import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel } from '../services/viagemService';
import { Greeting, Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Button, ShortcutCard } from '../components/ui';
import { ConviteResponsavelDTO, MonitoramentoDTO, ResponsavelDTO } from '../types';
import { redeResponsaveisService } from '../services/redeResponsaveisService';
import { statusInfo } from '../utils/statusLabels';
import { formatTime, todayIso } from '../utils/format';
import { isoToBrDate } from '../utils/masks';
import { ageLabel } from '../utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianMain'>;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Início do responsável: um card por aluno (com ou sem transporte), convites que pedem resposta e atalhos. */
export default function GuardianMainScreen({ navigation }: Props) {
  const { currentUser, pendingSolicitations, updateSolicitations, unreadCount } = useAppContext();
  const [convitesResp, setConvitesResp] = useState<ConviteResponsavelDTO[]>([]);
  const [monitor, setMonitor] = useState<Record<number, MonitoramentoDTO>>({});
  const guardian = currentUser as ResponsavelDTO;
  const dependentes = guardian?.dependentes ?? [];

  useFocusEffect(
    useCallback(() => {
      if (!guardian?.id) return;
      responsavelService.listarSolicitacoes(guardian.id).then(updateSolicitations).catch(() => undefined);
      redeResponsaveisService.pendentes().then(setConvitesResp).catch(() => setConvitesResp([]));
      // Estado da viagem de hoje de cada aluno (3.2.2–3.2.4).
      Promise.all(
        (guardian.dependentes ?? []).filter((d) => d.id).map((d) =>
          responsavelService.monitorar(d.id!).then((m) => [d.id!, m] as const).catch(() => null),
        ),
      ).then((res) => setMonitor(Object.fromEntries(res.filter(Boolean) as (readonly [number, MonitoramentoDTO])[])));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guardian?.id]),
  );

  const convites = pendingSolicitations.filter((s) => !s.respondido && s.origem !== 'RESPONSAVEL');
  const ativos = pendingSolicitations.filter((s) => s.aceito && !s.dataFim);

  return (
    <GuardianLayout>
      <View style={homeStyles.wrapper}>
        <HomeScroll>
          <Greeting name={guardian?.nome} subtitle="Acompanhe o transporte dos seus alunos." />

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
            dependentes.map((d) => {
              const vinculo = ativos.find((s) => s.dependenteId === d.id);
              const idade = ageLabel(isoToBrDate(d.dataNascimento));
              const atual = d.id ? monitor[d.id]?.statusAtual : null;
              const hoje = atual && (atual.data === todayIso() || atual.status === 'EMBARCADO') ? atual : null;
              const presenca = hoje ? statusInfo('presenca', hoje.status) : null;
              return (
                <HighlightCard
                  key={d.id}
                  chip={presenca ? `Hoje: ${presenca.label.toLowerCase()}` : vinculo ? 'Com transporte' : 'Sem transporte'}
                  chipTone={presenca ? presenca.tone : vinculo ? 'success' : 'neutral'}
                  icon="user"
                  title={d.nome}
                  lines={[
                    [idade, d.escola?.nome].filter(Boolean).join(' · '),
                    vinculo ? `${vinculo.viagemNome || 'Viagem'} · ${periodoLabel(vinculo.viagemPeriodo)} · ${vinculo.motoristaNome || ''}` : 'Ainda sem motorista.',
                    hoje?.horarioEmbarque ? `Embarcou às ${formatTime(hoje.horarioEmbarque)}` : null,
                    hoje?.horarioDesembarque ? `Desembarcou às ${formatTime(hoje.horarioDesembarque)}` : null,
                  ]}
                  onPress={d.id ? () => navigation.navigate('GuardianDependentDetail', { dependenteId: d.id! }) : undefined}
                >
                  <Button
                    label={vinculo ? 'Acompanhar viagem' : 'Encontrar motorista'}
                    icon={vinculo ? 'navigation' : 'search'}
                    variant={vinculo ? 'primary' : 'secondary'}
                    onPress={() =>
                      vinculo
                        ? navigation.navigate('GuardianMonitoring', { dependenteId: d.id! })
                        : navigation.navigate('GuardianSearchDriver')
                    }
                    fullWidth
                  />
                </HighlightCard>
              );
            })
          )}

          <SectionTitle>Atalhos</SectionTitle>
          <Grid>
            <ShortcutCard label="Alunos" icon="users" caption={plural(dependentes.length, 'cadastrado', 'cadastrados')} onPress={() => navigation.navigate('GuardianDependents')} />
            <ShortcutCard label="Motoristas" icon="search" caption="Buscar próximos" onPress={() => navigation.navigate('GuardianSearchDriver')} />
            <ShortcutCard label="Vínculos" icon="link" caption={plural(ativos.length, 'ativo', 'ativos')} onPress={() => navigation.navigate('GuardianInvites')} />
            <ShortcutCard label="Histórico" icon="clock" caption="Ver viagens" onPress={() => navigation.navigate('GuardianHistory')} />
            <ShortcutCard label="Avisos" icon="bell" caption={unreadCount ? plural(unreadCount, 'não lido', 'não lidos') : 'Notificações'} onPress={() => navigation.navigate('NotificationList')} />
            <ShortcutCard label="Perfil" icon="settings" caption="Conta e configurações" onPress={() => navigation.navigate('GuardianProfile')} />
          </Grid>
        </HomeScroll>
      </View>
    </GuardianLayout>
  );
}
