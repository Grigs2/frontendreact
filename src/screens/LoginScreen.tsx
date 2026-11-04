import React, { useState } from 'react';
import {
  View, Text, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Logo from '../components/Logo';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/authService';
import { Button, TextField } from '../components/ui';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

export default function LoginScreen({ onLogin }: any) {
  const navigation = useNavigation<any>();
  const { setCurrentUser, showToast } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'driver' | 'guardian' | 'school'>('driver');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('[LoginScreen] Botão pressionado');
    if (!email.trim() || !password.trim()) {
      showToast('Preencha e-mail e senha.', 'warning');
      return;
    }

    setLoading(true);
    console.log('[LoginScreen] Submit iniciado para:', email, 'Perfil:', selectedRole);

    try {
      let userData: any = null;
      let roleKey: 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA' = 'MOTORISTA';

      console.log('[LoginScreen] Chamando authService...');
      if (selectedRole === 'driver') {
        userData = await authService.loginMotorista(email.trim(), password.trim());
        roleKey = 'MOTORISTA';
      } else if (selectedRole === 'guardian') {
        userData = await authService.loginResponsavel(email.trim(), password.trim());
        roleKey = 'RESPONSAVEL';
      } else if (selectedRole === 'school') {
        userData = await authService.loginEscola(email.trim(), password.trim());
        roleKey = 'ESCOLA';
      }

      if (userData) {
        console.log('[LoginScreen] Login bem-sucedido:', userData);
        setCurrentUser(userData, roleKey);
        onLogin(selectedRole);

        const routeMap: any = {
          driver: 'DriverMain',
          guardian: 'GuardianMain',
          school: 'SchoolMain',
        };
        console.log('[LoginScreen] Navegando para:', routeMap[selectedRole]);
        navigation.navigate(routeMap[selectedRole]);
      } else {
        console.warn('[LoginScreen] Sem dados de usuário retornados');
        showToast('Credenciais inválidas ou erro no servidor.', 'error');
      }
    } catch (error: any) {
      console.error('[LoginScreen] Erro no login:', error);
      showToast(error.response?.data?.mensagem || 'Falha na conexão com o servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>Entrar como</Text>
            <View style={styles.segmentedControl} accessibilityRole="tablist">
              {['driver', 'guardian', 'school'].map((role) => {
                const label = role === 'driver' ? 'Motorista' : role === 'guardian' ? 'Responsável' : 'Escola';
                const active = selectedRole === role;
                return (
                  <Pressable
                    key={role}
                    accessibilityRole="tab"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.segmentButton,
                      active && styles.segmentButtonActive,
                      pressed && !active && styles.segmentButtonPressed,
                    ]}
                    onPress={() => setSelectedRole(role as any)}
                  >
                    <Text
                      style={[styles.segmentText, active && styles.segmentTextActive]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="ex: teste@teste.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              editable={!loading}
            />

            <TextField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              secureTextEntry={!showPassword}
              leftIcon="lock"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              rightIconLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              editable={!loading}
            />

            <View style={styles.actions}>
              <Button label="Entrar" onPress={handleLogin} loading={loading} fullWidth />
              <Button
                label="Cadastrar"
                variant="secondary"
                onPress={() => navigation.navigate('Register', { role: selectedRole })}
                disabled={loading}
                fullWidth
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
  fieldLabel: { ...typography.captionBold, color: colors.slate700, marginBottom: -spacing.sm },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.button,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segmentButton: {
    flex: 1,
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: { backgroundColor: colors.primary },
  segmentButtonPressed: { backgroundColor: colors.pressedNeutral },
  segmentText: { ...typography.caption, color: colors.slate700 },
  segmentTextActive: { ...typography.captionBold, color: colors.onPrimary },
  actions: { gap: layout.buttonGap, marginTop: spacing.sm },
});
