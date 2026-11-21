import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GuardianLayout from '../components/GuardianLayout';
import TripMap from '../components/TripMap';
import { Button, Chip } from '../components/ui';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { INTERVALO_GPS_MS, localizacaoService } from '../services/localizacaoService';
import { useRotaViagem } from '../hooks/useRotaViagem';
import { distancia, linhaDaRota, tempoAte } from '../utils/rota';
import { LocalizacaoViagemDTO, MonitoramentoDTO, ResponsavelDTO } from '../types';
import { statusInfo } from '../utils/statusLabels';
import { formatTime } from '../utils/format';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

/**
 * Mapa do acompanhamento em tela cheia (responsável). Mostra só a perua e o trecho até a parada do aluno.
 * Sem controles de viagem: o responsável não conduz a viagem.
 */
export default function GuardianFullMapScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAppContext();
  const { dependenteId, viagemDiaId } = route.params as { dependenteId: number; viagemDiaId: number };
  const aluno = (currentUser as ResponsavelDTO)?.dependentes?.find((d) => d.id === dependenteId);

  const [posicao, setPosicao] = useState<LocalizacaoViagemDTO | null>(null);
  const [monitor, setMonitor] = useState<MonitoramentoDTO | null>(null);
  const [gpsAviso, setGpsAviso] = useState<string | null>(null);
  const [precisaAutorizar, setPrecisaAutorizar] = useState(false);
  const [appAtivo, setAppAtivo] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppAtivo(s === 'active'));
    return () => sub.remove();
  }, []);

  // Posição e presença a cada 15 s, só com a tela em foco e o app ativo.
  useEffect(() => {
    if (!isFocused || !appAtivo) return undefined;
    let ativo = true;
    const buscar = async () => {
      try {
        const p = await localizacaoService.posicaoAtual(viagemDiaId);
        if (!ativo) return;
        setPosicao(p);
        setPrecisaAutorizar(false);
        setGpsAviso(p ? null : 'Aguardando a primeira posição do veículo.');
      } catch (e) {
        if (!ativo) return;
        const st = getApiStatus(e);
        const texto = getApiErrorMessage(e, '');
        const semConsentimento = st === 409 && /^autorize/i.test(texto);
        setPrecisaAutorizar(semConsentimento);
        setGpsAviso(semConsentimento ? null : st === 404 ? 'Aguardando a primeira posição do veículo.' : 'Localização indisponível no momento.');
      }
      responsavelService.monitorar(dependenteId).then((m) => ativo && setMonitor(m)).catch(() => undefined);
    };
    buscar();
    const timer = setInterval(buscar, INTERVALO_GPS_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [isFocused, appAtivo, viagemDiaId, dependenteId]);

  const atual = monitor?.statusAtual ?? null;
  const presenca = statusInfo('presenca', atual?.status);
  const rota = useRotaViagem(viagemDiaId, !!posicao && !precisaAutorizar, null, `${dependenteId}-${atual?.status ?? ''}`);
  const alvo = rota?.disponivel ? rota.paradas.find((p) => p.dependenteId === dependenteId) ?? null : null;
  const pontosMapa = alvo
    ? [{ latitude: alvo.latitude, longitude: alvo.longitude, titulo: alvo.rotulo, destaque: true, icone: alvo.tipoParada === 'ESCOLA' ? ('book-open' as const) : ('home' as const) }]
    : [];

  const mensagemMapa = precisaAutorizar
    ? 'Autorize a localização na tela de acompanhamento para ver a perua.'
    : gpsAviso ?? 'Aguardando a posição do veículo';

  return (
    <GuardianLayout>
      <View style={styles.tela}>
        <TripMap
          preencher
          posicao={posicao ? { latitude: posicao.latitude, longitude: posicao.longitude } : null}
          ultimaAtualizacao={posicao?.recebidoEm}
          desatualizada={posicao?.desatualizada}
          mensagem={mensagemMapa}
          rota={alvo ? linhaDaRota(rota) : []}
          paradas={pontosMapa}
          modo="enquadrar"
        />

        <View style={[styles.topo, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <Button label="Reduzir mapa" icon="minimize-2" variant="secondary" size="md" onPress={() => navigation.goBack()} />
        </View>

        <View style={[styles.card, { bottom: insets.bottom + spacing.md }]}>
          <View style={styles.linha}>
            <Text style={[styles.nome, styles.flex]} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
              {aluno?.nome ?? 'Aluno'}
            </Text>
            <Chip label={presenca.label} tone={presenca.tone} size="sm" />
          </View>
          {alvo ? (
            <>
              <Text style={styles.previsaoTempo} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {alvo.segundos < 60 ? 'Chegando agora' : `Chega em ${tempoAte(alvo.segundos)}`}
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {alvo.rotulo} · previsão {formatTime(alvo.previsaoChegada)} · {distancia(alvo.metros)}
              </Text>
            </>
          ) : (
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {rota && !rota.disponivel && rota.mensagem ? rota.mensagem : 'Calculando a rota até a parada.'}
            </Text>
          )}
        </View>
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1 },
  topo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: layout.screenMargin,
    zIndex: 30,
    elevation: 30,
  },
  card: {
    position: 'absolute',
    left: layout.screenMargin,
    right: layout.screenMargin,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    zIndex: 30,
    elevation: 30,
  },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  nome: { ...typography.label, color: colors.ink },
  previsaoTempo: { ...typography.title, color: colors.ink },
  body: { ...typography.body, color: colors.slate700 },
});
