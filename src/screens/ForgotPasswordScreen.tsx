import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { authService } from '../services/authService';
import { useAppContext } from '../context/AppContext';
import { Button, ScreenHeader, TextField } from '../components/ui';
import { StepIndicator } from '../components/forms';
import { validateEmail } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export const RECOVERY_STEPS = ['Solicitar redefinição', 'Validar código', 'Nova senha'];

/** Recuperação de senha — etapa 1: e-mail cadastrado. */
export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const { showToast } = useAppContext();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const validation = validateEmail(email);
    setError(validation);
    if (validation) return;

    setLoading(true);
    try {
      const message = await authService.solicitarRedefinicaoSenha(email.trim());
      showToast(message, 'info');
      navigation.navigate('ForgotPasswordCode', { email: email.trim() });
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível solicitar a redefinição. Tente novamente.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          <ScreenHeader title="Esqueci minha senha" onBack={() => navigation.goBack()} style={styles.header} />
          <StepIndicator steps={RECOVERY_STEPS} current={0} />

          <View style={styles.card}>
            <Text style={styles.text} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Informe o e-mail da sua conta. Vamos enviar um link com o código para você criar uma nova senha.
            </Text>
            <TextField
              label="E-mail cadastrado"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              placeholder="nome@dominio.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              leftIcon="mail"
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              error={error || undefined}
              editable={!loading}
            />
            <Button label="Enviar instruções" icon="send" iconPosition="right" onPress={handleSubmit} loading={loading} fullWidth />
            <Button
              label="Já tenho um código"
              variant="tertiary"
              onPress={() => navigation.navigate('ForgotPasswordCode', { email: email.trim() })}
              disabled={loading}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const recoveryStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: layout.screenMargin, paddingTop: 48, paddingBottom: spacing.xxl },
  wrapper: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xl },
  header: { marginBottom: 0 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.lg },
  text: { ...typography.body, color: colors.slate700 },
});

const styles = recoveryStyles;
