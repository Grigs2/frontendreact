import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { Button, Card, ShortcutCard } from '../components/ui';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

export default function DriverMainScreen() {
  const navigation = useNavigation<any>();
  const { currentUser } = useAppContext();

  return (
    <DriverLayout>
      <View style={styles.webWrapper}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.greeting} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Olá, {currentUser?.nome || 'Motorista'}!
            </Text>
            <Text style={styles.status} maxFontSizeMultiplier={maxFontSizeMultiplier}>Pronto para a rota de hoje?</Text>
          </View>

          {/* The Mandatory Entry Point */}
          <Card>
            <Text style={styles.actionTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Operação do dia</Text>
            <Text style={styles.actionSubtitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Escolher período e gerenciar alunos
            </Text>
            <Button
              label="Iniciar Operação"
              icon="play"
              onPress={() => navigation.navigate('DriverTrips')}
              fullWidth
            />
          </Card>

          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Acesso Rápido
          </Text>
          <View style={styles.grid}>
            <ShortcutCard label="Histórico" icon="clock" onPress={() => navigation.navigate('DriverHistory')} />
            <ShortcutCard label="Meu Veículo" icon="truck" onPress={() => navigation.navigate('DriverVehicle')} />
            <ShortcutCard label="Notificações" icon="bell" onPress={() => navigation.navigate('NotificationList')} />
            <ShortcutCard label="Meu Perfil" icon="user" onPress={() => navigation.navigate('DriverProfile')} />
          </View>
        </ScrollView>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  container: {
    padding: layout.screenMargin,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: 800,
  },
  hero: { marginTop: spacing.sm, marginBottom: spacing.xl, gap: spacing.xs },
  greeting: { ...typography.display, color: colors.ink },
  status: { ...typography.bodyLg, color: colors.slate500 },
  actionTitle: { ...typography.heading, color: colors.ink },
  actionSubtitle: { ...typography.body, color: colors.slate500 },
  sectionTitle: { ...typography.heading, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.gridGap },
});
