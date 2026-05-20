import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import { useAppContext } from '../context/AppContext';
import { notificacaoService } from '../services/notificacaoService';
import { NotificacaoDTO } from '../types';

export default function NoticeBoardScreen() {
  const isFocused = useIsFocused();
  const { currentUser, notifications, updateNotifications } = useAppContext();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFocused && currentUser?.id) {
      loadNotifications();
    }
  }, [isFocused]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificacaoService.listar(currentUser!.id!);
      updateNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => 
    new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
  );

  const content = (
    <View style={styles.container}>
      <Text style={styles.title}>Mural de Avisos</Text>
      
      {loading && <ActivityIndicator color="#1976D2" style={{ marginBottom: 20 }} />}

      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Feather name="bell-off" size={48} color="#E5E5EA" />
              <Text style={styles.emptyText}>Nenhum aviso no momento.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.visto && styles.unreadCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.senderContainer}>
                <Feather name="bell" size={16} color="#1976D2" />
                <Text style={styles.senderText}>{item.titulo}</Text>
              </View>
              <Text style={styles.dateText}>
                {item.data ? new Date(item.data).toLocaleString() : 'N/A'}
              </Text>
            </View>
            <Text style={styles.contentTxt}>{item.mensagem}</Text>
            {!item.visto && <View style={styles.unreadDot} />}
          </View>
        )}
      />
    </View>
  );

  const role = (currentUser as any)?.usuarioDTO?.tipoPerfil || (currentUser as any)?.usuario?.tipoPerfil || (currentUser as any)?.tipoPerfil;

  if (role === 'MOTORISTA') {
    return <DriverLayout>{content}</DriverLayout>;
  }

  return <GuardianLayout>{content}</GuardianLayout>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1D1D1F', marginBottom: 20 },
  listContent: { paddingBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0', position: 'relative' },
  unreadCard: { borderColor: '#1976D2', borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  senderContainer: { flexDirection: 'row', alignItems: 'center' },
  senderText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1976D2', marginLeft: 6 },
  dateText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#888888' },
  contentTxt: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#333333', lineHeight: 22 },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1976D2' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 16, color: '#888888', marginTop: 16 },
});
