import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from './ui';
import { VinculoEscolaDTO } from '../types';
import { colors, maxFontSizeMultiplier, spacing, typography } from '../theme';
import { statusInfo } from '../utils/statusLabels';
import { formatDate } from '../utils/format';
import { maskCNPJ } from '../utils/masks';

interface Props {
  vinculo: VinculoEscolaDTO;
  /** Quem está vendo: o motorista vê a escola; a escola vê o motorista. */
  perspectiva: 'motorista' | 'escola';
  onPress?: () => void;
  children?: React.ReactNode;
}

/** card/contrato do design aplicado ao vínculo motorista–escola. */
export default function VinculoEscolaCard({ vinculo, perspectiva, onPress, children }: Props) {
  const info = statusInfo('vinculoEscola', vinculo.status);
  const titulo = perspectiva === 'motorista' ? vinculo.escolaNome : vinculo.motoristaNome;
  const apoio =
    perspectiva === 'motorista' ? `CNPJ ${maskCNPJ(vinculo.escolaCnpj || '')}` : 'Motorista de transporte escolar';
  const recebido =
    (perspectiva === 'motorista' && vinculo.status === 'PENDENTE_MOTORISTA') ||
    (perspectiva === 'escola' && vinculo.status === 'PENDENTE_ESCOLA');

  return (
    <Card onPress={onPress} accessibilityLabel={`${titulo}. ${info.label}. Abrir detalhes`}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {titulo}
        </Text>
        <Chip label={recebido ? 'Aguardando você' : info.label} tone={info.tone} size="sm" />
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>{apoio}</Text>
      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Atualizado em {formatDate(vinculo.atualizadoEm || vinculo.criadoEm)}
      </Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.heading, color: colors.ink, flex: 1 },
  body: { ...typography.body, color: colors.slate700, marginTop: spacing.xs },
  caption: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs },
});
