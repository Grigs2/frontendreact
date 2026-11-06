import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import GuardianLayout from '../components/GuardianLayout';
import AbsenceModal from '../components/AbsenceModal';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel } from '../services/viagemService';
import { DependenteDTO, ResponsavelDTO } from '../types';
import { Button, Card, Chip, ScreenHeader, StateView } from '../components/ui';
import { isoToBrDate } from '../utils/masks';
import { ageLabel } from '../utils/validators';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

const initials = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/** Alunos do responsável, com idade, escola, período e situação do transporte. */
export default function GuardianDependentsScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, pendingSolicitations, updateSolicitations } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;
  const [loading, setLoading] = useState(false);
  const [ausenciaDe, setAusenciaDe] = useState<DependenteDTO | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!guardian?.id) return;
      setLoading(true);
      responsavelService
        .listarSolicitacoes(guardian.id)
        .then(updateSolicitations)
        .catch(() => undefined)
        .finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guardian?.id]),
  );

  const renderItem = ({ item }: { item: DependenteDTO }) => {
    const ativo = pendingSolicitations.find((s) => s.dependenteId === item.id && s.aceito && !s.dataFim);
    const pendente = pendingSolicitations.find((s) => s.dependenteId === item.id && !s.respondido);
    const idade = ageLabel(isoToBrDate(item.dataNascimento));

    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{initials(item.nome)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.nome}</Text>
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {[idade, periodoLabel(item.periodo)].filter(Boolean).join(' · ')}
            </Text>
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {item.escola?.nome || 'Escola não informada'}
            </Text>
          </View>
        </View>
        <Chip
          label={ativo ? `Com transporte · ${ativo.motoristaNome || 'motorista'}` : pendente ? 'Solicitação pendente' : 'Sem transporte'}
          tone={ativo ? 'success' : pendente ? 'warning' : 'neutral'}
          size="sm"
          style={styles.chip}
        />
        <View style={styles.actions}>
          <Button
            label="Editar"
            icon="edit-2"
            variant="secondary"
            size="md"
            accessibilityLabel={`Editar dados de ${item.nome}`}
            onPress={() => navigation.navigate('GuardianDependentForm', { dependentId: item.id })}
            style={styles.flex}
          />
          {ativo ? (
            <Button
              label="Acompanhar"
              icon="navigation"
              size="md"
              onPress={() => navigation.navigate('GuardianMonitoring', { dependenteId: item.id })}
              style={styles.flex}
            />
          ) : (
            <Button label="Achar motorista" icon="search" size="md" onPress={() => navigation.navigate('GuardianSearchDriver')} style={styles.flex} />
          )}
        </View>
        {ativo && (
          <Button
            label="Avisar falta"
            icon="calendar"
            variant="tertiary"
            size="md"
            accessibilityLabel={`Avisar que ${item.nome} não vai no transporte`}
            onPress={() => setAusenciaDe(item)}
            fullWidth
          />
        )}
      </Card>
    );
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <FlatList
          data={guardian?.dependentes || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListHeaderComponent={
            <ScreenHeader
              title="Alunos"
              subtitle="Quem você acompanha no transporte"
              right={<Button label="Novo" icon="plus" size="md" accessibilityLabel="Cadastrar aluno" onPress={() => navigation.navigate('GuardianDependentForm')} />}
            />
          }
          ListEmptyComponent={
            loading ? (
              <StateView kind="loading" title="Carregando..." />
            ) : (
              <StateView kind="empty" icon="users" title="Nenhum aluno cadastrado." message="Toque em Novo para cadastrar seu primeiro aluno." />
            )
          }
        />
      </View>
      {ausenciaDe?.id ? (
        <AbsenceModal
          visible
          dependenteId={ausenciaDe.id}
          dependenteNome={ausenciaDe.nome}
          onClose={() => setAusenciaDe(null)}
        />
      ) : null}
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.label, color: colors.ink },
  name: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  chip: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: layout.buttonGap },
});
