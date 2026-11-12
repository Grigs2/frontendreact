import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from './ui';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, StatusTone, statusColors, typography } from '../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

// Peças de feedback reutilizáveis do guia visual (seção 7): aviso, pendências e progresso.

interface NoticeProps {
  tone?: StatusTone;
  icon?: FeatherIconName;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const NOTICE_ICON: Record<StatusTone, FeatherIconName> = {
  success: 'check-circle',
  danger: 'alert-circle',
  info: 'info',
  warning: 'alert-triangle',
  neutral: 'info',
};

/** Aviso em linha: fundo tint + texto na cor semântica. Nunca só cor — sempre com texto e ícone. */
export function Notice({ tone = 'info', icon, title, children, action }: NoticeProps) {
  const palette = statusColors[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }]} accessibilityRole="alert">
      <Feather name={icon ?? NOTICE_ICON[tone]} size={20} color={palette.text} style={styles.noticeIcon} />
      <View style={styles.noticeBody}>
        {!!title && <Text style={[styles.noticeTitle, { color: palette.text }]} maxFontSizeMultiplier={maxFontSizeMultiplier}>{title}</Text>}
        {typeof children === 'string' ? (
          <Text style={[styles.noticeText, { color: tone === 'warning' || tone === 'neutral' ? colors.ink : palette.text }]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {children}
          </Text>
        ) : (
          children
        )}
        {action}
      </View>
    </View>
  );
}

export interface PendingIssue {
  key: string;
  text: string;
  /** Ação de correção; sem ela a linha é só informativa. */
  onPress?: () => void;
  actionLabel?: string;
}

/** Lista de bloqueios com caminho de correção (card de alerta). */
export function PendingIssuesList({ title = 'Resolva antes de iniciar', issues }: { title?: string; issues: PendingIssue[] }) {
  if (!issues.length) return null;
  return (
    <Card variant="alert">
      <Text style={styles.issuesTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {title}
      </Text>
      {issues.map((issue) => {
        const content = (
          <>
            <Feather name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.issueText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{issue.text}</Text>
            {issue.onPress && (
              <View style={styles.issueAction}>
                {!!issue.actionLabel && <Text style={styles.issueActionText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{issue.actionLabel}</Text>}
                <Feather name="chevron-right" size={20} color={colors.ink} />
              </View>
            )}
          </>
        );
        return issue.onPress ? (
          <Pressable
            key={issue.key}
            onPress={issue.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${issue.text}. ${issue.actionLabel ?? 'Corrigir'}`}
            style={({ pressed }) => [styles.issueRow, pressed && styles.issuePressed]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={issue.key} style={styles.issueRow}>{content}</View>
        );
      })}
    </Card>
  );
}

/** Barra de progresso: trilho neutro, preenchimento success, texto acima. */
export function ProgressBar({ value, total, label }: { value: number; total: number; label?: string }) {
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: value }}>
      <Text style={styles.progressLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {label ?? `${value} de ${total}`}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

/** Linha "rótulo: valor" usada em resumos dentro de cards. */
export function InfoLine({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Text style={styles.infoLine} maxFontSizeMultiplier={maxFontSizeMultiplier}>
      <Text style={styles.infoLabel}>{label}: </Text>
      {String(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: borders.hairline,
  },
  noticeIcon: { marginTop: 2 },
  noticeBody: { flex: 1, gap: spacing.xs },
  noticeTitle: { ...typography.label },
  noticeText: { ...typography.body },
  issuesTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.sm },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  issuePressed: { backgroundColor: colors.surface },
  issueText: { ...typography.body, color: colors.ink, flex: 1 },
  issueAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  issueActionText: { ...typography.captionBold, color: colors.ink },
  progress: { gap: spacing.sm },
  progressLabel: { ...typography.body, color: colors.ink },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.pressedNeutral, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.success },
  infoLine: { ...typography.body, color: colors.slate700 },
  infoLabel: { ...typography.label, color: colors.ink },
});
