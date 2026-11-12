import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, TextField } from './ui';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';
import { validateReason } from '../utils/validators';

interface ReasonDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Rótulo do botão de confirmação (verbo do resultado: "Cancelar viagem", "Recusar"). */
  confirmLabel: string;
  /** Motivo exigido pelo backend para concluir a ação. */
  required?: boolean;
  /** Limite do backend (500 para vínculos, 1000 para viagens/documentos/contas). */
  maxLength?: number;
  destructive?: boolean;
  loading?: boolean;
  placeholder?: string;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}

/** Modal de confirmação com motivo (guia visual, seção 7). */
export default function ReasonDialog({
  visible,
  title,
  message,
  confirmLabel,
  required = true,
  maxLength = 1000,
  destructive = true,
  loading,
  placeholder = 'Descreva o motivo',
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (visible) {
      setMotivo('');
      setTouched(false);
    }
  }, [visible]);

  const error = validateReason(motivo, maxLength, required);
  const close = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <View style={[styles.iconContainer, destructive ? styles.iconDestructive : styles.iconInfo]}>
            <Feather name={destructive ? 'alert-triangle' : 'edit-3'} size={layout.icon} color={destructive ? colors.danger : colors.ink} />
          </View>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {title}
          </Text>
          {!!message && (
            <Text style={styles.message} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {message}
            </Text>
          )}

          <TextField
            label={required ? 'Motivo' : 'Motivo (opcional)'}
            value={motivo}
            onChangeText={(t) => {
              setMotivo(t);
              setTouched(true);
            }}
            placeholder={placeholder}
            multiline
            numberOfLines={3}
            maxLength={maxLength}
            error={touched && error ? error : undefined}
            hint={`${motivo.trim().length}/${maxLength}`}
            containerStyle={styles.field}
            style={styles.input}
            editable={!loading}
          />

          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={() => {
                setTouched(true);
                if (!error) onConfirm(motivo.trim());
              }}
              disabled={!!error}
              loading={loading}
              fullWidth
            />
            <Button label="Voltar" variant="tertiary" onPress={close} disabled={loading} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, width: '100%', maxWidth: 440, alignItems: 'center' },
  iconContainer: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  iconDestructive: { backgroundColor: colors.dangerTint },
  iconInfo: { backgroundColor: colors.primaryTint },
  title: { ...typography.heading, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.slate700, textAlign: 'center', marginBottom: spacing.lg },
  field: { width: '100%', marginBottom: spacing.lg },
  input: { minHeight: 96, textAlignVertical: 'top' },
  actions: { gap: layout.buttonGap, width: '100%' },
});
