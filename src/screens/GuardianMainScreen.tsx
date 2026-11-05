import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import GuardianLayout from '../components/GuardianLayout';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { ShortcutCard } from '../components/ui';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type GuardianScreenKey = 'GuardianTracking' | 'GuardianDependents' | 'GuardianPlans' | 'GuardianProfile' | 'GuardianInvites' | 'NotificationList';

const FEATURES: { key: GuardianScreenKey; label: string; icon: FeatherIconName }[] = [
  { key: 'GuardianTracking', label: 'Monitoramento', icon: 'navigation' },
  { key: 'GuardianInvites', label: 'Convites', icon: 'mail' },
  { key: 'GuardianDependents', label: 'Dependentes', icon: 'users' },
  { key: 'NotificationList', label: 'Notificações', icon: 'bell' },
  { key: 'GuardianPlans', label: 'Planos', icon: 'credit-card' },
  { key: 'GuardianProfile', label: 'Meu Cadastro', icon: 'user' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianMain'>;

export default function GuardianMainScreen({ navigation }: Props) {
  const { currentUser } = useAppContext();
  const handleFeaturePress = (key: GuardianScreenKey) => {
    navigation.navigate(key);
  };

  return (
      <GuardianLayout>
        <StatusBar barStyle="dark-content" />
        <View style={styles.webWrapper}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.gridContainer}>
            <View style={styles.hero}>
              <Text style={styles.greeting} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Olá, {currentUser?.nome || 'Responsável'}!
              </Text>
              <Text style={styles.status} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Acompanhe o transporte dos seus dependentes
              </Text>
            </View>
            <View style={styles.grid}>
              {FEATURES.map(({ key, label, icon }) => (
                <ShortcutCard key={key} label={label} icon={icon} onPress={() => handleFeaturePress(key)} />
              ))}
            </View>
          </ScrollView>
        </View>
      </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    width: '100%',
  },
  scroll: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  hero: { marginTop: spacing.sm, marginBottom: spacing.xl, gap: spacing.xs },
  greeting: { ...typography.display, color: colors.ink },
  status: { ...typography.bodyLg, color: colors.slate500 },
  gridContainer: {
    padding: layout.screenMargin,
    paddingBottom: spacing.xxl,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.gridGap,
  },
});
