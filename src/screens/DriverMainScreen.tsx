import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';

export default function DriverMainScreen() {
  const navigation = useNavigation<any>();
  const { activeTrips, currentUser } = useAppContext();

  return (
    <DriverLayout>
      <View style={styles.webWrapper}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.greeting}>Olá, {currentUser?.nome || 'Motorista'}!</Text>
            <Text style={styles.status}>Pronto para a rota de hoje?</Text>
          </View>

          {/* The Mandatory Entry Point */}
          <TouchableOpacity 
            style={styles.mainAction}
            onPress={() => navigation.navigate('DriverTrips')}
          >
            <View style={styles.iconCircle}>
              <Feather name="play" size={32} color="#FFF" />
            </View>
            <View style={styles.mainActionText}>
              <Text style={styles.actionTitle}>Iniciar Operação</Text>
              <Text style={styles.actionSubtitle}>Escolher período e gerenciar alunos</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#1976D2" />
          </TouchableOpacity>

          <View style={styles.quickLinks}>
            <Text style={styles.sectionTitle}>Acesso Rápido</Text>
            <View style={styles.grid}>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DriverHistory')}>
                <Feather name="clock" size={24} color="#1976D2" />
                <Text style={styles.cardLabel}>Histórico</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DriverVehicle')}>
                <Feather name="truck" size={24} color="#1976D2" />
                <Text style={styles.cardLabel}>Meu Veículo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('NoticeBoard')}>
                <Feather name="bell" size={24} color="#1976D2" />
                <Text style={styles.cardLabel}>Avisos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DriverProfile')}>
                <Feather name="user" size={24} color="#1976D2" />
                <Text style={styles.cardLabel}>Meu Perfil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  container: { 
    padding: 20,
    width: '100%',
    maxWidth: 800,
  },
  hero: { marginBottom: 32, marginTop: 20 },
  greeting: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  status: { fontSize: 16, color: '#86868B', marginTop: 4 },
  mainAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 24, 
    borderRadius: 24, 
    elevation: 4,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#EBF2FC',
    marginBottom: 40
  },
  iconCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#1976D2', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 20
  },
  mainActionText: { flex: 1 },
  actionTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  actionSubtitle: { fontSize: 14, color: '#86868B', marginTop: 2 },
  quickLinks: {},
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1D1D1F', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { 
    width: '48%', 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F7'
  },
  cardLabel: { marginTop: 12, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1D1D1F' }
});
