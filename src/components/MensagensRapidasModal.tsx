import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from './ui';
import { MensagemRapida } from '../utils/mensagensRapidas';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  visible: boolean;
  /** Ex.: "Mensagem para Marina". */
  titulo: string;
  sugestoes: MensagemRapida[];
  /** Mensagem sendo enviada (mostra o carregando nela). */
  enviando?: MensagemRapida | null;
  onEnviar: (mensagem: MensagemRapida) => void;
  /** Abre o formulário para escrever outra mensagem; sem ele o botão não aparece. */
  onEscrever?: () => void;
  onClose: () => void;
}

/** Mensagens prontas enviadas com um toque, com a opção de escrever outra. */
export default function MensagensRapidasModal({ visible, titulo, sugestoes, enviando, onEnviar, onEscrever, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {
        if (!enviando) onClose();
      }}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{titulo}</Text>
          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Toque em uma mensagem para enviar.</Text>
          <ScrollView style={styles.lista} contentContainerStyle={styles.listaConteudo}>
            {sugestoes.map((m) => {
              const esta = enviando?.texto === m.texto;
              return (
                <Pressable
                  key={m.texto}
                  onPress={() => onEnviar(m)}
                  disabled={!!enviando}
                  accessibilityRole="button"
                  accessibilityLabel={`Enviar: ${m.texto}`}
                  style={({ pressed }) => [styles.opcao, pressed && styles.opcaoPressed, !!enviando && !esta && styles.opcaoInativa]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.opcaoTitulo} maxFontSizeMultiplier={maxFontSizeMultiplier}>{m.titulo}</Text>
                    <Text style={styles.opcaoTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>{m.texto}</Text>
                  </View>
                  {esta ? <ActivityIndicator color={colors.ink} /> : <Feather name="send" size={18} color={colors.ink} />}
                </Pressable>
              );
            })}
          </ScrollView>
          {onEscrever && (
            <Button label="Escrever outra mensagem" icon="edit-3" variant="secondary" onPress={onEscrever} disabled={!!enviando} fullWidth />
          )}
          <Button label="Fechar" variant="tertiary" onPress={onClose} disabled={!!enviando} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: layout.screenMargin,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: { ...typography.heading, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  flex: { flex: 1, minWidth: 0 },
  lista: { flexGrow: 0 },
  listaConteudo: { gap: spacing.sm, paddingVertical: spacing.xs },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  opcaoPressed: { backgroundColor: colors.pressedNeutral },
  opcaoInativa: { opacity: 0.5 },
  opcaoTitulo: { ...typography.label, color: colors.ink },
  opcaoTexto: { ...typography.caption, color: colors.slate700 },
});
