import React, { useCallback } from 'react';
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
import { ResponsavelDTO } from '../types';
import { isoToBrDate } from '../utils/masks';
import { ageLabel } from '../utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianMain'>;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Início do responsável: um card por aluno (com ou sem transporte), convites que pedem resposta e atalhos. */
export default function GuardianMainScreen({ navigation }: Props) {
  const { currentUser, pendingSolicitations, updateSolicitations } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;
  const dependentes = guardian?.dependentes ?? [];

  useFocusEffect(
    useCallback(() => {
      if (!guardian?.id) return;
      responsavelService.listarSolicitacoes(guardian.id).then(updateSolicitations).catch(() => undefined);
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

          {dependentes.length === 0 ? (
            <HighlightCard chip="Primeiros passos" chipTone="warning" icon="user-plus" title="Cadastre seu primeiro aluno" lines={['Com o aluno cadastrado, você encontra motoristas próximos e pede vaga.']}>
              <Button label="Cadastrar aluno" variant="secondary" onPress={() => navigation.navigate('GuardianDependentForm')} fullWidth />
            </HighlightCard>
          ) : (
            dependentes.map((d) => {
              const vinculo = ativos.find((s) => s.dependenteId === d.id);
              const idade = ageLabel(isoToBrDate(d.dataNascimento));
              return (
                <HighlightCard
                  key={d.id}
                  chip={vinculo ? 'Com transporte' : 'Sem transporte'}
                  chipTone={vinculo ? 'success' : 'neutral'}
                  icon="user"
                  title={d.nome}
                  lines={[
                    [idade, d.escola?.nome].filter(Boolean).join(' · '),
                    vinculo ? `${vinculo.viagemNome || 'Viagem'} · ${periodoLabel(vinculo.viagemPeriodo)} · ${vinculo.motoristaNome || ''}` : 'Ainda sem motorista.',
                  ]}
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
          </Grid>
        </HomeScroll>
      </View>
    </GuardianLayout>
  );
}
