import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';
import { Button, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

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
            <Feather name="user" size={24} color={colors.ink} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.driverName}>{item.nome}</Text>
            <Text style={styles.vehicleInfo}>{item.veiculo} • {item.placa}</Text>
          </View>
        </View>

        {isRequested ? (
          <Chip label="Solicitado" tone="success" icon="check-circle" style={styles.requested} />
        ) : (
          <Button
            label="Solicitar Vínculo"
            icon="plus-circle"
            iconPosition="right"
            size="md"
            accessibilityLabel={`Solicitar vínculo com ${item.nome}`}
            onPress={() => handleRequestLink(item.id)}
            fullWidth
          />
        )}
      </View>
    );
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <ScreenHeader title="Buscar Motorista" />

        <View style={styles.searchContainer}>
          <TextField
            placeholder="Digite o nome ou modelo da van..."
            accessibilityLabel="Buscar motorista"
            leftIcon="search"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            containerStyle={styles.searchInput}
          />
          <Button size="icon" icon="search" accessibilityLabel="Buscar" onPress={handleSearch} />
        </View>

        {loading ? (
          <StateView kind="loading" title="Buscando motoristas..." />
        ) : (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDriverCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <StateView kind="empty" icon="search" title="Nenhum motorista encontrado." />
            }
          />
        )}
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xl },
  searchInput: { flex: 1 },
  listContent: { paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border, gap: spacing.md },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarContainer: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center' },
  textContainer: { flex: 1, gap: spacing.xs },
  driverName: { ...typography.heading, color: colors.ink },
  vehicleInfo: { ...typography.caption, color: colors.slate700 },
  requested: { flex: 1, justifyContent: 'center', minHeight: layout.buttonMd },
});
