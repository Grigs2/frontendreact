import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import SchoolLayout from '../components/SchoolLayout';
import { Card, Chip } from '../components/ui';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolMain'>;

export default function SchoolMainScreen({ navigation }: Props) {
  const { currentUser } = useAppContext();
  const school = currentUser as any;

  return (
    <SchoolLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.greeting} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Olá, {school?.nome || 'Escola'}!
          </Text>
          <Text style={styles.status} maxFontSizeMultiplier={maxFontSizeMultiplier}>Bem-vindo ao Painel da Escola</Text>
        </View>

        <Card variant="muted" style={styles.infoCard}>
          <Chip label="Em breve" tone="info" icon="info" />
          <Text style={styles.infoText} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            As funcionalidades para o perfil Escola estão sendo implementadas e estarão disponíveis em breve.
          </Text>
        </Card>

        <Card style={styles.details}>
          <Text style={styles.detailTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Dados da Instituição
          </Text>
          <View>
            <Text style={styles.detailLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>Administrador</Text>
            <Text style={styles.detailValue} maxFontSizeMultiplier={maxFontSizeMultiplier}>{school?.admResponsavel}</Text>
          </View>
          <View>
            <Text style={styles.detailLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>E-mail</Text>
            <Text style={styles.detailValue} maxFontSizeMultiplier={maxFontSizeMultiplier}>{school?.usuarioDTO?.email}</Text>
          </View>
          <View>
            <Text style={styles.detailLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>Endereço</Text>
            <Text style={styles.detailValue} maxFontSizeMultiplier={maxFontSizeMultiplier}>{school?.usuarioDTO?.endereco}</Text>
          </View>
        </Card>
      </ScrollView>
    </SchoolLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
  hero: { marginTop: spacing.sm, marginBottom: spacing.xl, gap: spacing.xs },
  greeting: { ...typography.display, color: colors.ink },
  status: { ...typography.bodyLg, color: colors.slate500 },
  infoCard: { gap: spacing.sm },
  infoText: { ...typography.body, color: colors.ink },
  details: { marginTop: spacing.xl },
  detailTitle: { ...typography.heading, color: colors.ink },
  detailLabel: { ...typography.caption, color: colors.slate500 },
  detailValue: { ...typography.bodyLg, color: colors.ink },
});
