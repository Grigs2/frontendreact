import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import VinculoEscolaCard from '../components/VinculoEscolaCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { Notice } from '../components/Feedback';
import { Button, Card, ScreenHeader, SegmentedControl, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { motoristaService } from '../services/motoristaService';
import {
  VINCULOS_ATIVOS,
  VINCULOS_ENCERRADOS,
  VINCULOS_PENDENTES,
  vinculoEscolaService,
} from '../services/vinculoEscolaService';
import { EscolaBuscaDTO, VinculoEscolaDTO } from '../types';
import { maskCNPJ } from '../utils/masks';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverSchools'>;
type Aba = 'ativas' | 'pendentes' | 'encerradas';

/** 2.4 — vínculos do motorista com escolas: pedir, acompanhar, responder convites e encerrar. */
export default function DriverSchoolsScreen({ navigation }: Props) {
  const { showToast } = useAppContext();
  const [vinculos, setVinculos] = useState<VinculoEscolaDTO[]>([]);
  const [aba, setAba] = useState<Aba>('ativas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca de escola (2.4.1–2.4.3)
  const [buscando, setBuscando] = useState(false);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<EscolaBuscaDTO[]>([]);
  const [pesquisando, setPesquisando] = useState(false);
  const [escolhida, setEscolhida] = useState<EscolaBuscaDTO | null>(null);
  const [enviando, setEnviando] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setVinculos(await vinculoEscolaService.listarMotorista());
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível carregar seus vínculos.'));
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

  // Busca com espera de 400 ms (mín. 2 caracteres no backend).
  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) {
      setResultados([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setPesquisando(true);
      try {
        setResultados(await motoristaService.buscarEscolas(t));
      } catch (e) {
        showToast(getApiErrorMessage(e, 'Não foi possível buscar escolas.'), 'error');
      } finally {
        setPesquisando(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [termo, showToast]);

  const grupos = useMemo(
    () => ({
      ativas: vinculos.filter((v) => VINCULOS_ATIVOS.includes(v.status)),
      pendentes: vinculos.filter((v) => VINCULOS_PENDENTES.includes(v.status)),
      encerradas: vinculos.filter((v) => VINCULOS_ENCERRADOS.includes(v.status)),
    }),
    [vinculos],
  );
  const recebidos = grupos.pendentes.filter((v) => v.status === 'PENDENTE_MOTORISTA').length;

  const solicitar = async () => {
    if (!escolhida) return;
    setEnviando(true);
    try {
      await vinculoEscolaService.solicitar(escolhida.cnpj);
      showToast('Solicitação enviada. A escola precisa aprovar o vínculo.', 'success');
      setEscolhida(null);
      setBuscando(false);
      setTermo('');
      setAba('pendentes');
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível enviar a solicitação.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const vazios: Record<Aba, string> = {
    ativas: 'Nenhuma escola vinculada. Solicite o vínculo com as escolas que você atende.',
    pendentes: 'Nenhuma solicitação pendente. Você verá aqui os pedidos enviados e os convites das escolas.',
    encerradas: 'Nenhum vínculo encerrado ou recusado.',
  };

  const header = (
    <View style={styles.header}>
      <ScreenHeader title="Minhas escolas" subtitle="Vínculos com as escolas atendidas" onBack={() => navigation.goBack()} />

      {buscando ? (
        <Card style={styles.search}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Solicitar vínculo
          </Text>
          <TextField
            label="Nome ou CNPJ da escola"
            value={termo}
            onChangeText={setTermo}
            leftIcon="search"
            placeholder="Ex.: Escola Municipal Pedro II"
            autoFocus
            hint="Digite ao menos 2 letras"
          />
          {pesquisando && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Buscando…</Text>}
          {!pesquisando && termo.trim().length >= 2 && !resultados.length && (
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Nenhuma escola encontrada.</Text>
          )}
          {resultados.map((escola) => (
            <Card key={escola.id} variant="muted" onPress={() => setEscolhida(escola)} accessibilityLabel={`${escola.nome}. Selecionar`}>
              <Text style={styles.resultTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{escola.nome}</Text>
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>CNPJ {maskCNPJ(escola.cnpj)}</Text>
            </Card>
          ))}
          <Button label="Cancelar" variant="tertiary" onPress={() => { setBuscando(false); setTermo(''); }} fullWidth />
        </Card>
      ) : (
        <Button label="Solicitar vínculo com escola" icon="plus" onPress={() => setBuscando(true)} fullWidth />
      )}

      {recebidos > 0 && aba !== 'pendentes' && (
        <Notice tone="warning" title="Convites aguardando você">
          {`${recebidos} escola${recebidos === 1 ? '' : 's'} convidou você. Abra "Pendentes" para responder.`}
        </Notice>
      )}

      <SegmentedControl
        options={[
          { value: 'ativas', label: `Vinculadas (${grupos.ativas.length})` },
          { value: 'pendentes', label: `Pendentes (${grupos.pendentes.length})` },
          { value: 'encerradas', label: 'Encerradas' },
        ]}
        value={aba}
        onChange={setAba}
      />
    </View>
  );

  return (
    <DriverLayout>
      {loading ? (
        <StateView kind="loading" title="Carregando vínculos..." />
      ) : error ? (
        <StateView kind="error" title="Não foi possível carregar" message={error} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={grupos[aba]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          style={styles.list}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: layout.cardGap }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={<StateView kind="empty" title="Nada por aqui" message={vazios[aba]} icon="book" />}
          renderItem={({ item }) => (
            <VinculoEscolaCard
              vinculo={item}
              perspectiva="motorista"
              onPress={() => navigation.navigate('DriverSchoolLinkDetail', { vinculo: item })}
            />
          )}
        />
      )}

      <ConfirmDialog
        visible={!!escolhida}
        title="Solicitar vínculo?"
        message={`A escola ${escolhida?.nome ?? ''} receberá seu pedido e poderá aprovar ou recusar.`}
        confirmLabel="Enviar solicitação"
        cancelLabel="Voltar"
        destructive={false}
        loading={enviando}
        onConfirm={solicitar}
        onCancel={() => setEscolhida(null)}
      />
    </DriverLayout>
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
