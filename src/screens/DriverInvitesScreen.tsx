import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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
import { Button, Chip, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

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
          <Feather name="user" size={20} color={colors.ink} />
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
          <Button
            label="Recusar"
            variant="tertiary"
            size="md"
            icon="x"
            accessibilityLabel={`Recusar ${item.dependenteNome}`}
            onPress={() => handleResponse(item, false)}
          />
          <Button
            label="Aceitar"
            size="md"
            icon="check"
            accessibilityLabel={`Aceitar ${item.dependenteNome}`}
            onPress={() => handleResponse(item, true)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader title="Convites Pendentes" right={<Chip label={String(invites.length)} tone="warning" />} />
        <FlatList
          data={invites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInviteCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <StateView kind="empty" icon="mail" title="Nenhuma solicitação nova." />
          }
        />
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  listContent: { paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  studentAvatar: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center' },
  studentName: { ...typography.heading, color: colors.ink },
  guardianInfo: { ...typography.caption, color: colors.slate700 },
  divider: { height: borders.hairline, backgroundColor: colors.border, marginVertical: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  dateInfo: { ...typography.caption, color: colors.slate500 },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
});
