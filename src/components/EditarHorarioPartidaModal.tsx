import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, TextField } from './ui';
import { HORARIO_PARTIDA_REGEX, mascararHorarioPartida } from '../services/viagemService';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

interface EditarHorarioPartidaModalProps {
  visible: boolean;
  title: string;
  description: string;
  /** Horário mostrado ao abrir (HH:mm). */
  horarioAtual: string;
  saving?: boolean;
  onSave: (horario: string) => void;
  /** Quando informado, mostra a ação para voltar ao padrão da viagem. */
  onRestaurarPadrao?: () => void;
  onClose: () => void;
}

/** Modal para alterar o horário de partida (HH:mm), do padrão da viagem ou de um dia. */
export default function EditarHorarioPartidaModal({
  visible,
  title,
  description,
  horarioAtual,
  saving,
  onSave,
  onRestaurarPadrao,
  onClose,
}: EditarHorarioPartidaModalProps) {
  const [horario, setHorario] = useState(horarioAtual);

  useEffect(() => {
    if (visible) setHorario(horarioAtual);
  }, [visible, horarioAtual]);

  const close = () => {
    if (!saving) onClose();
  };

  const valido = HORARIO_PARTIDA_REGEX.test(horario);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {title}
          </Text>
          <Text style={styles.description} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {description}
          </Text>

          <TextField
            label="Horário de partida"
            value={horario}
            onChangeText={(texto) => setHorario(mascararHorarioPartida(texto))}
            placeholder="HH:mm"
            keyboardType="number-pad"
            maxLength={5}
            error={horario.length > 0 && !valido ? 'Use o formato HH:mm, por exemplo 07:30.' : undefined}
            containerStyle={styles.field}
            editable={!saving}
          />

          <View style={styles.actions}>
            <Button
              label="Salvar horário"
              variant="primary"
              onPress={() => onSave(horario)}
              disabled={!valido || horario === horarioAtual}
              loading={saving}
              fullWidth
            />
            {onRestaurarPadrao && (
              <Button label="Usar padrão da viagem" variant="secondary" onPress={onRestaurarPadrao} disabled={saving} fullWidth />
            )}
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
  title: { ...typography.heading, color: colors.ink, marginBottom: spacing.sm },
  description: { ...typography.caption, color: colors.slate500, marginBottom: spacing.lg },
  field: { width: '100%', marginBottom: spacing.lg },
  actions: { gap: layout.buttonGap, width: '100%' },
});
