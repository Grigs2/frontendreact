import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import GuardianLayout from '../components/GuardianLayout';
import { responsavelService } from '../services/responsavelService';
import { ResponsavelDTO, SolicitacaoDTO, DependenteDTO } from '../types';
import { Button, Chip, ScreenHeader, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

export default function GuardianDependentsScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { currentUser, pendingSolicitations, updateSolicitations } = useAppContext();

  const guardian = currentUser as ResponsavelDTO;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFocused && guardian?.id) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sols = await responsavelService.listarSolicitacoes(guardian.id!);
      updateSolicitations(sols);
    } catch (error) {
      console.error('Error loading solicitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: DependenteDTO }) => {
    const activeSol = pendingSolicitations.find(s => s.dependenteId === item.id && s.aceito && !s.dataFim);
    const pendingSol = pendingSolicitations.find(s => s.dependenteId === item.id && !s.respondido);

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.studentName}>{item.nome}</Text>
          <Text style={styles.schoolName}>Escola: {item.escola?.nome || 'Não vinculada'}</Text>
          <Chip
            label={activeSol ? 'Vínculo Ativo' : pendingSol ? 'Solicitação Pendente' : 'Sem Transporte'}
            tone={activeSol ? 'success' : pendingSol ? 'warning' : 'neutral'}
            style={styles.statusBadge}
          />
        </View>

        <View style={styles.actions}>
          <Button
            label="Editar Informações"
            icon="edit-2"
            variant="secondary"
            size="md"
            accessibilityLabel={`Editar informações de ${item.nome}`}
            onPress={() => navigation.navigate('GuardianDependentForm', { dependentId: item.id })}
            fullWidth
          />
        </View>
      </View>
    );
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <ScreenHeader
          title="Meus Dependentes"
          right={
            <Button
              label="Novo"
              icon="plus"
              size="md"
              accessibilityLabel="Novo dependente"
              onPress={() => navigation.navigate('GuardianDependentForm')}
              disabled={loading}
            />
          }
        />

        {loading && <StateView kind="loading" style={styles.loading} />}

        <FlatList
          data={guardian?.dependentes || []}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            !loading ? <StateView kind="empty" icon="users" title="Nenhum dependente cadastrado." /> : undefined
          }
        />
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  loading: { paddingVertical: spacing.md },
  list: { paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: layout.cardPadding, marginBottom: spacing.lg, borderWidth: borders.hairline, borderColor: colors.border },
  cardInfo: { marginBottom: spacing.md, gap: spacing.xs },
  studentName: { ...typography.heading, color: colors.ink },
  schoolName: { ...typography.body, color: colors.slate500 },
  statusBadge: { marginTop: spacing.sm },
  actions: { borderTopWidth: borders.hairline, borderTopColor: colors.border, paddingTop: spacing.md },
});
