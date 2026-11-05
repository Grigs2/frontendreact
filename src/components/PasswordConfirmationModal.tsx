import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, TextField } from './ui';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  visible: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function PasswordConfirmationModal({ visible, onConfirm, onCancel, loading }: Props) {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    if (!password.trim()) {
      Alert.alert('Erro', 'Por favor, informe sua senha.');
      return;
    }
    onConfirm(password);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!loading) onCancel(); }}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <View style={styles.iconContainer}>
            <Feather name="lock" size={layout.icon} color={colors.ink} />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>Confirmação de Segurança</Text>
          <Text style={styles.message} maxFontSizeMultiplier={maxFontSizeMultiplier}>Por favor, informe sua senha atual para autorizar esta alteração cadastral.</Text>

          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha atual"
            accessibilityLabel="Senha atual"
            secureTextEntry
            autoFocus
            containerStyle={styles.input}
          />

          <View style={styles.actions}>
            <Button label="Confirmar" onPress={handleConfirm} loading={loading} fullWidth />
            <Button label="Cancelar" variant="tertiary" onPress={onCancel} disabled={loading} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, width: '100%', maxWidth: 400, alignItems: 'center' },
  iconContainer: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.heading, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.slate700, textAlign: 'center', marginBottom: spacing.xl },
  input: { width: '100%', marginBottom: spacing.xl },
  actions: { gap: layout.buttonGap, width: '100%' },
});
