import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, TextField } from './ui';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

interface EditarNomeViagemModalProps {
  visible: boolean;
  /** Nome salvo atualmente ('' quando a viagem usa o nome padrão). */
  nomeAtual: string;
  /** Nome padrão exibido como placeholder quando o campo está vazio. */
  nomePadrao: string;
  saving?: boolean;
  onSave: (nome: string) => void;
  onClose: () => void;
}

/** Modal para alterar o nome da viagem. Nome em branco volta ao nome padrão. */
export default function EditarNomeViagemModal({
  visible,
  nomeAtual,
  nomePadrao,
  saving,
  onSave,
  onClose,
}: EditarNomeViagemModalProps) {
  const [nome, setNome] = useState(nomeAtual);

  useEffect(() => {
    if (visible) setNome(nomeAtual);
  }, [visible, nomeAtual]);

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Editar nome da viagem
          </Text>

          <TextField
            label="Nome da viagem"
            value={nome}
            onChangeText={setNome}
            placeholder={nomePadrao}
            maxLength={200}
            hint="Deixe em branco para voltar ao nome padrão."
            containerStyle={styles.field}
            editable={!saving}
          />

          <View style={styles.actions}>
            <Button
              label="Salvar nome"
              variant="primary"
              onPress={() => onSave(nome.trim())}
              disabled={nome.trim() === nomeAtual.trim()}
              loading={saving}
              fullWidth
            />
            <Button label="Cancelar" variant="tertiary" onPress={close} disabled={saving} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, width: '100%', maxWidth: 440 },
  title: { ...typography.heading, color: colors.ink, marginBottom: spacing.lg },
  field: { width: '100%', marginBottom: spacing.lg },
  actions: { gap: layout.buttonGap, width: '100%' },
});
