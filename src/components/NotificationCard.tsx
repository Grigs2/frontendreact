import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NotificacaoDTO, TipoNotificacao } from '../types';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

/** Ícone por tipo. Alertas (prioridade ALTA) ficam com a cor de perigo. */
export const ICONE_NOTIFICACAO: Partial<Record<TipoNotificacao, FeatherName>> = {
  MOTORISTA_A_CAMINHO: 'navigation',
  EMBARQUE: 'log-in',
  DESEMBARQUE: 'log-out',
  VIAGEM_FINALIZADA: 'check-circle',
  AUSENCIA: 'user-x',
  AUSENCIA_INFORMADA: 'calendar',
  ATRASO: 'clock',
  VIAGEM_CANCELADA: 'x-circle',
  VIAGEM_INTERROMPIDA: 'alert-octagon',
  TROCA_VEICULO: 'truck',
  SOLICITACAO: 'link',
  MANUAL: 'message-square',
};

export const horaNotificacao = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

interface Props {
  item: NotificacaoDTO;
  /** Mostra o chevron quando tocar leva a outra tela. */
  temDestino: boolean;
  onPress: (n: NotificacaoDTO) => void;
}

/** Card de notificação usado na central e no popout do sino (mesmo visual nos dois). */
export default function NotificationCard({ item, temDestino, onPress }: Props) {
  const tipo = item.tipo ?? 'GERAL';
  const alerta = item.prioridade === 'ALTA';
  const remetente = tipo === 'MANUAL' || tipo === 'GERAL' ? item.remetente?.nome : null;
  const hora = horaNotificacao(item.dataCriacao);
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.visto ? '' : 'Não lida. '}${item.titulo}. ${item.mensagem}. ${hora}`}
      accessibilityHint={temDestino ? 'Abre os detalhes' : 'Marca como lida'}
      style={({ pressed }) => [
        styles.card,
        !item.visto && styles.cardNaoLida,
        alerta && !item.visto && styles.cardAlerta,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconSlot, alerta && styles.iconSlotAlerta]}>
        <Feather name={ICONE_NOTIFICACAO[tipo] ?? 'bell'} size={20} color={alerta ? colors.danger : colors.ink} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.notifTitle, !item.visto && styles.notifTitleBold]} numberOfLines={2} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {item.titulo}
          </Text>
          <Text style={styles.hora} maxFontSizeMultiplier={maxFontSizeMultiplier}>{hora}</Text>
        </View>
        <Text style={styles.messageText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.mensagem}</Text>
        {remetente ? <Text style={styles.remetente} maxFontSizeMultiplier={maxFontSizeMultiplier}>De {remetente}</Text> : null}
      </View>
      {!item.visto && <View style={styles.pontoNaoLida} accessibilityElementsHidden importantForAccessibility="no" />}
      {temDestino && <Feather name="chevron-right" size={18} color={colors.slate500} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    marginBottom: spacing.sm,
    borderWidth: borders.hairline,
    borderColor: colors.border,
  },
  cardNaoLida: { borderColor: colors.primaryPressed, backgroundColor: colors.surface },
  cardAlerta: { borderColor: colors.danger, backgroundColor: colors.dangerTint },
  cardPressed: { backgroundColor: colors.pressedNeutral },
  iconSlot: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlotAlerta: { backgroundColor: colors.surface },
  cardBody: { flex: 1, gap: spacing.xs },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  notifTitle: { ...typography.body, color: colors.ink, flex: 1 },
  notifTitleBold: { ...typography.label },
  hora: { ...typography.caption, color: colors.slate500 },
  messageText: { ...typography.body, color: colors.slate700 },
  remetente: { ...typography.caption, color: colors.slate500 },
  pontoNaoLida: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, marginTop: 6 },
});
