import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Feather name="lock" size={32} color="#1976D2" />
          </View>
          <Text style={styles.title}>Confirmação de Segurança</Text>
          <Text style={styles.message}>Por favor, informe sua senha atual para autorizar esta alteração cadastral.</Text>
          
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha atual"
            secureTextEntry
            autoFocus
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { backgroundColor: '#FFF', borderRadius: 28, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F', textAlign: 'center', marginBottom: 12 },
  message: { fontSize: 14, color: '#86868B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  input: { width: '100%', height: 56, backgroundColor: '#F5F5F7', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#86868B', fontFamily: 'Inter_600SemiBold' },
  confirmBtn: { flex: 2, height: 52, borderRadius: 16, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold' }
});
