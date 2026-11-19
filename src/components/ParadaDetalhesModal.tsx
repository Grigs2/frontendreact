import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Chip } from './ui';
import { DependenteParadaDTO, ParadaViagemDTO } from '../types';
import { statusInfo } from '../utils/statusLabels';
import { nomeEscola, ordenarAlunos, rotuloParada } from '../utils/paradas';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  /** Parada aberta no pop-up; null fecha. */
  parada: ParadaViagemDTO | null;
  ida: boolean;
  onClose: () => void;
  /** Quando informado, mostra "Mensagem" ao lado de cada aluno. */
  onMensagem?: (aluno: DependenteParadaDTO) => void;
}

/** Detalhes de uma parada: endereço completo e alunos (em ordem alfabética) com o responsável de cada um. */
export default function ParadaDetalhesModal({ parada, ida, onClose, onMensagem }: Props) {
  const alunos = parada ? ordenarAlunos(parada.listaDependentes) : [];
  return (
    <Modal visible={!!parada} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          {parada && (
            <>
              <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{rotuloParada(parada, ida)}</Text>
              <View style={styles.linha}>
                <Feather name={parada.tipoParada === 'ESCOLA' ? 'book-open' : 'map-pin'} size={18} color={colors.slate700} />
                <View style={styles.flex}>
                  {parada.tipoParada === 'ESCOLA' && (
                    <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>{nomeEscola(parada)}</Text>
                  )}
                  <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>{parada.endereco || 'Endereço não informado'}</Text>
                </View>
              </View>

              {alunos.length > 0 && (
                <ScrollView style={styles.lista} contentContainerStyle={styles.listaConteudo}>
                  {alunos.map((a) => {
                    const st = statusInfo('presenca', a.statusEmbarque);
                    return (
                      <View key={a.id} style={styles.aluno}>
                        <View style={styles.flex}>
                          <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>{a.nomeDependente}</Text>
                          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                            Responsável: {a.nomeResponsavel || '—'}
                          </Text>
                        </View>
                        <Chip label={st.label} tone={st.tone} size="sm" />
                        {onMensagem && (
                          <Button
                            size="icon"
                            variant="secondary"
                            icon="message-square"
                            accessibilityLabel={`Mensagem para o responsável de ${a.nomeDependente}`}
                            onPress={() => onMensagem(a)}
                          />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </>
          )}
          <Button label="Fechar" variant="tertiary" onPress={onClose} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, width: '100%', maxWidth: 440, maxHeight: '85%', gap: spacing.md },
  title: { ...typography.heading, color: colors.ink },
  linha: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  lista: { flexGrow: 0 },
  listaConteudo: { gap: spacing.sm },
  aluno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.border,
  },
  label: { ...typography.label, color: colors.ink },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
});
