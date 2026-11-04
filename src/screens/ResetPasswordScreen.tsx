import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { authService } from '../services/authService';
import { useAppContext } from '../context/AppContext';
import { Button, ScreenHeader, TextField } from '../components/ui';
import { PasswordStrength, StepIndicator } from '../components/forms';
import { validatePassword, validatePasswordConfirmation } from '../utils/validators';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { maxFontSizeMultiplier } from '../theme';
import { RECOVERY_STEPS, recoveryStyles as styles } from './ForgotPasswordScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

/** Recuperação de senha — etapa 3: nova senha. Também é a tela aberta pelo link do e-mail (web). */
export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const { showToast } = useAppContext();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string | null; confirmation?: string | null }>({});
  const [loading, setLoading] = useState(false);
  const [tokenRejected, setTokenRejected] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {
      password: validatePassword(password),
      confirmation: validatePasswordConfirmation(password, confirmation),
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirmation) return;

    setLoading(true);
    try {
      await authService.redefinirSenha(token, password);
      showToast('Senha redefinida! Entre com a nova senha.', 'success');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      const status = getApiStatus(err);
      if (status === 401 || status === 404) {
        // Token ausente, inválido, expirado ou já usado.
        setTokenRejected(true);
        showToast('Código inválido ou expirado. Solicite um novo.', 'error');
      } else {
        showToast(getApiErrorMessage(err, 'Não foi possível redefinir a senha.'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          <ScreenHeader
            title="Criar nova senha"
            onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'))}
            style={styles.header}
          />
          <StepIndicator steps={RECOVERY_STEPS} current={2} />

          <View style={styles.card}>
            {tokenRejected ? (
              <>
                <Text style={styles.text} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Este código não é mais válido. Os códigos expiram em 15 minutos e só podem ser usados uma vez.
                </Text>
                <Button
                  label="Solicitar novo código"
                  icon="refresh-cw"
                  onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'ForgotPassword' }] })}
                  fullWidth
                />
              </>
            ) : (
              <>
                <TextField
                  label="Nova senha"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((e) => ({ ...e, password: null }));
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  leftIcon="lock"
                  rightIcon={showPassword ? 'eye-off' : 'eye'}
                  rightIconLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  error={errors.password || undefined}
                  editable={!loading}
                />
                <PasswordStrength value={password} />
                <TextField
                  label="Confirmar nova senha"
                  value={confirmation}
                  onChangeText={(text) => {
                    setConfirmation(text);
                    if (errors.confirmation) setErrors((e) => ({ ...e, confirmation: null }));
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  leftIcon="lock"
                  onSubmitEditing={handleSubmit}
                  error={errors.confirmation || undefined}
                  editable={!loading}
                />
                <Button label="Redefinir senha" icon="check" iconPosition="right" onPress={handleSubmit} loading={loading} fullWidth />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
