import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from './ui';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  loading,
  destructive = true
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!loading) onCancel(); }}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <View style={[styles.iconContainer, destructive ? styles.iconDestructive : styles.iconInfo]}>
            <Feather name={destructive ? 'alert-triangle' : 'help-circle'} size={layout.icon} color={destructive ? colors.danger : colors.ink} />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{title}</Text>
          <Text style={styles.message} maxFontSizeMultiplier={maxFontSizeMultiplier}>{message}</Text>

          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              fullWidth
            />
            <Button label={cancelLabel} variant="tertiary" onPress={onCancel} disabled={loading} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, width: '100%', maxWidth: 400, alignItems: 'center' },
  iconContainer: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  iconDestructive: { backgroundColor: colors.dangerTint },
  iconInfo: { backgroundColor: colors.primaryTint },
  title: { ...typography.heading, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.slate700, textAlign: 'center', marginBottom: spacing.xl },
  actions: { gap: layout.buttonGap, width: '100%' },
});
