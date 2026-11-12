import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AdminLayout from '../components/AdminLayout';
import ChoiceChips from '../components/ChoiceChips';
import Pager from '../components/Pager';
import ReasonDialog from '../components/ReasonDialog';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { adminService } from '../services/adminService';
import { AdminEscolaResumoDTO, Page } from '../types';
import { maskCNPJ, onlyDigits } from '../utils/masks';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSchools'>;
type Situacao = 'TODAS' | 'ATIVAS' | 'SUSPENSAS';

/** 10.3 — escolas cadastradas: pesquisa por nome/CNPJ, situação da conta, vínculos e suspensão. */
export default function AdminSchoolsScreen({ navigation }: Props) {
  const { showToast } = useAppContext();
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [situacao, setSituacao] = useState<Situacao>('TODAS');
  const [page, setPage] = useState<Page<AdminEscolaResumoDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<{ escola: AdminEscolaResumoDTO; tipo: 'suspender' | 'reativar' } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(
    async (pagina = 0) => {
      setLoading(true);
      try {
        setErro(null);
        setPage(
          await adminService.escolas({
            nome: nome || undefined,
            cnpj: cnpj ? onlyDigits(cnpj) : undefined,
            suspensa: situacao === 'TODAS' ? undefined : situacao === 'SUSPENSAS',
            pagina,
          }),
        );
      } catch (e) {
        setErro(getApiErrorMessage(e, 'Não foi possível pesquisar escolas.'));
      } finally {
        setLoading(false);
      }
    },
    [nome, cnpj, situacao],
  );

  useEffect(() => {
    buscar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situacao]);

  const executar = async (motivo: string) => {
    if (!acao) return;
    setSalvando(true);
    try {
      if (acao.tipo === 'suspender') await adminService.suspender(acao.escola.usuarioId, motivo);
      else await adminService.reativar(acao.escola.usuarioId, motivo);
      showToast(acao.tipo === 'suspender' ? 'Conta da escola suspensa.' : 'Conta da escola reativada.', 'success');
      setAcao(null);
      buscar(page?.number ?? 0);
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível concluir a ação.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminLayout>
      <FlatList
        data={page?.content ?? []}
        keyExtractor={(e) => String(e.id)}
        style={styles.list}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: layout.cardGap }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Escolas" subtitle="Cadastros e situação das contas" onBack={() => navigation.goBack()} />
            <Card style={styles.filters}>
              <TextField label="Nome" value={nome} onChangeText={setNome} />
              <TextField label="CNPJ" value={cnpj} onChangeText={(t) => setCnpj(maskCNPJ(t))} keyboardType="number-pad" />
              <ChoiceChips
                options={[
                  { value: 'TODAS', label: 'Todas' },
                  { value: 'ATIVAS', label: 'Ativas' },
                  { value: 'SUSPENSAS', label: 'Suspensas' },
                ]}
                value={situacao}
                onChange={setSituacao}
                accessibilityLabel="Situação"
              />
              <Button label="Pesquisar" icon="search" onPress={() => buscar(0)} loading={loading} fullWidth />
            </Card>
            {page && <Pager page={page.number} totalPages={page.totalPages} totalElements={page.totalElements} loading={loading} onChange={buscar} />}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <StateView kind="loading" />
          ) : erro ? (
            <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={() => buscar(0)} />
          ) : (
            <StateView kind="empty" icon="book" title="Nenhuma escola encontrada" />
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item.nome}</Text>
              <Chip label={item.contaSuspensa ? 'Suspensa' : 'Ativa'} tone={item.contaSuspensa ? 'danger' : 'success'} size="sm" />
            </View>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              CNPJ {maskCNPJ(item.cnpj)} · escola #{item.id}
            </Text>
            <View style={styles.actions}>
              <Button
                label="Vínculos"
                icon="link"
                variant="tertiary"
                size="md"
                onPress={() => navigation.navigate('AdminLinks')}
                style={styles.flex}
              />
              <Button
                label={item.contaSuspensa ? 'Reativar' : 'Suspender'}
                icon={item.contaSuspensa ? 'unlock' : 'lock'}
                variant="secondary"
                size="md"
                onPress={() => setAcao({ escola: item, tipo: item.contaSuspensa ? 'reativar' : 'suspender' })}
                style={styles.flex}
              />
            </View>
          </Card>
        )}
      />

      <ReasonDialog
        visible={!!acao}
        title={acao?.tipo === 'suspender' ? 'Suspender a conta da escola?' : 'Reativar a conta da escola?'}
        message={acao?.tipo === 'suspender' ? 'A escola não poderá entrar no aplicativo até ser reativada.' : undefined}
        confirmLabel={acao?.tipo === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
        required={acao?.tipo === 'suspender'}
        destructive={acao?.tipo === 'suspender'}
        loading={salvando}
        onConfirm={executar}
        onCancel={() => setAcao(null)}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { width: '100%', maxWidth: 1000, alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  filters: { gap: spacing.md },
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.label, color: colors.ink, flex: 1 },
  body: { ...typography.body, color: colors.slate700 },
  actions: { flexDirection: 'row', gap: layout.buttonGap },
});
