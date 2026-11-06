import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import SchoolLayout from '../components/SchoolLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { motoristaService } from '../services/motoristaService';
import { responsavelService } from '../services/responsavelService';
import { escolaService } from '../services/escolaService';
import { authService } from '../services/authService';
import PasswordConfirmationModal from '../components/PasswordConfirmationModal';
import { Button, Card, Chip, ListRow, StateView, TextField } from '../components/ui';
import {
  AddressForm,
  AddressErrors,
  AddressValue,
  EMPTY_ADDRESS,
  PasswordStrength,
  TermsModal,
  formatAddress,
  fromEnderecoOperacional,
  hasErrors,
  toEnderecoOperacional,
  validateAddress,
} from '../components/forms';
import { isoToBrDate, maskCNPJ, maskCPF, maskPhone } from '../utils/masks';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validatePhone,
  validateRequired,
} from '../utils/validators';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { EnderecoOperacionalDTO } from '../types';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverProfile' | 'GuardianProfile' | 'SchoolProfile'>;

type Section = 'pessoais' | 'contato' | 'endereco' | 'senha';

const ROLE_LABEL = { MOTORISTA: 'Motorista', RESPONSAVEL: 'Responsável', ESCOLA: 'Escola' } as const;

type MoreOption = { route: string; title: string; caption: string; icon: React.ComponentProps<typeof Feather>['name'] };

/** Telas que saíram do menu lateral e não são abas. */
const MORE_OPTIONS: Record<'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA', MoreOption[]> = {
  MOTORISTA: [
    { route: 'DriverVehicle', title: 'Meu veículo', caption: 'Modelo, placa e capacidade', icon: 'truck' },
    { route: 'NotificationList', title: 'Notificações', caption: 'Avisos recebidos e enviados', icon: 'bell' },
    { route: 'DriverHelp', title: 'Ajuda', caption: 'Dúvidas sobre o aplicativo', icon: 'help-circle' },
  ],
  RESPONSAVEL: [
    { route: 'GuardianHistory', title: 'Histórico de viagens', caption: 'Embarques e desembarques', icon: 'clock' },
    { route: 'NotificationList', title: 'Notificações', caption: 'Avisos recebidos e enviados', icon: 'bell' },
    { route: 'GuardianPlans', title: 'Planos', caption: 'Em breve', icon: 'credit-card' },
    { route: 'GuardianHelp', title: 'Ajuda', caption: 'Dúvidas sobre o aplicativo', icon: 'help-circle' },
  ],
  ESCOLA: [],
};

