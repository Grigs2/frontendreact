import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { dependenteService } from '../services/dependenteService';
import { DependenteDTO, EnderecoDependenteDTO, EscolaDTO, ResponsavelDTO } from '../types';
import PasswordConfirmationModal from '../components/PasswordConfirmationModal';
import { Button, Card, Chip, ListRow, ScreenHeader, SegmentedControl, StateView, TextField } from '../components/ui';
import { AddressErrors, AddressForm, AddressValue, EMPTY_ADDRESS, formatAddress, hasErrors, validateAddress } from '../components/forms';
import { brToIsoDate, isoToBrDate, maskCPF, maskDate, onlyDigits } from '../utils/masks';
import { ageLabel, validateCPF, validateDependentBirthDate } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependentForm'>;

type Periodo = 'MANHA' | 'TARDE' | 'NOITE';
const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'MANHA', label: 'Manhã' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOITE', label: 'Noite' },
];

type Errors = Partial<Record<'nome' | 'cpf' | 'nascimento' | 'escola', string | null>>;

const toAddressValue = (e?: EnderecoDependenteDTO | null): AddressValue =>
  e
    ? {
        cep: e.cep?.length === 8 ? `${e.cep.slice(0, 5)}-${e.cep.slice(5)}` : e.cep || '',
        logradouro: e.logradouro || '',
        numero: e.numero || '',
        complemento: e.complemento || '',
        bairro: e.bairro || '',
        cidade: e.cidade || '',
        uf: e.uf || '',
      }
    : EMPTY_ADDRESS;

