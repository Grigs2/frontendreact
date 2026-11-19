import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LuzStatus, MINUTOS_POR_PARADA, ProximaInteracao, textoParadasAntes } from '../utils/progressoViagem';
import { formatTime } from '../utils/format';
import { colors, maxFontSizeMultiplier, radius, spacing, StatusTone, typography } from '../theme';

/** Cor da bolinha por tom (o amarelo usa o tom pressionado para ter contraste sobre branco). */
const COR_LUZ: Record<StatusTone, string> = {
  success: colors.success,
  info: colors.info,
  warning: colors.primaryPressed,
  danger: colors.danger,
  neutral: colors.slate500,
};

/**
 * Luz de status (seção 07): bolinha de 10 px na cor do tom + texto curto com a hora da última alteração.
 * A cor nunca é o único sinal: o texto sempre diz a situação.
 */
export function StatusLight({ luz, hora }: { luz: LuzStatus; hora?: string | null }) {
  const texto = hora ? `${luz.texto} · ${formatTime(hora)}` : luz.texto;
  return (
    <View style={styles.luz} accessible accessibilityLabel={hora ? `${luz.texto}, atualizado às ${formatTime(hora)}` : luz.texto}>
      <View style={[styles.ponto, { backgroundColor: COR_LUZ[luz.tone] }]} />
      <Text style={styles.luzTexto} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {texto}
      </Text>
    </View>
  );
}

/**
 * Faixa da próxima interação com o aluno (seção 07): quantas paradas faltam, horário estimado e,
 * quando é a próxima parada, o aviso de que o próximo evento da viagem é com o aluno.
 */
export function ProximaInteracaoBox({ proxima }: { proxima: ProximaInteracao }) {
  const destaque = proxima.paradasAntes === 0;
  return (
    <View
      style={[styles.box, destaque && styles.boxDestaque]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={[
        destaque ? 'Próximo evento da viagem' : 'Próxima interação',
        proxima.titulo,
        textoParadasAntes(proxima),
        proxima.estimativa ? `${proxima.rotuloHorario} estimada às ${formatTime(proxima.estimativa)}` : null,
      ]
        .filter(Boolean)
        .join('. ')}
    >
      <Text style={styles.selo} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {destaque ? 'PRÓXIMO EVENTO DA VIAGEM' : 'PRÓXIMA INTERAÇÃO'}
      </Text>
      <Text style={styles.titulo} maxFontSizeMultiplier={maxFontSizeMultiplier}>{proxima.titulo}</Text>
      <View style={styles.linha}>
        <Feather name="map-pin" size={16} color={colors.slate700} />
        <Text style={styles.apoio} maxFontSizeMultiplier={maxFontSizeMultiplier}>{textoParadasAntes(proxima)}</Text>
      </View>
      <View style={styles.linha}>
        <Feather name="clock" size={16} color={colors.ink} />
        <Text style={styles.horario} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {proxima.estimativa
            ? `${proxima.rotuloHorario}: ~${formatTime(proxima.estimativa)}`
            : `${proxima.rotuloHorario}: após o início da viagem`}
        </Text>
      </View>
      {!!proxima.estimativa && (
        <Text style={styles.nota} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          Estimativa de ~{MINUTOS_POR_PARADA} min por parada restante.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  luz: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, flexShrink: 1 },
  ponto: { width: 10, height: 10, borderRadius: radius.pill },
  luzTexto: { ...typography.caption, color: colors.slate700, flexShrink: 1 },
  box: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  boxDestaque: { backgroundColor: colors.primaryTint },
  selo: { ...typography.captionBold, color: colors.ink, letterSpacing: 0.5 },
  titulo: { ...typography.label, color: colors.ink },
  linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  apoio: { ...typography.caption, color: colors.slate700, flexShrink: 1 },
  horario: { ...typography.captionBold, color: colors.ink, flexShrink: 1 },
  nota: { ...typography.caption, color: colors.slate500 },
});
