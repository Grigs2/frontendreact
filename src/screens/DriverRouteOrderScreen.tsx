import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import Timeline from '../components/Timeline';
import { Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { useConnectivity } from '../context/ConnectivityContext';
import { viagemService } from '../services/viagemService';
import { HistoricoOrdemParadaDTO, ParadaViagemDTO } from '../types';
import { formatDateTime } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverRouteOrder'>;

/** Parada concluída: ninguém mais aguarda embarque e, em escolas, ninguém aguarda desembarque. */
const concluida = (p: ParadaViagemDTO) =>
  p.listaDependentes.length > 0 &&
  p.listaDependentes.every((d) =>
    p.tipoParada === 'ESCOLA' ? d.statusEmbarque === 'DESEMBARCADO' || d.statusEmbarque === 'FALTOU' : d.statusEmbarque !== 'ESPERANDO',
  );

/** 5.4.7–5.4.10 e 5.8 — ordem manual das paradas, com histórico. Primeira e última parada do motorista ficam fixas. */
export default function DriverRouteOrderScreen({ navigation, route }: Props) {
  const { viagemDiaId, emExecucao } = route.params;
  const { showToast, setCurrentStops } = useAppContext();
  const { online } = useConnectivity();

  const [original, setOriginal] = useState<ParadaViagemDTO[]>([]);
  const [ordem, setOrdem] = useState<ParadaViagemDTO[]>([]);
  const [historico, setHistorico] = useState<HistoricoOrdemParadaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    try {
      setErro(null);
      const [stops, hist] = await Promise.all([
        viagemService.buscarParadasViagemDia(viagemDiaId),
        viagemService.historicoOrdem(viagemDiaId).catch(() => [] as HistoricoOrdemParadaDTO[]),
      ]);
      setOriginal(stops);
      setOrdem(stops);
      setHistorico([...hist].sort((a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime()));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar as paradas.'));
    } finally {
      setLoading(false);
    }
  }, [viagemDiaId]);

  useEffect(() => {
    load();
  }, [load]);

  const travada = (p: ParadaViagemDTO, i: number) =>
    (p.tipoParada === 'MOTORISTA' && (i === 0 || i === ordem.length - 1)) || concluida(p);

  const mover = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= ordem.length || travada(ordem[j], j)) return;
    const nova = [...ordem];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setOrdem(nova);
  };

  const semId = ordem.some((p) => p.id === undefined || p.id === null);
  const alteradas = ordem.filter((p, i) => p.id !== original[i]?.id).length;

  const salvar = async () => {
    setSalvando(true);
    try {
      const atualizadas = await viagemService.reordenarParadas(viagemDiaId, ordem.map((p) => p.id as number));
      setOriginal(atualizadas);
      setOrdem(atualizadas);
      setCurrentStops(atualizadas);
      showToast('Ordem das paradas salva.', 'success');
      viagemService.historicoOrdem(viagemDiaId).then((h) =>
        setHistorico([...h].sort((a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime())),
      ).catch(() => undefined);
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível salvar a ordem. A ordem anterior foi mantida.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const nomeParada = (id: number) => {
    const p = original.find((x) => x.id === id);
    return p ? p.nomeLocal || p.endereco : `Parada ${id}`;
  };

  return (
    <DriverLayout>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Ordem das paradas"
          subtitle={emExecucao ? 'Viagem em andamento: só as paradas restantes' : 'Defina a sequência antes de iniciar'}
          onBack={() => navigation.goBack()}
        />

        {loading ? (
          <StateView kind="loading" title="Carregando paradas..." />
        ) : erro ? (
          <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={load} />
        ) : (
          <>
            <Notice tone="info">
              Use as setas para mudar a posição. O ponto de saída e o de chegada do motorista e as paradas já concluídas
              ficam fixos.
            </Notice>
            {semId && (
              <Notice tone="warning">O servidor não informou os identificadores das paradas; não é possível reordenar agora.</Notice>
            )}

            <Card style={styles.card}>
              {ordem.map((p, i) => {
                const fixa = travada(p, i);
                return (
                  <View key={`${p.id ?? i}`} style={[styles.row, i > 0 && styles.divider]}>
                    <View style={[styles.order, fixa && styles.orderFixed]}>
                      <Text style={styles.orderText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{i + 1}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{p.nomeLocal || p.endereco}</Text>
                      <Text style={styles.caption} numberOfLines={2} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                        {p.listaDependentes.length ? p.listaDependentes.map((d) => d.nomeDependente).join(', ') : p.endereco}
                      </Text>
                    </View>
                    {fixa ? (
                      <Feather name="lock" size={20} color={colors.slate500} accessibilityLabel="Posição fixa" />
                    ) : (
                      <View style={styles.arrows}>
                        <Button
                          size="icon"
                          variant="tertiary"
                          icon="arrow-up"
                          accessibilityLabel={`Subir ${p.nomeLocal || 'parada'}`}
                          onPress={() => mover(i, -1)}
                          disabled={i === 0 || travada(ordem[i - 1], i - 1)}
                        />
                        <Button
                          size="icon"
                          variant="tertiary"
                          icon="arrow-down"
                          accessibilityLabel={`Descer ${p.nomeLocal || 'parada'}`}
                          onPress={() => mover(i, 1)}
                          disabled={i === ordem.length - 1 || travada(ordem[i + 1], i + 1)}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>

            {alteradas > 0 && (
              <Text style={styles.impact} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {alteradas} parada(s) mudam de posição.
              </Text>
            )}
            <View style={styles.actions}>
              <Button
                label="Salvar ordem"
                icon="check"
                onPress={salvar}
                loading={salvando}
                disabled={!alteradas || semId || !online}
                fullWidth
              />
              {alteradas > 0 && (
                <Button label="Desfazer alterações" variant="tertiary" onPress={() => setOrdem(original)} disabled={salvando} fullWidth />
              )}
              {!online && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Reordenar exige conexão.</Text>}
            </View>

            {historico.length > 0 && (
              <>
                <SectionTitle>Alterações registradas</SectionTitle>
                <Card>
                  <Timeline
                    items={historico.map((h) => ({
                      key: h.id,
                      title: `${nomeParada(h.idParada)}: posição ${h.ordemAnterior} → ${h.ordemNova}`,
                      caption: formatDateTime(h.ocorridoEm),
                    }))}
                  />
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  card: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  order: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  orderFixed: { backgroundColor: colors.slate500 },
  orderText: { ...typography.captionBold, color: colors.surface },
  title: { ...typography.label, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  arrows: { flexDirection: 'row' },
  impact: { ...typography.body, color: colors.ink },
  actions: { gap: layout.buttonGap },
});
