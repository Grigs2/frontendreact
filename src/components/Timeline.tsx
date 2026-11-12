import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borders, colors, maxFontSizeMultiplier, radius, spacing, StatusTone, statusColors, typography } from '../theme';

export interface TimelineItem {
  key: string | number;
  title: string;
  /** Autor/perfil e data, em texto já formatado. */
  caption?: string;
  /** Motivo ou observação. */
  detail?: string | null;
  tone?: StatusTone;
}

interface TimelineProps {
  items: TimelineItem[];
  emptyText?: string;
}

/** Linha do tempo vertical (guia visual, seção 7). Passe os itens do mais recente para o mais antigo. */
export default function Timeline({ items, emptyText = 'Nenhum registro ainda.' }: TimelineProps) {
  if (!items.length) {
    return (
      <Text style={styles.empty} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {emptyText}
      </Text>
    );
  }
  return (
    <View accessibilityRole="list">
      {items.map((item, index) => {
        const tone = statusColors[item.tone ?? 'neutral'];
        const last = index === items.length - 1;
        return (
          <View key={item.key} style={styles.row} accessible accessibilityLabel={[item.title, item.caption, item.detail].filter(Boolean).join('. ')}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: item.tone && item.tone !== 'neutral' ? tone.text : colors.slate500 }]} />
              {!last && <View style={styles.line} />}
            </View>
            <View style={[styles.body, !last && styles.bodySpacing]}>
              <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.title}</Text>
              {!!item.caption && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.caption}</Text>}
              {!!item.detail && <Text style={styles.detail} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.detail}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: radius.pill, marginTop: 6 },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: spacing.xs },
  body: { flex: 1, gap: 2 },
  bodySpacing: { paddingBottom: spacing.lg },
  title: { ...typography.label, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  detail: { ...typography.body, color: colors.slate700, marginTop: spacing.xs, borderLeftWidth: borders.alert, borderLeftColor: colors.border, paddingLeft: spacing.sm },
  empty: { ...typography.body, color: colors.slate500 },
});
