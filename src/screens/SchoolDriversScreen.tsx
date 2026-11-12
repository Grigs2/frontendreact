import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SchoolLayout from '../components/SchoolLayout';
import VinculoEscolaCard from '../components/VinculoEscolaCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { Button, Card, ScreenHeader, SegmentedControl, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import {
  VINCULOS_ATIVOS,
  VINCULOS_ENCERRADOS,
  VINCULOS_PENDENTES,
  vinculoEscolaService,
} from '../services/vinculoEscolaService';
import { MotoristaBuscaDTO, VinculoEscolaDTO } from '../types';
import { maskCPF, onlyDigits } from '../utils/masks';
import { validateCPF, validateEmail } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolDrivers'>;
type Aba = 'pendentes' | 'ativos' | 'encerrados';
type Chave = 'email' | 'cpf';

/** 4.3 e 4.4 — motoristas da escola: solicitações, vínculos ativos, encerrados e convite por e-mail/CPF. */
export default function SchoolDriversScreen({ navigation }: Props) {
  const { showToast } = useAppContext();
  const [vinculos, setVinculos] = useState<VinculoEscolaDTO[]>([]);
  const [aba, setAba] = useState<Aba>('pendentes');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [convidando, setConvidando] = useState(false);
  const [chave, setChave] = useState<Chave>('email');
  const [valor, setValor] = useState('');
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [encontrados, setEncontrados] = useState<MotoristaBuscaDTO[] | null>(null);
  const [escolhido, setEscolhido] = useState<MotoristaBuscaDTO | null>(null);
  const [enviando, setEnviando] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setVinculos(await vinculoEscolaService.listarEscola());
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível carregar os motoristas.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const grupos = useMemo(
    () => ({
      pendentes: vinculos.filter((v) => VINCULOS_PENDENTES.includes(v.status)),
      ativos: vinculos.filter((v) => VINCULOS_ATIVOS.includes(v.status)),
      encerrados: vinculos.filter((v) => VINCULOS_ENCERRADOS.includes(v.status)),
    }),
    [vinculos],
  );

  const buscar = async () => {
    const erro = chave === 'email' ? validateEmail(valor) : validateCPF(valor);
    setErroBusca(erro);
    if (erro) return;
    setBuscando(true);
    try {
      const filtro = chave === 'email' ? { email: valor.trim().toLowerCase() } : { cpf: onlyDigits(valor) };
      setEncontrados(await vinculoEscolaService.buscarMotorista(filtro));
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível buscar o motorista.'), 'error');
    } finally {
      setBuscando(false);
    }
  };

  const convidar = async () => {
    if (!escolhido) return;
    setEnviando(true);
    try {
      await vinculoEscolaService.convidar(escolhido.id);
      showToast('Convite enviado. O motorista precisa aceitar.', 'success');
      setEscolhido(null);
      setConvidando(false);
      setValor('');
      setEncontrados(null);
      setAba('pendentes');
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível enviar o convite.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const vazios: Record<Aba, string> = {
    pendentes: 'Nenhuma solicitação pendente. Novos pedidos de motoristas aparecem aqui.',
    ativos: 'Nenhum motorista vinculado ainda.',
    encerrados: 'Nenhum vínculo encerrado ou recusado.',
  };

  const header = (
    <View style={styles.header}>
      <ScreenHeader title="Motoristas" subtitle="Vínculos e solicitações da escola" />

      {convidando ? (
        <Card style={styles.search}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Convidar motorista
          </Text>
          <SegmentedControl
            options={[
              { value: 'email', label: 'E-mail' },
              { value: 'cpf', label: 'CPF' },
            ]}
            value={chave}
            onChange={(v) => {
              setChave(v);
              setValor('');
              setErroBusca(null);
              setEncontrados(null);
            }}
          />
          <TextField
            label={chave === 'email' ? 'E-mail do motorista' : 'CPF do motorista'}
            value={valor}
            onChangeText={(t) => {
              setValor(chave === 'cpf' ? maskCPF(t) : t);
              setErroBusca(null);
            }}
            keyboardType={chave === 'cpf' ? 'number-pad' : 'email-address'}
            autoCapitalize="none"
            hint="A busca é exata. O resultado mostra apenas o nome do motorista."
            error={erroBusca || undefined}
          />
          <Button label="Buscar" icon="search" variant="secondary" size="md" onPress={buscar} loading={buscando} fullWidth />
          {encontrados && !encontrados.length && (
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Nenhum motorista encontrado.</Text>
          )}
          {encontrados?.map((m) => (
            <Card key={m.id} variant="muted" onPress={() => setEscolhido(m)} accessibilityLabel={`${m.nome}. Convidar`}>
              <Text style={styles.resultTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{m.nome}</Text>
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Toque para convidar</Text>
            </Card>
          ))}
          <Button label="Cancelar" variant="tertiary" onPress={() => { setConvidando(false); setEncontrados(null); setValor(''); }} fullWidth />
        </Card>
      ) : (
        <Button label="Convidar motorista" icon="user-plus" onPress={() => setConvidando(true)} fullWidth />
      )}

      <SegmentedControl
        options={[
          { value: 'pendentes', label: `Pendentes (${grupos.pendentes.length})` },
          { value: 'ativos', label: `Ativos (${grupos.ativos.length})` },
          { value: 'encerrados', label: 'Encerrados' },
        ]}
        value={aba}
        onChange={setAba}
      />
    </View>
  );

  return (
    <SchoolLayout>
      {loading ? (
        <StateView kind="loading" title="Carregando motoristas..." />
      ) : error ? (
        <StateView kind="error" title="Não foi possível carregar" message={error} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={grupos[aba]}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          contentContainerStyle={styles.content}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: layout.cardGap }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={<StateView kind="empty" title="Nada por aqui" message={vazios[aba]} icon="truck" />}
          renderItem={({ item }) => (
            <VinculoEscolaCard
              vinculo={item}
              perspectiva="escola"
              onPress={() => navigation.navigate('SchoolDriverLinkDetail', { vinculo: item })}
            />
          )}
        />
      )}

      <ConfirmDialog
        visible={!!escolhido}
        title="Convidar motorista?"
        message={`${escolhido?.nome ?? ''} receberá o convite e poderá aceitar ou recusar.`}
        confirmLabel="Enviar convite"
        cancelLabel="Voltar"
        destructive={false}
        loading={enviando}
        onConfirm={convidar}
        onCancel={() => setEscolhido(null)}
      />
    </SchoolLayout>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  search: { gap: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.ink },
  resultTitle: { ...typography.label, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
});
