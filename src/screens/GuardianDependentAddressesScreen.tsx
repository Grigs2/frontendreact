import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import {
  AddressErrors,
  AddressForm,
  AddressValue,
  EMPTY_ADDRESS,
  RadioCardGroup,
  hasErrors,
  validateAddress,
} from '../components/forms';
import { Button, Card, Chip, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { EnderecoDependenteDTO, ResponsavelDTO } from '../types';
import { maskCEP } from '../utils/masks';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependentAddresses'>;
type Finalidade = EnderecoDependenteDTO['finalidade'];

const FINALIDADES: { value: Finalidade; label: string; description: string }[] = [
  { value: 'AMBOS', label: 'Embarque e desembarque', description: 'O aluno sai e volta para o mesmo endereço' },
  { value: 'EMBARQUE', label: 'Só embarque', description: 'Onde o aluno é buscado' },
  { value: 'DESEMBARQUE', label: 'Só desembarque', description: 'Onde o aluno é deixado' },
];

const FINALIDADE_LABEL: Record<string, string> = { EMBARQUE: 'Embarque', DESEMBARQUE: 'Desembarque', AMBOS: 'Embarque e desembarque' };

const toValue = (e: EnderecoDependenteDTO): AddressValue => ({
  cep: maskCEP(e.cep || ''),
  logradouro: e.logradouro || '',
  numero: e.numero || '',
  complemento: e.complemento || '',
  bairro: e.bairro || '',
  cidade: e.cidade || '',
  uf: e.uf || '',
});

/** 3.4 — endereços do aluno: listar, adicionar (CEP com preenchimento automático ou manual), editar e desativar. */
export default function GuardianDependentAddressesScreen({ navigation, route }: Props) {
  const { dependenteId } = route.params;
  const { currentUser, showToast } = useAppContext();
  const dependente = (currentUser as ResponsavelDTO)?.dependentes?.find((d) => d.id === dependenteId);

  const [enderecos, setEnderecos] = useState<EnderecoDependenteDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<EnderecoDependenteDTO | 'novo' | null>(null);
  const [valor, setValor] = useState<AddressValue>(EMPTY_ADDRESS);
  const [finalidade, setFinalidade] = useState<Finalidade>('AMBOS');
  const [erros, setErros] = useState<AddressErrors>({});
  const [salvando, setSalvando] = useState(false);
  const [desativar, setDesativar] = useState<EnderecoDependenteDTO | null>(null);

  const load = useCallback(async () => {
    try {
      setErro(null);
      setEnderecos(await responsavelService.listarEnderecosDependente(dependenteId));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os endereços.'));
    }
  }, [dependenteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const ativos = (enderecos ?? []).filter((e) => e.ativo !== false);
  const inativos = (enderecos ?? []).filter((e) => e.ativo === false);
  const ocupadas = new Set(
    ativos
      .filter((e) => editando === 'novo' || e.id !== (editando as EnderecoDependenteDTO | null)?.id)
      .flatMap((e) => (e.finalidade === 'AMBOS' ? ['EMBARQUE', 'DESEMBARQUE'] : [e.finalidade])),
  );
  const conflito =
    finalidade === 'AMBOS' ? ocupadas.has('EMBARQUE') || ocupadas.has('DESEMBARQUE') : ocupadas.has(finalidade);

  const abrir = (e: EnderecoDependenteDTO | 'novo') => {
    setEditando(e);
    setErros({});
    if (e === 'novo') {
      setValor(EMPTY_ADDRESS);
      setFinalidade(ativos.length ? (ocupadasSem('EMBARQUE') ? 'DESEMBARQUE' : 'EMBARQUE') : 'AMBOS');
    } else {
      setValor(toValue(e));
      setFinalidade(e.finalidade);
    }
  };

  // Sugere a finalidade ainda livre ao adicionar um segundo endereço.
  function ocupadasSem(f: string) {
    return ativos.some((e) => e.finalidade === f || e.finalidade === 'AMBOS');
  }

  const salvar = async () => {
    const e = validateAddress(valor);
    setErros(e);
    if (hasErrors(e)) return;
    setSalvando(true);
    try {
      await responsavelService.salvarEnderecoDependente(dependenteId, {
        id: editando !== 'novo' ? editando?.id : undefined,
        cep: maskCEP(valor.cep),
        logradouro: valor.logradouro.trim(),
        numero: valor.numero.trim(),
        complemento: valor.complemento.trim() || null,
        bairro: valor.bairro.trim(),
        cidade: valor.cidade.trim(),
        uf: valor.uf.trim().toUpperCase(),
        finalidade,
      });
      showToast('Endereço salvo.', 'success');
      setEditando(null);
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível salvar o endereço.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const confirmarDesativar = async () => {
    if (!desativar?.id) return;
    setSalvando(true);
    try {
      await responsavelService.desativarEnderecoDependente(dependenteId, desativar.id);
      showToast('Endereço desativado.', 'success');
      setDesativar(null);
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível desativar o endereço.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const renderEndereco = (e: EnderecoDependenteDTO, inativo = false) => (
    <Card key={e.id} variant={inativo ? 'muted' : 'default'} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {FINALIDADE_LABEL[e.finalidade] ?? e.finalidade}
        </Text>
        {inativo ? (
          <Chip label="Desativado" tone="neutral" size="sm" />
        ) : e.statusValidacao === 'PENDENTE' ? (
          <Chip label="CEP não confirmado" tone="warning" size="sm" />
        ) : (
          <Chip label="Ativo" tone="success" size="sm" />
        )}
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {e.logradouro}, {e.numero}
        {e.complemento ? ` - ${e.complemento}` : ''}
      </Text>
      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {e.bairro} · {e.cidade}/{e.uf} · CEP {maskCEP(e.cep)}
      </Text>
      {!inativo && editando === null && (
        <View style={styles.rowActions}>
          <Button label="Editar" icon="edit-2" variant="secondary" size="md" onPress={() => abrir(e)} style={styles.flex} />
          <Button label="Desativar" icon="slash" variant="tertiary" size="md" onPress={() => setDesativar(e)} style={styles.flex} />
        </View>
      )}
    </Card>
  );

  const body =
    erro ? (
      <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={load} />
    ) : enderecos === null ? (
      <StateView kind="loading" title="Carregando endereços..." />
    ) : (
      <>
        <Notice tone="info">
          Pode haver um endereço ativo para embarque e um para desembarque. "Embarque e desembarque" ocupa os dois. As
          viagens já realizadas guardam o endereço usado naquela data.
        </Notice>

        {editando !== null ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {editando === 'novo' ? 'Novo endereço' : 'Editar endereço'}
            </Text>
            <AddressForm
              value={valor}
              onChange={(v) => {
                setValor(v);
                if (hasErrors(erros)) setErros({});
              }}
              errors={erros}
              editable={!salvando}
            />
            <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Uso do endereço</Text>
            <RadioCardGroup
              options={FINALIDADES}
              value={finalidade}
              onChange={setFinalidade}
              accessibilityLabel="Uso do endereço"
            />
            {conflito && (
              <Notice tone="warning">
                Já existe um endereço ativo para essa finalidade. Desative-o ou escolha outra opção antes de salvar.
              </Notice>
            )}
            <View style={styles.actions}>
              <Button label="Salvar endereço" icon="check" onPress={salvar} loading={salvando} disabled={conflito} fullWidth />
              <Button label="Cancelar" variant="tertiary" onPress={() => setEditando(null)} disabled={salvando} fullWidth />
            </View>
          </Card>
        ) : (
          <Button label="Adicionar endereço" icon="plus" onPress={() => abrir('novo')} fullWidth />
        )}

        {ativos.length ? ativos.map((e) => renderEndereco(e)) : (
          <StateView kind="empty" icon="map-pin" title="Nenhum endereço ativo" message="Adicione o endereço de embarque do aluno." />
        )}

        {inativos.length > 0 && (
          <>
            <SectionTitle>Desativados</SectionTitle>
            {inativos.map((e) => renderEndereco(e, true))}
          </>
        )}
      </>
    );

  return (
    <GuardianLayout>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Endereços" subtitle={dependente?.nome} onBack={() => navigation.goBack()} />
          {body}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={!!desativar}
        title="Desativar endereço?"
        message="O endereço deixa de ser usado nas próximas viagens. O histórico das viagens passadas não muda."
        confirmLabel="Desativar"
        loading={salvando}
        onConfirm={confirmarDesativar}
        onCancel={() => setDesativar(null)}
      />
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  card: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  label: { ...typography.label, color: colors.ink, marginTop: spacing.sm },
  rowActions: { flexDirection: 'row', gap: layout.buttonGap, marginTop: spacing.sm },
  actions: { gap: layout.buttonGap, marginTop: spacing.sm },
});
