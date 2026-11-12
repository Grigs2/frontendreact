import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useConnectivity } from '../context/ConnectivityContext';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';
import { formatTime } from '../utils/format';

/**
 * Faixa de conexão (guia visual, seção 7): offline, sincronizando ou com registros não aplicados.
 * Online e sem pendências, não ocupa espaço.
 */
export default function ConnectivityBanner({ onOpenProblems }: { onOpenProblems?: () => void }) {
  const { online, pendentes, problemas, sincronizando, ultimaSincronizacao, erroSincronizacao, sincronizar } = useConnectivity();

  let tone: 'offline' | 'sync' | 'problem' | 'pending' | null = null;
  if (!online) tone = 'offline';
  else if (sincronizando) tone = 'sync';
  else if (problemas.length) tone = 'problem';
  else if (pendentes > 0 || erroSincronizacao) tone = 'pending';
  if (!tone) return null;

  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  const textos = {
    offline: pendentes
      ? `Sem conexão · ${plural(pendentes, 'registro aguardando envio', 'registros aguardando envio')}`
      : 'Sem conexão · registros de presença ficam salvos no aparelho',
    sync: 'Enviando registros salvos no aparelho…',
    problem: `${plural(problemas.length, 'registro não foi aplicado', 'registros não foram aplicados')} pelo servidor`,
    pending: erroSincronizacao
      ? `${erroSincronizacao}${pendentes ? ` (${pendentes} pendente${pendentes === 1 ? '' : 's'})` : ''}`
      : `${plural(pendentes, 'registro aguardando envio', 'registros aguardando envio')}`,
  } as const;

  const estilo = {
    offline: { bg: colors.ink, fg: colors.surface, icon: 'wifi-off' as const },
    sync: { bg: colors.infoTint, fg: colors.info, icon: 'refresh-cw' as const },
    problem: { bg: colors.dangerTint, fg: colors.danger, icon: 'alert-circle' as const },
    pending: { bg: colors.primaryTint, fg: colors.ink, icon: 'upload-cloud' as const },
  }[tone];

  const action =
    tone === 'problem' && onOpenProblems
      ? { label: 'Ver', onPress: onOpenProblems }
      : tone === 'pending'
        ? { label: 'Enviar agora', onPress: () => sincronizar().catch(() => undefined) }
        : null;

  return (
    <View style={[styles.bar, { backgroundColor: estilo.bg }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Feather name={estilo.icon} size={20} color={estilo.fg} />
      <View style={styles.texts}>
        <Text style={[styles.text, { color: estilo.fg }]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {textos[tone]}
        </Text>
        {tone === 'offline' && ultimaSincronizacao && (
          <Text style={[styles.caption, { color: estilo.fg }]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Última sincronização às {formatTime(ultimaSincronizacao.toISOString())}
          </Text>
        )}
      </View>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={[styles.actionText, { color: estilo.fg }]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch,
    paddingVertical: spacing.md,
    paddingHorizontal: layout.screenMargin,
  },
  texts: { flex: 1, gap: 2 },
  text: { ...typography.captionBold },
  caption: { ...typography.caption },
  action: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md },
  actionPressed: { backgroundColor: colors.pressedNeutral },
  actionText: { ...typography.label, textDecorationLine: 'underline' },
});
