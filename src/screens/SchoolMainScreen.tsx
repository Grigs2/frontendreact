import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import SchoolLayout from '../components/SchoolLayout';
import { Greeting, Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Card, ListRow, ShortcutCard } from '../components/ui';
import { EscolaDTO } from '../types';
import { colors, maxFontSizeMultiplier, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolMain'>;

/** Início da escola: dados da instituição, avisos e acesso ao perfil. */
export default function SchoolMainScreen({ navigation }: Props) {
  const { currentUser } = useAppContext();
  const school = currentUser as EscolaDTO;
  const endereco = school?.enderecoOperacionalDTO;

  return (
    <SchoolLayout>
      <View style={homeStyles.wrapper}>
        <HomeScroll>
          <Greeting name={school?.nome} subtitle="Painel da escola" />

          <HighlightCard
            chip="Em breve"
            chipTone="info"
            icon="info"
            title="Acompanhamento dos alunos"
            lines={['Em breve a escola verá os motoristas vinculados e o embarque dos seus alunos.']}
          />

          <SectionTitle>Atalhos</SectionTitle>
          <Grid>
            <ShortcutCard label="Avisos" icon="bell" caption="Notificações" onPress={() => navigation.navigate('NotificationList')} />
            <ShortcutCard label="Perfil" icon="user" caption="Dados da escola" onPress={() => navigation.navigate('SchoolProfile')} />
          </Grid>

          <Card>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Dados da instituição
            </Text>
            <ListRow icon="user" title={school?.admResponsavel || '—'} caption="Administrador responsável" />
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
          </Card>
        </HomeScroll>
      </View>
    </SchoolLayout>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.ink },
});
