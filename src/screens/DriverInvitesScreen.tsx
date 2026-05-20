import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DriverLayout from '../components/DriverLayout';
import { RootStackParamList } from '../navigation';

interface SolicitacaoVinculo {
  id: number;
  dependenteNome: string;
  responsavelNome: string;
  status: string;
  dataSolicitacao: string;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Mock inicial de convites
const SOLICITACOES_MOCK: SolicitacaoVinculo[] = [
  { id: 101, dependenteNome: 'Enzo Rodrigues', responsavelNome: 'Marcos Rodrigues', status: 'PENDENTE', dataSolicitacao: '25/10/2023' },
  { id: 102, dependenteNome: 'Julia Mendes', responsavelNome: 'Clara Mendes', status: 'PENDENTE', dataSolicitacao: '26/10/2023' },
  { id: 103, dependenteNome: 'Felipe Souza', responsavelNome: 'Roberto Souza', status: 'PENDENTE', dataSolicitacao: '27/10/2023' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'DriverInvites'>;

export default function DriverInvitesScreen({ navigation }: Props) {
  const [invites, setInvites] = useState<SolicitacaoVinculo[]>(SOLICITACOES_MOCK);

  const handleResponse = async (item: SolicitacaoVinculo, accept: boolean) => {
    try {
      if (accept) {
        // Simular persistência do aluno aceito
        const stored = await AsyncStorage.getItem('@accepted_students');
        const acceptedStudents = stored ? JSON.parse(stored) : [];
        
        // Evita duplicatas no mock
        if (!acceptedStudents.find((s: any) => s.id === item.id)) {
          acceptedStudents.push({
            id: item.id,
            nome: item.dependenteNome,
            responsavel: item.responsavelNome,
            status: 'FORA', // Status inicial para a chamada
            escola: 'Escola Adventista'
          });
          await AsyncStorage.setItem('@accepted_students', JSON.stringify(acceptedStudents));
        }
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setInvites(prev => prev.filter(inv => inv.id !== item.id));
      
      if (accept && Platform.OS !== 'web') {
        Alert.alert('Sucesso', `${item.dependenteNome} agora faz parte da sua lista de passageiros.`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const renderInviteCard = ({ item }: { item: SolicitacaoVinculo }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.studentAvatar}>
          <Feather name="user" size={20} color="#1976D2" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>{item.dependenteNome}</Text>
          <Text style={styles.guardianInfo}>Responsável: {item.responsavelNome}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Text style={styles.dateInfo}>Solicitado em: {item.dataSolicitacao}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleResponse(item, false)}
          >
            <Feather name="x" size={18} color="#E53935" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleResponse(item, true)}
          >
            <Feather name="check" size={18} color="#FFFFFF" />
            <Text style={styles.acceptBtnText}>Aceitar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Convites Pendentes</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{invites.length}</Text>
          </View>
        </View>
        <FlatList
          data={invites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInviteCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="mail" size={60} color="#E0E0E0" />
              <Text style={styles.emptyText}>Nenhuma solicitação nova.</Text>
            </View>
          }
        />
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#1D1D1F' },
  badge: { backgroundColor: '#1976D2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 10 },
  badgeText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 12 },
  listContent: { paddingBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentName: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#1D1D1F' },
  guardianInfo: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666666' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateInfo: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#999999' },
  actionButtons: { flexDirection: 'row' },
  actionBtn: { height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 12 },
  rejectBtn: { backgroundColor: '#FFEBEE', marginRight: 8 },
  acceptBtn: { backgroundColor: '#4CAF50' },
  acceptBtnText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 14, marginLeft: 6 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#888888', marginTop: 12 },
});
