import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';

interface Driver {
  id: number;
  nome: string;
  veiculo: string;
  placa: string;
  telefone: string;
}

// 1. Mock Data
const MOTORISTAS_MOCK: Driver[] = [
  { id: 1, nome: 'João da Silva', veiculo: 'Sprinter Branca', placa: 'ABC-1234', telefone: '11988887777' },
  { id: 2, nome: 'Maria Oliveira', veiculo: 'Ducato Prata', placa: 'XYZ-5678', telefone: '11977776666' },
  { id: 3, nome: 'Carlos Santos', veiculo: 'Master Azul', placa: 'KJG-9012', telefone: '11966665555' },
  { id: 4, nome: 'Ricardo Pereira', veiculo: 'Sprinter Escolar', placa: 'MNB-4567', telefone: '11955554444' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianSearchDriver'>;

export default function GuardianSearchDriverScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>(MOTORISTAS_MOCK);
  const [loading, setLoading] = useState(false);
  const [requestedIds, setRequestedIds] = useState<number[]>([]);

  const handleSearch = () => {
    setLoading(true);
    // Simulação de delay para realismo
    setTimeout(() => {
      const filtered = MOTORISTAS_MOCK.filter(d => 
        d.nome.toLowerCase().includes(search.toLowerCase()) ||
        d.veiculo.toLowerCase().includes(search.toLowerCase())
      );
      setDrivers(filtered);
      setLoading(false);
    }, 500);
  };

  const handleRequestLink = (driverId: number) => {
    // Implementa a lógica visual de feedback
    if (!requestedIds.includes(driverId)) {
      setRequestedIds([...requestedIds, driverId]);
    }
  };

  const renderDriverCard = ({ item }: { item: Driver }) => {
    const isRequested = requestedIds.includes(item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <View style={styles.avatarContainer}>
            <Feather name="user" size={24} color="#1976D2" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.driverName}>{item.nome}</Text>
            <Text style={styles.vehicleInfo}>{item.veiculo} • {item.placa}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.requestButton, 
            isRequested && styles.requestedButton
          ]}
          onPress={() => handleRequestLink(item.id)}
          disabled={isRequested}
        >
          <Text style={[
            styles.requestButtonText,
            isRequested && styles.requestedButtonText
          ]}>
            {isRequested ? 'Solicitado' : 'Solicitar Vínculo'}
          </Text>
          <Feather 
            name={isRequested ? "check-circle" : "plus-circle"} 
            size={18} 
            color={isRequested ? "#4CAF50" : "#FFFFFF"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Buscar Motorista</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Digite o nome ou modelo da van..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Feather name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1976D2" style={styles.loader} />
        ) : (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDriverCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum motorista encontrado.</Text>
            }
          />
        )}
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#1D1D1F',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  driverName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1D1D1F',
  },
  vehicleInfo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  requestButton: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  requestedButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  requestButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 8,
  },
  requestedButtonText: {
    color: '#4CAF50',
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#888888',
    marginTop: 40,
  },
});