export default function ProfileScreen({ navigation }: Props) {
  const { currentUser, userRole, setCurrentUser, showToast } = useAppContext();
  const profile = currentUser as any;
  const user = profile?.usuarioDTO || profile?.usuario;
  const hasStructuredAddress = userRole === 'MOTORISTA' || userRole === 'ESCOLA';
  const enderecoOperacional: EnderecoOperacionalDTO | null | undefined = profile?.enderecoOperacionalDTO;

  const [refreshing, setRefreshing] = useState(true);
  const [editing, setEditing] = useState<Section | null>(null);
  const [termsVisible, setTermsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Campos editáveis
  const [nome, setNome] = useState('');
  const [admResponsavel, setAdmResponsavel] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

  // Troca de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');

  const resetFields = useCallback(() => {
    setNome(profile?.nome || '');
    setAdmResponsavel(profile?.admResponsavel || '');
    setEmail(user?.email || '');
    setTelefone(maskPhone(user?.telefone || ''));
    setAddress(fromEnderecoOperacional(enderecoOperacional));
    setErrors({});
    setAddressErrors({});
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmacao('');
  }, [profile, user, enderecoOperacional]);

  // Recarrega o perfil do servidor (GET /{Perfil}/Perfil) para exibir dados atualizados.
  useEffect(() => {
    let active = true;
    if (!userRole) {
      setRefreshing(false);
      return;
    }
    authService
      .carregarPerfil(userRole)
      .then(({ user: fresh, role }) => {
        if (active) setCurrentUser(fresh, role);
      })
      .catch((error) => {
        if (active) console.warn('[ProfileScreen] Não foi possível atualizar o perfil:', error);
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editing) resetFields();
  }, [currentUser, editing, resetFields]);

  // Revoga a sessão no backend (sem bloquear a saída se a rede falhar) e volta ao login.
  const handleLogout = async () => {
    await authService.sair();
    setCurrentUser(null, null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const startEditing = (section: Section) => {
    resetFields();
    setEditing(section);
  };

  const cancelEditing = () => {
    setEditing(null);
    resetFields();
  };

  const validateSection = (): boolean => {
    if (editing === 'pessoais') {
      const e = {
        nome: validateRequired(nome, userRole === 'ESCOLA' ? 'o nome da escola' : 'o nome'),
        admResponsavel: userRole === 'ESCOLA' ? validateRequired(admResponsavel, 'o administrador responsável') : null,
      };
      setErrors(e);
      return !hasErrors(e);
    }
    if (editing === 'contato') {
      const e = { email: validateEmail(email), telefone: validatePhone(telefone) };
      setErrors(e);
      return !hasErrors(e);
    }
    if (editing === 'endereco') {
      const e = validateAddress(address);
      setAddressErrors(e);
      return !hasErrors(e);
    }
    return true;
  };

  // Todas as alterações cadastrais exigem a senha atual (regra do backend em AlterarInfos).
  const handlePreSave = () => {
    if (validateSection()) setShowPasswordModal(true);
  };

  const handleSave = async (password: string) => {
    setLoading(true);
    const addressChanged = editing === 'endereco';
    const usuario = {
      ...user,
      email: email.trim(),
      telefone: maskPhone(telefone),
      endereco: addressChanged ? formatAddress(address) : user?.endereco,
      senha: password,
    };
    // Omitir enderecoOperacionalDTO preserva o endereço estruturado já salvo.
    const structured = addressChanged ? { enderecoOperacionalDTO: toEnderecoOperacional(address) } : {};

    try {
      let result;
      if (userRole === 'MOTORISTA') {
        result = await motoristaService.alterarInfos({ ...profile, nome: nome.trim(), usuarioDTO: usuario, ...structured });
      } else if (userRole === 'RESPONSAVEL') {
        result = await responsavelService.alterarInfos({ ...profile, nome: nome.trim(), usuario });
      } else if (userRole === 'ESCOLA') {
        result = await escolaService.alterarInfos({
          ...profile,
          nome: nome.trim(),
          admResponsavel: admResponsavel.trim(),
          usuarioDTO: usuario,
          ...structured,
        });
      }

      if (result) {
        setCurrentUser(result, userRole);
        setShowPasswordModal(false);
        setEditing(null);
        const emailChanged = (user?.email || '') !== email.trim();
        showToast(
          emailChanged ? 'Dados atualizados. Use o novo e-mail no próximo acesso.' : 'Informações atualizadas com sucesso!',
          'success',
        );
      }
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      showToast(
        getApiStatus(error) === 401
          ? 'Senha incorreta. Nenhuma alteração foi salva.'
          : getApiErrorMessage(error, 'Falha ao atualizar cadastro.'),
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const e = {
      senhaAtual: senhaAtual ? null : 'Informe a senha atual.',
      novaSenha: validatePassword(novaSenha),
      confirmacao: validatePasswordConfirmation(novaSenha, confirmacao),
    };
    setErrors(e);
    if (hasErrors(e)) return;

    setLoading(true);
    try {
      await authService.alterarSenha(senhaAtual, novaSenha);
      // O backend revoga todas as sessões após a troca: é preciso entrar novamente.
      await authService.sair();
      setCurrentUser(null, null);
      showToast('Senha alterada! Entre novamente com a nova senha.', 'success');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      showToast(
        getApiStatus(error) === 401
          ? 'Senha atual incorreta.'
          : getApiErrorMessage(error, 'Não foi possível alterar a senha.'),
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const SectionHeader = ({ title, icon, section }: { title: string; icon: React.ComponentProps<typeof Feather>['name']; section: Section }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.iconSlot}>
          <Feather name={icon} size={20} color={colors.ink} />
        </View>
        <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {title}
        </Text>
      </View>
      {editing !== section && (
        <Button
          label="Editar"
          icon="edit-2"
          variant="tertiary"
          size="md"
          accessibilityLabel={`Editar ${title}`}
          onPress={() => startEditing(section)}
          disabled={!!editing || loading}
        />
      )}
    </View>
  );

  const ReadOnlyRow = ({ label, value, locked }: { label: string; value?: string | null; locked?: boolean }) => (
    <View style={styles.readRow}>
      <Text style={styles.readLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>{label}</Text>
      <View style={styles.readValueRow}>
        <Text style={[styles.readValue, !value && styles.readEmpty]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {value || 'Não informado'}
        </Text>
        {locked && <Feather name="lock" size={14} color={colors.slate500} accessibilityLabel="Somente leitura" />}
      </View>
    </View>
  );

  const SectionActions = ({ onSave, saveLabel = 'Salvar' }: { onSave: () => void; saveLabel?: string }) => (
    <View style={styles.sectionActions}>
      <Button label={saveLabel} icon="check" onPress={onSave} loading={loading} fullWidth />
      <Button label="Cancelar" variant="tertiary" onPress={cancelEditing} disabled={loading} fullWidth />
    </View>
  );

  const addressStatus = enderecoOperacional?.statusValidacao;

  const content = refreshing && !currentUser ? (
    <StateView kind="loading" title="Carregando perfil..." style={styles.loadingState} />
  ) : (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Feather name={userRole === 'ESCOLA' ? 'book' : 'user'} size={36} color={colors.ink} />
          </View>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {profile?.nome || 'Meu Cadastro'}
          </Text>
          {userRole && <Chip label={ROLE_LABEL[userRole]} tone="info" />}
        </View>

        {/* Dados pessoais / da instituição */}
        <Card style={styles.section}>
          <SectionHeader title={userRole === 'ESCOLA' ? 'Dados da instituição' : 'Dados pessoais'} icon="user" section="pessoais" />
          {editing === 'pessoais' ? (
            <>
              <TextField
                label={userRole === 'ESCOLA' ? 'Nome da escola' : 'Nome completo'}
                value={nome}
                onChangeText={(text) => {
                  setNome(text);
                  clearError('nome');
                }}
                autoCapitalize="words"
                error={errors.nome || undefined}
              />
              {userRole === 'ESCOLA' && (
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
              )}
              <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {userRole === 'ESCOLA'
                  ? 'O CNPJ não pode ser alterado pelo app.'
                  : 'CPF e data de nascimento não podem ser alterados pelo app.'}
              </Text>
              <SectionActions onSave={handlePreSave} />
            </>
          ) : (
            <>
              <ReadOnlyRow label={userRole === 'ESCOLA' ? 'Nome da escola' : 'Nome completo'} value={profile?.nome} />
              {userRole === 'ESCOLA' ? (
                <>
                  <ReadOnlyRow label="CNPJ" value={profile?.cnpj ? maskCNPJ(profile.cnpj) : null} locked />
                  <ReadOnlyRow label="Administrador responsável" value={profile?.admResponsavel} />
                </>
              ) : (
                <>
                  <ReadOnlyRow label="CPF" value={profile?.cpf ? maskCPF(profile.cpf) : null} locked />
                  <ReadOnlyRow label="Data de nascimento" value={isoToBrDate(profile?.dataNascimento)} locked />
                </>
              )}
            </>
          )}
        </Card>

        {/* Contato */}
        <Card style={styles.section}>
          <SectionHeader title="Contato" icon="phone" section="contato" />
          {editing === 'contato' ? (
            <>
              <TextField
                label="E-mail"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail"
                hint="Trocar o e-mail muda o login da conta. Confirmamos com sua senha atual."
                error={errors.email || undefined}
              />
              <TextField
                label="Telefone / WhatsApp"
                value={telefone}
                onChangeText={(text) => {
                  setTelefone(maskPhone(text));
                  clearError('telefone');
                }}
                keyboardType="phone-pad"
                maxLength={15}
                leftIcon="phone"
                placeholder="(00) 00000-0000"
                error={errors.telefone || undefined}
              />
              <SectionActions onSave={handlePreSave} />
            </>
          ) : (
            <>
              <ReadOnlyRow label="E-mail" value={user?.email} />
              <ReadOnlyRow label="Telefone" value={user?.telefone ? maskPhone(user.telefone) : null} />
            </>
          )}
        </Card>

        {/* Endereço */}
        <Card style={styles.section}>
          <SectionHeader title="Endereço" icon="map-pin" section="endereco" />
          {editing === 'endereco' ? (
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
              <SectionActions onSave={handlePreSave} />
            </>
          ) : (
            <>
              <ReadOnlyRow
                label="Endereço"
                value={enderecoOperacional ? formatAddress(fromEnderecoOperacional(enderecoOperacional)) : user?.endereco}
              />
              {hasStructuredAddress && addressStatus && (
                <Chip
                  label={addressStatus === 'VALIDADO' ? 'CEP validado' : 'Validação do CEP pendente'}
                  tone={addressStatus === 'VALIDADO' ? 'success' : 'warning'}
                  icon={addressStatus === 'VALIDADO' ? 'check-circle' : 'clock'}
                  size="sm"
                />
              )}
              {hasStructuredAddress && !enderecoOperacional && (
                <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Complete o endereço com CEP: ele é necessário para iniciar viagens.
                </Text>
              )}
            </>
          )}
        </Card>

        {/* Segurança */}
        <Card style={styles.section}>
          <SectionHeader title="Segurança" icon="lock" section="senha" />
          {editing === 'senha' ? (
            <>
              <TextField
                label="Senha atual"
                value={senhaAtual}
                onChangeText={(text) => {
                  setSenhaAtual(text);
                  clearError('senhaAtual');
                }}
                secureTextEntry
                autoComplete="password"
                leftIcon="lock"
                error={errors.senhaAtual || undefined}
              />
              <TextField
                label="Nova senha"
                value={novaSenha}
                onChangeText={(text) => {
                  setNovaSenha(text);
                  clearError('novaSenha');
                }}
                secureTextEntry
                autoComplete="new-password"
                leftIcon="lock"
                error={errors.novaSenha || undefined}
              />
              <PasswordStrength value={novaSenha} />
              <TextField
                label="Confirmar nova senha"
                value={confirmacao}
                onChangeText={(text) => {
                  setConfirmacao(text);
                  clearError('confirmacao');
                }}
                secureTextEntry
                autoComplete="new-password"
                leftIcon="lock"
                error={errors.confirmacao || undefined}
              />
              <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Por segurança, você sairá da conta em todos os aparelhos e entrará novamente com a nova senha.
              </Text>
              <SectionActions onSave={handleChangePassword} saveLabel="Alterar senha" />
            </>
          ) : (
            <ReadOnlyRow label="Senha" value="••••••••••••" />
          )}
        </Card>

        {/* Mais opções: telas que não são abas da barra inferior */}
        <Card style={styles.moreCard}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Mais opções
          </Text>
          {MORE_OPTIONS[userRole ?? 'RESPONSAVEL'].map((item, index) => (
            <ListRow
              key={item.route}
              icon={item.icon}
              title={item.title}
              caption={item.caption}
              divider={index > 0}
              onPress={() => navigation.navigate(item.route as any)}
            />
          ))}
          <ListRow
            icon="file-text"
            title="Termos e privacidade"
            caption="Termos de Uso, Política de Privacidade e PDF"
            divider
            onPress={() => setTermsVisible(true)}
          />
          <ListRow icon="log-out" title="Sair da conta" tone="danger" divider onPress={handleLogout} />
        </Card>
      </ScrollView>

      <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />

      <PasswordConfirmationModal
        visible={showPasswordModal}
        onConfirm={handleSave}
        onCancel={() => setShowPasswordModal(false)}
        loading={loading}
      />
    </KeyboardAvoidingView>
  );

  if (userRole === 'MOTORISTA') return <DriverLayout>{content}</DriverLayout>;
  if (userRole === 'ESCOLA') return <SchoolLayout>{content}</SchoolLayout>;
  return <GuardianLayout>{content}</GuardianLayout>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { flex: 1 },
  container: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  avatarCircle: { width: 80, height: 80, borderRadius: radius.pill, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center' },
  title: { ...typography.title, color: colors.ink, textAlign: 'center' },
  section: { gap: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  iconSlot: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  readRow: { gap: spacing.xs, paddingBottom: spacing.sm, borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  readLabel: { ...typography.caption, color: colors.slate500 },
  readValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  readValue: { ...typography.bodyLg, color: colors.ink, flexShrink: 1 },
  readEmpty: { color: colors.slate500 },
  hint: { ...typography.caption, color: colors.slate500 },
  sectionActions: { gap: layout.buttonGap },
  moreCard: { gap: spacing.xs },
});
