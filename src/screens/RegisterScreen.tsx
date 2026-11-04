import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HOME_BY_ROLE, RegisterRole, RootStackParamList } from '../navigation';
import { motoristaService } from '../services/motoristaService';
import { responsavelService } from '../services/responsavelService';
import { escolaService } from '../services/escolaService';
import { authService } from '../services/authService';
import { useAppContext } from '../context/AppContext';
import { Button, ScreenHeader, TextField } from '../components/ui';
import {
  AddressForm,
  AddressErrors,
  AddressValue,
  Checkbox,
  EMPTY_ADDRESS,
  PasswordStrength,
  RadioCardGroup,
  RadioCardOption,
  StepIndicator,
  formatAddress,
  hasErrors,
  toEnderecoOperacional,
  validateAddress,
} from '../components/forms';
import { brToIsoDate, maskCNH, maskCNPJ, maskCPF, maskDate, maskPhone, onlyDigits } from '../utils/masks';
import {
  validateBirthDate,
  validateCNH,
  validateCNPJ,
  validateCPF,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validatePhone,
  validateRequired,
} from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { ResponsavelDTO } from '../types';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type StepKey = 'acesso' | 'pessoais' | 'endereco' | 'documentos';

// Progressive disclosure: cada perfil vê apenas as etapas que se aplicam a ele.
const STEPS: Record<RegisterRole, { key: StepKey; title: string }[]> = {
  driver: [
    { key: 'acesso', title: 'Dados de acesso' },
    { key: 'pessoais', title: 'Dados pessoais' },
    { key: 'endereco', title: 'Endereço' },
    { key: 'documentos', title: 'Documentação' },
  ],
  guardian: [
    { key: 'acesso', title: 'Dados de acesso' },
    { key: 'pessoais', title: 'Dados pessoais' },
    { key: 'endereco', title: 'Endereço' },
  ],
  school: [
    { key: 'acesso', title: 'Dados de acesso' },
    { key: 'pessoais', title: 'Dados da instituição' },
    { key: 'endereco', title: 'Endereço' },
  ],
};

const ROLE_OPTIONS: RadioCardOption<RegisterRole>[] = [
  { value: 'guardian', label: 'Responsável', description: 'Acompanhe o transporte dos seus dependentes', icon: 'users' },
  { value: 'driver', label: 'Motorista', description: 'Gerencie rotas, alunos e a chamada', icon: 'truck' },
  { value: 'school', label: 'Escola', description: 'Acompanhe o transporte dos alunos', icon: 'book' },
];

const API_ROLE = { driver: 'MOTORISTA', guardian: 'RESPONSAVEL', school: 'ESCOLA' } as const;

type Errors = Record<string, string | null | undefined>;

