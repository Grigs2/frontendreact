import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import DriverLayout from '../components/DriverLayout';
import GuardianLayout from '../components/GuardianLayout';
import { useAppContext } from '../context/AppContext';
import { ScreenHeader, StateView } from '../components/ui';
import { layout, spacing } from '../theme';

export default function HistoryScreen() {
  const { userRole, currentUser } = useAppContext();

  const isDriver = userRole === 'MOTORISTA';

  // Note: Detailed presence history is currently not stored in the global state AppContextType.
  // This screen would ideally fetch history from viagemService.historico or a dedicated presence endpoint.
  // For now, we'll show an empty state or placeholder message to satisfy compilation.

  const content = (
    <View style={styles.container}>
      <ScreenHeader title="Histórico de Viagens" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <StateView
          kind="empty"
          icon="calendar"
          title="Funcionalidade de histórico detalhado em implementação."
          message='Consulte o menu "Minhas Viagens" para ver rotas passadas.'
          style={styles.empty}
        />
      </ScrollView>
    </View>
  );

  if (isDriver) return <DriverLayout>{content}</DriverLayout>;
  return <GuardianLayout>{content}</GuardianLayout>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  scroll: { paddingBottom: spacing.xxl },
  empty: { marginTop: spacing.xxl },
});
