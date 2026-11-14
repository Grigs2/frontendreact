import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, Chip } from './ui';
import { StatusTone, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

/** Peças da tela inicial (padrão "Cards & Grids"): margem 16, grade de 2 colunas com gap 16, cards de raio 16. */

export function HomeScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

export function Greeting({ name, subtitle }: { name?: string | null; subtitle: string }) {
  const first = (name || '').trim().split(/\s+/)[0];
  return (
    <View style={styles.greeting}>
      <Text style={styles.hello} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Olá{first ? `, ${first}` : ''}!
      </Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{subtitle}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
      {children}
    </Text>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

interface HighlightCardProps {
  chip: string;
  chipTone?: StatusTone;
  title: string;
  /** Segunda linha no mesmo estilo do título. */
  tituloSecundario?: string;
  lines?: (string | false | null | undefined)[];
  icon?: FeatherIconName;
  variant?: 'default' | 'alert';
  onPress?: () => void;
  children?: React.ReactNode;
}

/** Card de destaque: selo (chip) no topo, título 18 Bold, linhas de apoio e ação opcional. */
export function HighlightCard({ chip, chipTone = 'info', title, tituloSecundario, lines = [], icon, variant = 'default', onPress, children }: HighlightCardProps) {
  const visible = lines.filter(Boolean) as string[];
  return (
    <Card variant={variant} onPress={onPress} accessibilityLabel={onPress ? [chip, title, tituloSecundario, ...visible].filter(Boolean).join('. ') : undefined}>
      <View style={styles.highlightTop}>
        <Chip label={chip} tone={chipTone} size="sm" />
        {!!icon && <Feather name={icon} size={20} color={variant === 'alert' ? colors.danger : colors.slate500} />}
      </View>
      <Text style={styles.highlightTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{title}</Text>
      {!!tituloSecundario && <Text style={styles.highlightTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{tituloSecundario}</Text>}
      {visible.map((l) => (
        <Text key={l} style={styles.highlightLine} maxFontSizeMultiplier={maxFontSizeMultiplier}>{l}</Text>
      ))}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, gap: spacing.lg },
  greeting: { gap: spacing.xs, marginTop: spacing.xs },
  hello: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.slate500 },
  section: { ...typography.heading, color: colors.ink, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.gridGap },
  highlightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  highlightTitle: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  highlightLine: { ...typography.caption, color: colors.slate700 },
});

export const homeStyles = StyleSheet.create({
  wrapper: { flex: 1, width: '100%' },
  hint: { ...typography.caption, color: colors.slate500 },
  iconBadge: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