export default function RegisterScreen({ navigation, route }: Props) {
  const { showToast, setCurrentUser } = useAppContext();
  const scrollRef = useRef<ScrollView>(null);

  const [role, setRole] = useState<RegisterRole>(route.params?.role ?? 'guardian');
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Etapa 1 — acesso
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Etapa 2 — dados pessoais / instituição
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [admResponsavel, setAdmResponsavel] = useState('');
  // Etapa 3 — endereço
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  // Etapa 4 — documentação (motorista)
  const [cnh, setCnh] = useState('');
  // Termos (última etapa)
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

  const steps = STEPS[role];
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const clearError = (field: string) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const validateStep = (key: StepKey): boolean => {
    let stepErrors: Errors = {};
    let valid = true;

    if (key === 'acesso') {
      stepErrors = {
        email: validateEmail(email),
        password: validatePassword(password),
        passwordConfirmation: validatePasswordConfirmation(password, passwordConfirmation),
      };
    } else if (key === 'pessoais') {
      stepErrors =
        role === 'school'
          ? {
              name: validateRequired(name, 'o nome da escola'),
              cnpj: validateCNPJ(cnpj),
              admResponsavel: validateRequired(admResponsavel, 'o administrador responsável'),
              phone: validatePhone(phone),
            }
          : {
              name: name.trim().split(/\s+/).length < 2 ? 'Informe o nome completo.' : null,
              cpf: validateCPF(cpf),
              birthDate: validateBirthDate(birthDate, 18),
              phone: validatePhone(phone),
            };
    } else if (key === 'endereco') {
      const nextAddressErrors = validateAddress(address);
      setAddressErrors(nextAddressErrors);
      valid = !hasErrors(nextAddressErrors);
    } else if (key === 'documentos') {
      stepErrors = { cnh: validateCNH(cnh) };
    }

    if (steps[steps.length - 1].key === key) {
      stepErrors.terms = acceptedTerms ? null : 'É preciso aceitar os termos para criar a conta.';
    }

    setErrors((e) => ({ ...e, ...stepErrors }));
    return valid && !hasErrors(stepErrors);
  };

  const goToStep = (index: number) => {
    setStepIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = () => {
    if (!validateStep(step.key)) return;
    if (isLastStep) {
      handleSubmit();
    } else {
      goToStep(stepIndex + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      goToStep(stepIndex - 1);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  /** Leva o usuário à etapa do campo recusado pelo backend (e-mail/CPF duplicado, CEP inválido...). */
  const stepForBackendMessage = (message: string) => {
    const m = message.toLowerCase();
    const find = (key: StepKey) => steps.findIndex((s) => s.key === key);
    if (m.includes('e-mail') || m.includes('email') || m.includes('senha')) return find('acesso');
    if (['cpf', 'cnpj', 'idade', 'nascimento', 'telefone'].some((k) => m.includes(k))) return find('pessoais');
    if (['cep', 'endere', 'logradouro', 'uf'].some((k) => m.includes(k))) return find('endereco');
    if (m.includes('cnh')) return find('documentos');
    return -1;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const usuario = {
      email: email.trim(),
      senha: password,
      endereco: formatAddress(address),
      telefone: maskPhone(phone),
      tipoPerfil: API_ROLE[role],
      aceitouTermos: true,
    };

    try {
      if (role === 'driver') {
        await motoristaService.cadastrar({
          nome: name.trim(),
          dataNascimento: brToIsoDate(birthDate),
          cpf: maskCPF(cpf),
          cnh: onlyDigits(cnh),
          usuarioDTO: usuario,
          enderecoOperacionalDTO: toEnderecoOperacional(address),
        });
      } else if (role === 'guardian') {
        await responsavelService.cadastrar({
          nome: name.trim(),
          cpf: maskCPF(cpf),
          dataNascimento: brToIsoDate(birthDate),
          usuario,
        } as ResponsavelDTO);
      } else {
        await escolaService.cadastrar({
          nome: name.trim(),
          cnpj: maskCNPJ(cnpj),
          admResponsavel: admResponsavel.trim(),
          usuarioDTO: usuario,
          enderecoOperacionalDTO: toEnderecoOperacional(address),
        });
      }
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Não foi possível realizar o cadastro.');
      showToast(message, 'error');
      const target = stepForBackendMessage(message);
      if (target >= 0 && target !== stepIndex) goToStep(target);
      setLoading(false);
      return;
    }

    // Conta criada: entra automaticamente com as credenciais recém-cadastradas.
    try {
      const session = await authService.entrar(email.trim(), password);
      setCurrentUser(session.user, session.role);
      showToast('Conta criada com sucesso! Bem-vindo(a).', 'success');
      navigation.reset({ index: 0, routes: [{ name: HOME_BY_ROLE[session.role] }] });
    } catch {
      showToast('Conta criada com sucesso! Entre com seu e-mail e senha.', 'success');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } finally {
      setLoading(false);
    }
  };

  const title = useMemo(
    () => ({ driver: 'Novo Motorista', guardian: 'Novo Responsável', school: 'Nova Escola' }[role]),
    [role],
  );

  const termsCheckbox = (
    <Checkbox
      checked={acceptedTerms}
      onChange={(value) => {
        setAcceptedTerms(value);
        clearError('terms');
      }}
      label="Li e aceito os Termos de Uso e a Política de Privacidade."
      error={errors.terms}
    />
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          <ScreenHeader
            title={title}
            subtitle="Preencha os dados para criar sua conta"
            onBack={handleBack}
            style={styles.header}
          />

          <StepIndicator steps={steps.map((s) => s.title)} current={stepIndex} />

          <View style={styles.card}>
            {step.key === 'acesso' && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Tipo de conta</Text>
                  <RadioCardGroup
                    options={ROLE_OPTIONS}
                    value={role}
                    accessibilityLabel="Tipo de conta"
                    onChange={(value) => {
                      setRole(value);
                      setErrors({});
                    }}
                  />
                </View>
                <TextField
                  label="E-mail"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    clearError('email');
                  }}
                  placeholder="nome@dominio.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  leftIcon="mail"
                  error={errors.email || undefined}
                />
                <TextField
                  label="Senha"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearError('password');
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  leftIcon="lock"
                  rightIcon={showPassword ? 'eye-off' : 'eye'}
                  rightIconLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  error={errors.password || undefined}
                />
                <PasswordStrength value={password} />
                <TextField
                  label="Confirmar senha"
                  value={passwordConfirmation}
                  onChangeText={(text) => {
                    setPasswordConfirmation(text);
                    clearError('passwordConfirmation');
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  leftIcon="lock"
                  error={errors.passwordConfirmation || undefined}
                />
              </>
            )}

            {step.key === 'pessoais' && role !== 'school' && (
              <>
                <TextField
                  label="Nome completo"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    clearError('name');
                  }}
                  placeholder="Nome e sobrenome"
                  autoCapitalize="words"
                  autoComplete="name"
                  error={errors.name || undefined}
                />
                <TextField
                  label="CPF"
                  value={cpf}
                  onChangeText={(text) => {
                    setCpf(maskCPF(text));
                    clearError('cpf');
                  }}
                  placeholder="000.000.000-00"
                  keyboardType="number-pad"
                  maxLength={14}
                  error={errors.cpf || undefined}
                />
                <TextField
                  label="Data de nascimento"
                  value={birthDate}
                  onChangeText={(text) => {
                    setBirthDate(maskDate(text));
                    clearError('birthDate');
                  }}
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                  maxLength={10}
                  hint="É preciso ter 18 anos ou mais."
                  error={errors.birthDate || undefined}
                />
                <TextField
                  label="Celular"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(maskPhone(text));
                    clearError('phone');
                  }}
                  placeholder="(00) 00000-0000"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={15}
                  leftIcon="phone"
                  error={errors.phone || undefined}
                />
              </>
            )}

            {step.key === 'pessoais' && role === 'school' && (
              <>
                <TextField
                  label="Nome da escola"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    clearError('name');
                  }}
                  error={errors.name || undefined}
                />
                <TextField
                  label="CNPJ"
                  value={cnpj}
                  onChangeText={(text) => {
                    setCnpj(maskCNPJ(text));
                    clearError('cnpj');
                  }}
                  placeholder="00.000.000/0000-00"
                  keyboardType="number-pad"
                  maxLength={18}
                  error={errors.cnpj || undefined}
                />
                <TextField
                  label="Administrador responsável"
                  value={admResponsavel}
                  onChangeText={(text) => {
                    setAdmResponsavel(text);
                    clearError('admResponsavel');
                  }}
                  autoCapitalize="words"
                  error={errors.admResponsavel || undefined}
                />
                <TextField
                  label="Telefone"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(maskPhone(text));
                    clearError('phone');
                  }}
                  placeholder="(00) 0000-0000"
                  keyboardType="phone-pad"
                  maxLength={15}
                  leftIcon="phone"
                  error={errors.phone || undefined}
                />
              </>
            )}

            {step.key === 'endereco' && (
              <>
                <AddressForm
                  value={address}
                  onChange={(value) => {
                    setAddress(value);
                    if (hasErrors(addressErrors)) setAddressErrors({});
                  }}
                  errors={addressErrors}
                  editable={!loading}
                />
                {isLastStep && termsCheckbox}
              </>
            )}

            {step.key === 'documentos' && (
              <>
                <TextField
                  label="Número da CNH"
                  value={cnh}
                  onChangeText={(text) => {
                    setCnh(maskCNH(text));
                    clearError('cnh');
                  }}
                  placeholder="11 dígitos"
                  keyboardType="number-pad"
                  maxLength={11}
                  leftIcon="credit-card"
                  hint="Os documentos (CNH, vistoria e licenciamento) são revisados depois, pelo administrador."
                  error={errors.cnh || undefined}
                />
                {termsCheckbox}
              </>
            )}

            <View style={styles.actions}>
              <Button
                label={isLastStep ? 'Criar conta' : 'Continuar'}
                icon={isLastStep ? 'check' : 'arrow-right'}
                iconPosition="right"
                onPress={handleNext}
                loading={loading}
                fullWidth
              />
              {stepIndex > 0 && (
                <Button label="Voltar" variant="tertiary" onPress={handleBack} disabled={loading} fullWidth />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: layout.screenMargin, paddingTop: 48, paddingBottom: spacing.xxl },
  wrapper: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xl },
  header: { marginBottom: 0 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  label: { ...typography.captionBold, color: colors.slate700 },
  actions: { gap: layout.buttonGap, marginTop: spacing.sm },
});
