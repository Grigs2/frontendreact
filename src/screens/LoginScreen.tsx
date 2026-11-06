import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Logo from '../components/Logo';
import { useAppContext } from '../context/AppContext';
import { authService, PerfilNaoSuportadoError, SessaoCarregada } from '../services/authService';
import { HOME_BY_ROLE } from '../navigation';
import { Button, StateView, TextField } from '../components/ui';
import { TermsModal } from '../components/forms';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { validateEmail } from '../utils/validators';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

/** Token de redefinição recebido pelo link do e-mail (PASSWORD_RESET_URL?token=...), apenas no web. */
const readResetTokenFromUrl = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('token');
  } catch {
    return null;
  }
};

export default function LoginScreen({ onLogin }: any) {
  const navigation = useNavigation<any>();
  const { setCurrentUser, showToast } = useAppContext();
  const [termsVisible, setTermsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});

  const enterApp = ({ user, role }: SessaoCarregada) => {
    setCurrentUser(user, role);
    onLogin?.(role);
    navigation.reset({ index: 0, routes: [{ name: HOME_BY_ROLE[role] }] });
  };

  // Ao abrir: link de redefinição de senha (web) ou sessão salva (refresh token).
  useEffect(() => {
    const token = readResetTokenFromUrl();
    if (token) {
      setRestoring(false);
      if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname);
      navigation.navigate('ResetPassword', { token });
      return;
    }
    let active = true;
    authService
      .restaurarSessao()
      .then((session) => {
        if (active && session) enterApp(session);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    const nextErrors = {
      email: validateEmail(email),
      password: password ? null : 'Informe a senha.',
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      const session = await authService.entrar(email.trim(), password);
      enterApp(session);
    } catch (error: any) {
      if (error instanceof PerfilNaoSuportadoError) {
        showToast(error.message, 'error');
      } else if (getApiStatus(error) === 401) {
        showToast('E-mail ou senha inválidos.', 'error');
      } else {
        showToast(getApiErrorMessage(error, 'Não foi possível entrar. Tente novamente.'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (restoring) {
    return (
      <View style={styles.screen}>
        <StateView kind="loading" title="Carregando..." style={styles.restoring} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          <View style={styles.brandContainer}>
            <Logo size="large" showText={false} />
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Tio da Perua
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Entre para acompanhar o transporte escolar
            </Text>
          </View>

          <View style={styles.card}>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((e) => ({ ...e, email: null }));
              }}
              placeholder="nome@dominio.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              leftIcon="mail"
              editable={!loading}
              error={errors.email || undefined}
            />

            <TextField
              label="Senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: null }));
              }}
              placeholder="Sua senha"
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              leftIcon="lock"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              rightIconLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
              editable={!loading}
              error={errors.password || undefined}
            />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Esqueci minha senha"
              onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() || undefined })}
              disabled={loading}
              style={styles.forgot}
              hitSlop={8}
            >
              <Text style={styles.forgotText} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Esqueci minha senha
              </Text>
            </Pressable>

            <View style={styles.actions}>
              <Button label="Entrar" onPress={handleLogin} loading={loading} fullWidth />
              <Button
                label="Criar conta"
                variant="secondary"
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
                fullWidth
              />
            </View>

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Ler os Termos de Uso e a Política de Privacidade"
              onPress={() => setTermsVisible(true)}
              style={styles.termsLink}
              hitSlop={8}
            >
              <Text style={styles.termsLinkText} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Termos de Uso e Política de Privacidade
              </Text>
            </Pressable>
            <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  restoring: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: layout.screenMargin },
  wrapper: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandContainer: { alignItems: 'center', marginBottom: spacing.xxl, gap: spacing.sm },
  title: { ...typography.display, color: colors.ink },
  subtitle: { ...typography.body, color: colors.slate500, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  termsLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: spacing.sm },
  termsLinkText: { ...typography.caption, color: colors.slate700, textDecorationLine: 'underline' },
  forgot: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center', marginTop: -spacing.sm },
  forgotText: { ...typography.label, color: colors.ink, textDecorationLine: 'underline' },
  actions: { gap: layout.buttonGap },
});
