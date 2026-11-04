import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { authService } from '../services/authService';
import { useAppContext } from '../context/AppContext';
import { Button, Card, ScreenHeader, TextField } from '../components/ui';
import { StepIndicator } from '../components/forms';
import { getApiErrorMessage } from '../utils/apiError';
import { maxFontSizeMultiplier } from '../theme';
import { RECOVERY_STEPS, recoveryStyles as styles } from './ForgotPasswordScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordCode'>;

/** O backend aceita novo pedido somente após 60 s. */
const RESEND_SECONDS = 60;

/**
 * Aceita o código/token puro ou o link inteiro do e-mail (…?token=XYZ).
 * O backend não tem endpoint de validação isolado: o token é conferido ao redefinir a senha.
 */
export const extractResetToken = (input: string) => {
  const value = input.trim();
  const match = /[?&]token=([^&#\s]+)/.exec(value);
  return match ? decodeURIComponent(match[1]) : value;
};

/** Recuperação de senha — etapa 2: código recebido por e-mail, com reenvio temporizado. */
export default function ForgotPasswordCodeScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { showToast } = useAppContext();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(email ? RESEND_SECONDS : 0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleContinue = () => {
    const token = extractResetToken(code);
    if (!token) {
      setError('Cole o código ou o link recebido por e-mail.');
      return;
    }
    if (token.length < 6) {
      setError('Código incompleto. Confira o e-mail recebido.');
      return;
    }
    navigation.navigate('ResetPassword', { token });
  };

  const handleResend = async () => {
    if (!email) {
      navigation.navigate('ForgotPassword');
      return;
    }
    setResending(true);
    try {
      const message = await authService.solicitarRedefinicaoSenha(email);
      showToast(message, 'info');
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível reenviar agora. Tente novamente em instantes.'), 'error');
    } finally {
      setResending(false);
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          <ScreenHeader title="Verifique seu e-mail" onBack={() => navigation.goBack()} style={styles.header} />
          <StepIndicator steps={RECOVERY_STEPS} current={1} />

          <View style={styles.card}>
            <Text style={styles.text} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {email
                ? `Se houver uma conta para ${email}, você receberá um e-mail com o link de redefinição.`
                : 'Use o código ou o link do e-mail de redefinição de senha.'}{' '}
              Ele vale por 15 minutos e só pode ser usado uma vez.
            </Text>

            <Card variant="muted">
              <Text style={styles.text} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Abriu o link no próprio celular? A tela de nova senha já abre sozinha. Se não, copie o código
                (ou o link inteiro) do e-mail e cole abaixo.
              </Text>
            </Card>

            <TextField
              label="Código de verificação"
              value={code}
              onChangeText={(text) => {
                setCode(text);
                if (error) setError(null);
              }}
              placeholder="Cole o código ou o link"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              leftIcon="key"
              onSubmitEditing={handleContinue}
              error={error || undefined}
            />

            <Button label="Continuar" icon="arrow-right" iconPosition="right" onPress={handleContinue} fullWidth />
            <Button
              label={seconds > 0 ? `Reenviar e-mail em ${mm}:${ss}` : 'Reenviar e-mail'}
              icon="refresh-cw"
              variant="secondary"
              onPress={handleResend}
              disabled={seconds > 0}
              loading={resending}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
