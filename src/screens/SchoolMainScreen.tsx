import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import SchoolLayout from '../components/SchoolLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolMain'>;

export default function SchoolMainScreen({ navigation }: Props) {
  const { currentUser } = useAppContext();
  const school = currentUser as any;

  return (
    <SchoolLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.greeting}>Olá, {school?.nome || 'Escola'}!</Text>
          <Text style={styles.status}>Bem-vindo ao Painel da Escola</Text>
        </View>

        <View style={styles.infoCard}>
          <Feather name="info" size={24} color="#1976D2" />
          <Text style={styles.infoText}>
            As funcionalidades para o perfil Escola estão sendo implementadas e estarão disponíveis em breve.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.notifAction}
          onPress={() => navigation.navigate('NotificationList')}
        >
          <View style={styles.iconCircle}>
            <Feather name="bell" size={24} color="#FFF" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Notificações</Text>
            <Text style={styles.actionSubtitle}>Ver avisos recebidos</Text>
          </View>
          <Feather name="chevron-right" size={24} color="#1976D2" />
        </TouchableOpacity>
        
        <View style={styles.details}>
           <Text style={styles.detailTitle}>Dados da Instituição</Text>
           <Text style={styles.detailLabel}>Administrador: <Text style={styles.detailValue}>{school?.admResponsavel}</Text></Text>
           <Text style={styles.detailLabel}>E-mail: <Text style={styles.detailValue}>{school?.usuarioDTO?.email}</Text></Text>
           <Text style={styles.detailLabel}>Endereço: <Text style={styles.detailValue}>{school?.usuarioDTO?.endereco}</Text></Text>
        </View>
      </ScrollView>
    </SchoolLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  hero: { marginBottom: 32, marginTop: 20 },
  greeting: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  status: { fontSize: 16, color: '#86868B', marginTop: 4 },
  infoCard: { backgroundColor: '#E3F2FD', padding: 20, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoText: { flex: 1, color: '#1976D2', fontSize: 14, fontFamily: 'Inter_500Medium' },
  notifAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 20, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F2F2F7'
  },
  iconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#1976D2', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 16
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  actionSubtitle: { fontSize: 14, color: '#86868B', marginTop: 2 },
  details: { marginTop: 40, backgroundColor: '#FFF', padding: 24, borderRadius: 24, elevation: 2 },
  detailTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F', marginBottom: 16 },
  detailLabel: { fontSize: 14, color: '#86868B', marginBottom: 8 },
  detailValue: { color: '#1D1D1F', fontFamily: 'Inter_600SemiBold' }
});
