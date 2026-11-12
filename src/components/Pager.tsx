import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui';
import { colors, maxFontSizeMultiplier, spacing, typography } from '../theme';

interface PagerProps {
  page: number;
  totalPages: number;
  totalElements: number;
  loading?: boolean;
  onChange: (page: number) => void;
}

/** Paginação simples para listas do painel administrativo. */
export default function Pager({ page, totalPages, totalElements, loading, onChange }: PagerProps) {
  if (totalPages <= 1) {
    return (
      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {totalElements} resultado{totalElements === 1 ? '' : 's'}
      </Text>
    );
  }
  return (
    <View style={styles.row}>
      <Button label="Anterior" icon="chevron-left" variant="secondary" size="md" onPress={() => onChange(page - 1)} disabled={loading || page <= 0} />
      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Página {page + 1} de {totalPages} · {totalElements} resultados
      </Text>
      <Button label="Próxima" icon="chevron-right" iconPosition="right" variant="secondary" size="md" onPress={() => onChange(page + 1)} disabled={loading || page >= totalPages - 1} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  caption: { ...typography.caption, color: colors.slate500 },
});
