import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import DriverLayout from '../components/DriverLayout';
import AvisoAtrasoModal from '../components/AvisoAtrasoModal';
import { Button, Card, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { viagemService } from '../services/viagemService';
import { DependenteParadaDTO, ParadaViagemDTO } from '../types';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverFocus'>;

/** Mesma regra da tela de chamada: próxima parada é a primeira com alguém ainda por embarcar (ou, em escola, por desembarcar). */
const acharProxima = (paradas: ParadaViagemDTO[]) =>
  paradas.find((s) =>
    s.listaDependentes.some((d) => (s.tipoParada === 'ESCOLA' ? d.statusEmbarque === 'EMBARCADO' : d.statusEmbarque === 'ESPERANDO')),
  );

/** M5 — modo foco: próxima parada em destaque, aviso geral e mensagem ao responsável de cada aluno da parada. */
export default function DriverFocusScreen({ navigation, route }: Props) {
  const { viagemDiaId } = route.params;
  const { showToast } = useAppContext();

  const [paradas, setParadas] = useState<ParadaViagemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoAberto, setAvisoAberto] = useState(false);

  const load = useCallback(async () => {
    setErro(null);
    try {
      setParadas(await viagemService.buscarParadasViagemDia(viagemDiaId));
    } catch (error) {
      setErro(getApiErrorMessage(error, 'Não foi possível carregar a rota.'));
    } finally {
      setLoading(false);
    }
  }, [viagemDiaId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const proxima = acharProxima(paradas);
  const alunosDaProxima: DependenteParadaDTO[] = proxima
    ? proxima.listaDependentes.filter((d) => (proxima.tipoParada === 'ESCOLA' ? d.statusEmbarque === 'EMBARCADO' : d.statusEmbarque === 'ESPERANDO'))
    : [];

  const mensagemAoResponsavel = (aluno: DependenteParadaDTO) => {
    navigation.navigate('NotificationCreate', {
      destinatarioId: aluno.responsavelUsuarioId ?? undefined,
      nomeDestinatario: aluno.nomeResponsavel,
      dependenteId: aluno.id,
      viagemDiaId,
    });
  };

  return (
    <DriverLayout>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Modo foco" subtitle="Próxima parada da rota" onBack={() => navigation.goBack()} />

        {loading ? (
          <StateView kind="loading" title="Carregando rota..." />
        ) : erro ? (
          <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={load} />
        ) : !proxima ? (
          <StateView kind="empty" title="Rota concluída" message="Não há mais paradas com alunos pendentes." />
        ) : (
          <>
            <Card style={styles.destaque}>
              <Text style={styles.ordem} maxFontSizeMultiplier={maxFontSizeMultiplier}>Parada {proxima.ordem}</Text>
              <Text style={styles.nome} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>{proxima.nomeLocal}</Text>
              <Text style={styles.endereco} maxFontSizeMultiplier={maxFontSizeMultiplier}>{proxima.endereco}</Text>
            </Card>

            <Text style={styles.secao} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>Alunos desta parada</Text>
            {alunosDaProxima.map((aluno) => (
              <Card key={aluno.id} style={styles.alunoCard}>
                <View style={styles.alunoTexto}>
                  <Text style={styles.alunoNome} maxFontSizeMultiplier={maxFontSizeMultiplier}>{aluno.nomeDependente}</Text>
                  <Text style={styles.alunoResp} maxFontSizeMultiplier={maxFontSizeMultiplier}>Responsável: {aluno.nomeResponsavel}</Text>
                </View>
              </Card>
            ))}

            <Button
              label="Mensagem"
              variant="secondary"
              icon="message-square"
              disabled={alunosDaProxima.length === 0}
              onPress={() => mensagemAoResponsavel(alunosDaProxima[0])}
              fullWidth
            />
            <Button label="Aviso geral" icon="alert-triangle" onPress={() => setAvisoAberto(true)} fullWidth />
            <Button label="Ver mapa" variant="secondary" icon="map" onPress={() => navigation.navigate('DriverMap', { viagemDiaId })} fullWidth />
          </>
        )}
      </ScrollView>

      <AvisoAtrasoModal visible={avisoAberto} viagemDiaId={viagemDiaId} onClose={() => setAvisoAberto(false)} />
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  destaque: { gap: spacing.xs, padding: spacing.xl, borderRadius: radius.card, backgroundColor: colors.primaryTint },
  ordem: { ...typography.captionBold, color: colors.slate700 },
  nome: { ...typography.title, color: colors.ink },
  endereco: { ...typography.body, color: colors.slate700 },
  secao: { ...typography.heading, color: colors.ink, marginTop: spacing.sm },
  alunoCard: { gap: spacing.sm },
  alunoTexto: { gap: spacing.xs },
  alunoNome: { ...typography.label, color: colors.ink },
  alunoResp: { ...typography.caption, color: colors.slate500 },
});