/** Cadastro e edição do aluno: dados com máscara e validação, idade calculada, escola, período e endereço por CEP. */
export default function GuardianDependentFormScreen({ route, navigation }: Props) {
  const { dependentId } = route.params || {};
  const isEdit = !!dependentId;
  const { currentUser, setCurrentUser, showToast } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('MANHA');
  const [escola, setEscola] = useState<{ id: number; nome: string } | null>(null);
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [enderecoId, setEnderecoId] = useState<number | undefined>();

  const [errors, setErrors] = useState<Errors>({});
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [schools, setSchools] = useState<EscolaDTO[]>([]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useEffect(() => {
    responsavelService.listarEscolas().then(setSchools).catch(() => setSchools([]));
  }, []);

  // Edição: preenche com os dados atuais e com o endereço estruturado, quando existir.
  useEffect(() => {
    if (!dependentId) return;
    const dep = guardian?.dependentes?.find((d) => d.id === dependentId);
    if (dep) {
      setNome(dep.nome || '');
      setCpf(maskCPF(dep.cpf || ''));
      setNascimento(isoToBrDate(dep.dataNascimento));
      if (dep.periodo === 'MANHA' || dep.periodo === 'TARDE' || dep.periodo === 'NOITE') setPeriodo(dep.periodo);
      if (dep.escola) setEscola({ id: dep.escola.id, nome: dep.escola.nome });
    }
    responsavelService
      .listarEnderecosDependente(dependentId)
      .then((lista) => {
        const atual = lista?.[0];
        if (atual) {
          setAddress(toAddressValue(atual));
          setEnderecoId(atual.id);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependentId]);

  const idade = ageLabel(nascimento);
  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    return q ? schools.filter((s) => s.nome.toLowerCase().includes(q)) : schools;
  }, [schools, schoolQuery]);

  const clearError = (field: keyof Errors) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const fieldValidators = {
    nome: () => (nome.trim().split(/\s+/).length < 2 ? 'Informe nome e sobrenome.' : null),
    cpf: () => validateCPF(cpf),
    nascimento: () => validateDependentBirthDate(nascimento),
  };
  const fieldValues = { nome, cpf, nascimento };
  type CampoTexto = keyof typeof fieldValidators;

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const fieldRefs = useRef<Partial<Record<CampoTexto, React.ComponentRef<typeof TextInput> | null>>>({});
  const bindRef = (field: CampoTexto) => (input: React.ComponentRef<typeof TextInput> | null) => {
    fieldRefs.current[field] = input;
  };

  /** Ao sair do campo: valida o que foi digitado (vazio só é cobrado ao salvar). */
  const validateOnBlur = (field: CampoTexto) => () => {
    if (!fieldValues[field].trim()) return;
    const message = fieldValidators[field]();
    setErrors((e) => (e[field] === message ? e : { ...e, [field]: message }));
  };

  const validate = () => {
    const next: Errors = {
      nome: fieldValidators.nome(),
      cpf: fieldValidators.cpf(),
      nascimento: fieldValidators.nascimento(),
      escola: escola ? null : 'Selecione a escola do aluno.',
    };
    const nextAddress = validateAddress(address);
    setErrors(next);
    setAddressErrors(nextAddress);
    const ok = !hasErrors(next) && !hasErrors(nextAddress);
    if (!ok) {
      // Foco no primeiro campo com erro; escola e endereço (sem campo de texto aqui) fazem a tela rolar.
      const first = (['nome', 'cpf', 'nascimento'] as CampoTexto[]).find((f) => next[f]);
      if (first) setTimeout(() => fieldRefs.current[first]?.focus(), 50);
      else if (!next.escola) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
    return ok;
  };

  const handlePreSave = () => {
    if (!validate()) {
      showToast('Confira os campos destacados.', 'error');
      return;
    }
    if (isEdit) setShowPasswordModal(true);
    else handleSave();
  };

  const buildDto = (): DependenteDTO => ({
    nome: nome.trim(),
    cpf: maskCPF(cpf),
    dataNascimento: brToIsoDate(nascimento),
    periodo,
    endereco: formatAddress(address),
  });

  const saveStructuredAddress = async (idDependente: number) => {
    await responsavelService.salvarEnderecoDependente(idDependente, {
      id: enderecoId,
      cep: onlyDigits(address.cep),
      logradouro: address.logradouro.trim(),
      numero: address.numero.trim(),
      complemento: address.complemento.trim() || null,
      bairro: address.bairro.trim(),
      cidade: address.cidade.trim(),
      uf: address.uf.trim().toUpperCase(),
      finalidade: 'AMBOS',
    });
  };

  const handleSave = async (password?: string) => {
    if (!guardian?.id || !escola) return;
    setLoading(true);
    try {
      let idDependente = dependentId;
      if (isEdit && dependentId) {
        await dependenteService.alterarInfos({ id: dependentId, ...buildDto(), senha: password });
      } else {
        const updated = await responsavelService.cadastrarDependente(guardian.id, buildDto());
        idDependente = updated.dependentes?.find((d) => onlyDigits(d.cpf) === onlyDigits(cpf))?.id;
      }
      if (!idDependente) throw new Error('Não foi possível identificar o aluno cadastrado.');

      const finalGuardian = await responsavelService.vincularEscola(guardian.id, escola.id, idDependente);
      try {
        await saveStructuredAddress(idDependente);
      } catch (addressError) {
        // O aluno foi salvo; o endereço estruturado pode ser corrigido depois.
        showToast(getApiErrorMessage(addressError, 'Aluno salvo, mas o endereço não foi validado. Confira o CEP.'), 'warning');
      }
      setCurrentUser(finalGuardian, 'RESPONSAVEL');
      setShowPasswordModal(false);
      showToast(isEdit ? 'Dados do aluno atualizados.' : 'Aluno cadastrado com sucesso.', 'success');
      navigation.navigate('GuardianDependents');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível salvar o aluno.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.screen}>
        <StateView kind="loading" title="Carregando dados do aluno..." style={styles.flex} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={isEdit ? 'Editar aluno' : 'Novo aluno'}
          subtitle="Dados usados pelo motorista para a chamada e as paradas"
          onBack={() => navigation.goBack()}
        />

        <Card style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Dados do aluno
          </Text>
          <TextField
            label="Nome completo"
            value={nome}
            onChangeText={(t) => {
              setNome(t);
              clearError('nome');
            }}
            placeholder="Ex.: Enzo Silva Rodrigues"
            autoCapitalize="words"
            leftIcon="user"
            editable={!loading}
            error={errors.nome || undefined}
            onBlur={validateOnBlur('nome')}
            ref={bindRef('nome')}
          />
          <TextField
            label="CPF do aluno"
            value={cpf}
            onChangeText={(t) => {
              setCpf(maskCPF(t));
              clearError('cpf');
            }}
            placeholder="000.000.000-00"
            keyboardType="number-pad"
            maxLength={14}
            leftIcon="credit-card"
            editable={!loading && !isEdit}
            hint={isEdit ? 'O CPF não pode ser alterado.' : undefined}
            error={errors.cpf || undefined}
            onBlur={validateOnBlur('cpf')}
            ref={bindRef('cpf')}
          />
          <View style={styles.row}>
            <TextField
              label="Data de nascimento"
              value={nascimento}
              onChangeText={(t) => {
                setNascimento(maskDate(t));
                clearError('nascimento');
              }}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              leftIcon="calendar"
              editable={!loading}
              error={errors.nascimento || undefined}
            onBlur={validateOnBlur('nascimento')}
            ref={bindRef('nascimento')}
              containerStyle={styles.rowMain}
            />
            <View style={styles.ageBox} accessibilityLabel={idade ? `Idade: ${idade}` : 'Idade calculada pela data'}>
              <Text style={styles.ageLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>Idade</Text>
              <Text style={[styles.ageValue, !idade && styles.ageEmpty]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {idade || '—'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Escola e período
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Escola</Text>
            <Pressable
              onPress={() => setShowSchoolModal(true)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={escola ? `Escola: ${escola.nome}. Alterar` : 'Selecionar escola'}
              style={({ pressed }) => [styles.select, !!errors.escola && styles.selectError, pressed && styles.selectPressed]}
            >
              <Feather name="book-open" size={20} color={colors.slate500} />
              <Text style={[styles.selectValue, !escola && styles.selectPlaceholder]} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {escola?.nome || 'Selecionar escola'}
              </Text>
              <Feather name="chevron-down" size={20} color={colors.ink} />
            </Pressable>
            {!!errors.escola && (
              <Text style={styles.error} maxFontSizeMultiplier={maxFontSizeMultiplier}>{errors.escola}</Text>
            )}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Período de aula</Text>
            <SegmentedControl options={PERIODOS} value={periodo} onChange={(v) => setPeriodo(v as Periodo)} />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Endereço de embarque
          </Text>
          <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Onde o aluno embarca e desembarca. Também usamos o bairro para sugerir motoristas próximos.
          </Text>
          <AddressForm
            value={address}
            onChange={(v) => {
              setAddress(v);
              if (hasErrors(addressErrors)) setAddressErrors({});
            }}
            errors={addressErrors}
            editable={!loading}
          />
        </Card>

        <Button label={isEdit ? 'Salvar alterações' : 'Cadastrar aluno'} icon="check" onPress={handlePreSave} loading={loading} fullWidth />
      </ScrollView>

      <Modal visible={showSchoolModal} transparent animationType="slide" onRequestClose={() => setShowSchoolModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Escola do aluno
            </Text>
            <TextField label="Buscar escola" value={schoolQuery} onChangeText={setSchoolQuery} placeholder="Nome da escola" leftIcon="search" />
            <FlatList
              data={filteredSchools}
              keyExtractor={(item) => String(item.id)}
              style={styles.modalList}
              renderItem={({ item, index }) => (
                <ListRow
                  icon="book-open"
                  title={item.nome}
                  caption={item.usuarioDTO?.endereco || undefined}
                  divider={index > 0}
                  right={escola?.id === item.id ? <Chip label="Selecionada" tone="success" size="sm" /> : undefined}
                  onPress={() => {
                    setEscola({ id: item.id!, nome: item.nome });
                    clearError('escola');
                    setShowSchoolModal(false);
                  }}
                />
              )}
              ListEmptyComponent={<StateView kind="empty" icon="book" title="Nenhuma escola encontrada." />}
            />
            <Button label="Cancelar" variant="tertiary" onPress={() => setShowSchoolModal(false)} fullWidth />
          </View>
        </View>
      </Modal>

      <PasswordConfirmationModal
        visible={showPasswordModal}
        onConfirm={handleSave}
        onCancel={() => setShowPasswordModal(false)}
        loading={loading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: layout.screenMargin, paddingTop: 48, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  section: { gap: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.ink },
  fieldGroup: { gap: spacing.sm },
  label: { ...typography.captionBold, color: colors.slate700 },
  hint: { ...typography.caption, color: colors.slate500, marginTop: -spacing.sm },
  error: { ...typography.caption, color: colors.danger },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rowMain: { flex: 1 },
  ageBox: {
    width: 96,
    gap: spacing.sm,
  },
  ageLabel: { ...typography.captionBold, color: colors.slate700 },
  ageValue: {
    ...typography.label,
    color: colors.ink,
    minHeight: layout.buttonLg,
    lineHeight: layout.buttonLg,
    textAlign: 'center',
    borderRadius: radius.input,
    backgroundColor: colors.primaryTint,
    overflow: 'hidden',
  },
  ageEmpty: { color: colors.slate500, backgroundColor: colors.background },
  select: {
    minHeight: layout.buttonLg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectError: { borderColor: colors.danger, borderWidth: borders.alert },
  selectPressed: { backgroundColor: colors.background },
  selectValue: { ...typography.body, color: colors.ink, flex: 1 },
  selectPlaceholder: { color: colors.slate500 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  modalTitle: { ...typography.heading, color: colors.ink },
  modalList: { flexGrow: 0 },
});
