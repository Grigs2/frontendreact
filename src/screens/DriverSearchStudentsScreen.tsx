import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import StudentInviteList from '../components/StudentInviteList';
import { periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { ViagemDTO } from '../types';
import { Button, Chip, ScreenHeader, StateView } from '../components/ui';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

/** Motorista procura alunos por nome e convida para uma das suas viagens; o responsável aceita ou recusa. */
export default function DriverSearchStudentsScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, showToast } = useAppContext();
  const [trips, setTrips] = useState<ViagemDTO[]>([]);
  const [selected, setSelected] = useState<ViagemDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id) return;
      setLoading(true);
      viagemService
        .listarViagens(currentUser.id)
        .then((list) => {
          const ativas = list.filter((t) => t.ativo);
          setTrips(ativas);
          setSelected((cur) => ativas.find((t) => t.id === cur?.id) ?? ativas[0] ?? null);
        })
        .catch((error) => showToast(getApiErrorMessage(error, 'Não foi possível carregar suas viagens.'), 'error'))
        .finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]),
  );

  const tripPicker = (
    <View style={styles.pickerBlock}>
      <ScreenHeader title="Buscar alunos" subtitle="Convide alunos para suas viagens" onBack={() => navigation.goBack()} />
      <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Viagem</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripChips}>
        {trips.map((t) => {
          const active = selected?.id === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${viagemNome(t)}, ${periodoLabel(t.periodo)}`}
              onPress={() => setSelected(t)}
              style={[styles.tripChip, active && styles.tripChipActive]}
            >
              <Text style={[styles.tripChipTitle, active && styles.tripChipTitleActive]} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {viagemNome(t)}
              </Text>
              <Text style={styles.tripChipCaption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{periodoLabel(t.periodo)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!!selected && !selected.escolaId && (
        <Chip label="Viagem antiga, sem escola: aparecem alunos de todas as escolas" tone="warning" icon="info" size="sm" style={styles.legacy} />
      )}
    </View>
  );

  return (
    <DriverLayout>
      <View style={styles.container}>
        {loading && trips.length === 0 ? (
          <StateView kind="loading" title="Carregando viagens..." />
        ) : trips.length === 0 ? (
          <View style={styles.pickerBlock}>
            <ScreenHeader title="Buscar alunos" onBack={() => navigation.goBack()} />
            <StateView
              kind="empty"
              icon="map"
              title="Crie uma viagem primeiro"
              message="Os alunos são convidados para uma viagem de uma escola e período."
            />
            <Button label="Ir para Rotas" icon="map" onPress={() => navigation.navigate('DriverTrips')} fullWidth />
          </View>
        ) : selected ? (
          <StudentInviteList key={selected.id} viagemId={selected.id!} escolaNome={selected.escolaNome} header={tripPicker} />
        ) : null}
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  pickerBlock: { gap: spacing.md },
  label: { ...typography.captionBold, color: colors.slate700 },
  tripChips: { gap: spacing.sm, paddingBottom: spacing.xs },
  tripChip: {
    minWidth: 180,
    maxWidth: 260,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  tripChipActive: { backgroundColor: colors.primaryTint, borderColor: colors.ink, borderWidth: 2 },
  tripChipTitle: { ...typography.label, color: colors.slate700 },
  tripChipTitleActive: { color: colors.ink },
  tripChipCaption: { ...typography.caption, color: colors.slate500 },
  legacy: { alignSelf: 'flex-start' },
});
