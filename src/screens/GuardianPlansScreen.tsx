import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GuardianLayout from '../components/GuardianLayout';
import { ScreenHeader, StateView } from '../components/ui';
import { layout, spacing } from '../theme';

export default function GuardianPlansScreen() {
  const navigation = useNavigation();

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <ScreenHeader title="Planos" onBack={() => navigation.goBack()} />

        <StateView
          kind="empty"
          icon="credit-card"
          title="Em breve!"
          message="Funcionalidade ainda não implementada. Estamos trabalhando para trazer os melhores planos para você."
          actionLabel="Voltar"
          onAction={() => navigation.goBack()}
          style={styles.content}
        />
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  content: { flex: 1, paddingBottom: spacing.xxl * 2 },
});
