import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AdminLayout from '../components/AdminLayout';
import { Greeting, Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Card, ListRow, ShortcutCard } from '../components/ui';
import { Notice } from '../components/Feedback';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';
import { colors, maxFontSizeMultiplier, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminMain'>;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** 10.1.3 — painel administrativo: filas de trabalho e atalhos. */
export default function AdminMainScreen({ navigation }: Props) {
  const { currentUser, setCurrentUser } = useAppContext();
  const [docs, setDocs] = useState<number | null>(null);
  const [criadores, setCriadores] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      adminService.documentosPendentes().then((l) => setDocs(l.length)).catch(() => setDocs(null));
      adminService.criadorPendentes().then((l) => setCriadores(l.length)).catch(() => setCriadores(null));
    }, []),
  );

  const sair = async () => {
    await authService.sair();
    setCurrentUser(null, null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <AdminLayout>
      <View style={homeStyles.wrapper}>
        <HomeScroll>
          <Greeting name={(currentUser as any)?.nome} subtitle="Painel administrativo" />

          {docs ? (
            <HighlightCard
              chip="Fila de revisão"
              chipTone="warning"
              icon="file-text"
              title={plural(docs, 'documento aguarda revisão', 'documentos aguardam revisão')}
              lines={['CNH, vistoria e licenciamento enviados pelos motoristas.']}
              onPress={() => navigation.navigate('AdminDocuments')}
            />
          ) : (
            <HighlightCard chip="Em dia" chipTone="success" icon="check-circle" title="Nenhum documento pendente" lines={[docs === null ? 'Carregando…' : null]} />
          )}

          {!!criadores && (
            <HighlightCard
              chip="Atenção"
              chipTone="danger"
              variant="alert"
              icon="users"
              title={plural(criadores, 'aluno sem responsável criador', 'alunos sem responsável criador')}
              lines={['Atribua quem pode convidar e remover responsáveis.']}
              onPress={() => navigation.navigate('AdminLinks')}
            />
          )}

          <SectionTitle>Atalhos</SectionTitle>
          <Grid>
            <ShortcutCard label="Documentos" icon="file-text" caption={docs === null ? 'Revisão' : plural(docs, 'pendente', 'pendentes')} onPress={() => navigation.navigate('AdminDocuments')} />
            <ShortcutCard label="Contas" icon="users" caption="Pesquisar e suspender" onPress={() => navigation.navigate('AdminUsers')} />
            <ShortcutCard label="Escolas" icon="book" caption="Cadastros" onPress={() => navigation.navigate('AdminSchools')} />
            <ShortcutCard label="Vínculos" icon="link" caption="Escolas e responsáveis" onPress={() => navigation.navigate('AdminLinks')} />
            <ShortcutCard label="Auditoria" icon="shield" caption="Registros de ações" onPress={() => navigation.navigate('AdminAudit')} />
          </Grid>

          <Notice tone="info">
            Toda consulta e alteração feita aqui é registrada na auditoria. Os resultados mostram apenas dados mínimos
            (e-mails mascarados, sem contatos pessoais).
          </Notice>

          <Card>
            <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>Conta</Text>
            <ListRow icon="settings" title="Configurações" caption="Privacidade e ajuda" onPress={() => navigation.navigate('Settings')} />
            <ListRow icon="log-out" title="Sair da conta" tone="danger" divider onPress={sair} />
          </Card>
        </HomeScroll>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.ink },
});
