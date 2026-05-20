import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, destructive ? styles.iconDestructive : styles.iconInfo]}>
            <Feather name={destructive ? 'alert-triangle' : 'help-circle'} size={32} color={destructive ? '#FF3B30' : '#1976D2'} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmBtn, destructive ? styles.confirmDestructive : styles.confirmInfo]} 
              onPress={onConfirm} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>{confirmLabel}</Text>}
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
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  iconDestructive: { backgroundColor: '#FFEBEE' },
  iconInfo: { backgroundColor: '#E3F2FD' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F', textAlign: 'center', marginBottom: 12 },
  message: { fontSize: 15, color: '#86868B', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#86868B', fontFamily: 'Inter_600SemiBold' },
  confirmBtn: { flex: 2, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmDestructive: { backgroundColor: '#FF3B30' },
  confirmInfo: { backgroundColor: '#1976D2' },
  confirmBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold' }
});
