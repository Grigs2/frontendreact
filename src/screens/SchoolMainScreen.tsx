import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import SchoolLayout from '../components/SchoolLayout';
import { Greeting, Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Card, ListRow, ShortcutCard } from '../components/ui';
import { vinculoEscolaService } from '../services/vinculoEscolaService';
import { EscolaDTO, VinculoEscolaDTO } from '../types';
import { colors, maxFontSizeMultiplier, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolMain'>;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** 4.2 — início da escola: motoristas vinculados, solicitações pendentes, avisos e cadastro. */
export default function SchoolMainScreen({ navigation }: Props) {
  const { currentUser, unreadCount } = useAppContext();
  const school = currentUser as EscolaDTO;
  const endereco = school?.enderecoOperacionalDTO;
  const [vinculos, setVinculos] = useState<VinculoEscolaDTO[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      vinculoEscolaService.listarEscola().then(setVinculos).catch(() => setVinculos(null));
    }, []),
  );

  const ativos = vinculos?.filter((v) => v.status === 'ATIVO').length ?? 0;
  const suspensos = vinculos?.filter((v) => v.status === 'SUSPENSO').length ?? 0;
  const pendentes = vinculos?.filter((v) => v.status === 'PENDENTE_ESCOLA').length ?? 0;
  const convites = vinculos?.filter((v) => v.status === 'PENDENTE_MOTORISTA').length ?? 0;

  return (
    <SchoolLayout>
      <View style={homeStyles.wrapper}>
        <HomeScroll>
          <Greeting name={school?.nome} subtitle="Painel da escola" />

          {pendentes > 0 ? (
            <HighlightCard
              chip="Ação necessária"
              chipTone="warning"
              icon="user-check"
              title={`${plural(pendentes, 'motorista aguarda', 'motoristas aguardam')} aprovação`}
              lines={['Analise e aprove ou recuse as solicitações de vínculo.']}
              onPress={() => navigation.navigate('SchoolDrivers')}
            />
          ) : (
            <HighlightCard
              chip={vinculos ? 'Em dia' : 'Carregando'}
              chipTone={vinculos ? 'success' : 'neutral'}
              icon="check-circle"
              title="Nenhuma solicitação pendente"
              lines={[
                vinculos ? `${plural(ativos, 'motorista ativo', 'motoristas ativos')}${suspensos ? ` · ${suspensos} suspenso(s)` : ''}` : null,
                convites ? `${plural(convites, 'convite enviado aguarda', 'convites enviados aguardam')} o motorista` : null,
              ]}
            />
          )}

          <SectionTitle>Atalhos</SectionTitle>
          <Grid>
            <ShortcutCard
              label="Motoristas"
              icon="truck"
              caption={vinculos ? plural(ativos, 'ativo', 'ativos') : 'Vínculos'}
              onPress={() => navigation.navigate('SchoolDrivers')}
            />
            <ShortcutCard
              label="Solicitações"
              icon="inbox"
              caption={vinculos ? plural(pendentes, 'pendente', 'pendentes') : 'Pendentes'}
              onPress={() => navigation.navigate('SchoolDrivers')}
            />
            <ShortcutCard
              label="Avisos"
              icon="bell"
              caption={unreadCount ? plural(unreadCount, 'não lido', 'não lidos') : 'Notificações'}
              onPress={() => navigation.navigate('NotificationList')}
            />
            <ShortcutCard label="Perfil" icon="user" caption="Dados da escola" onPress={() => navigation.navigate('SchoolProfile')} />
          </Grid>

          <Card>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Dados da instituição
            </Text>
            <ListRow icon="user" title={school?.admResponsavel || '—'} caption="Representante autorizado" />
            <ListRow icon="mail" title={school?.usuarioDTO?.email || '—'} caption="E-mail" divider />
            <ListRow
              icon="map-pin"
              title={
                endereco
                  ? `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}`
                  : school?.usuarioDTO?.endereco || '—'
              }
              caption={endereco ? `${endereco.cidade}/${endereco.uf}` : 'Endereço'}
              divider
            />
            <ListRow icon="settings" title="Configurações" caption="Privacidade e ajuda" divider onPress={() => navigation.navigate('Settings')} />
          </Card>
        </HomeScroll>
      </View>
    </SchoolLayout>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.ink },
});
