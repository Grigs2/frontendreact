import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import TripMap from '../components/TripMap';
import { ScreenHeader } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { maxFontSizeMultiplier, spacing, typography, colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverMap'>;

/** M6 — mapa básico em tela cheia. Mapa em stand-by: sem posição nem paradas com coordenadas por enquanto. */
export default function DriverMapScreen({ navigation }: Props) {
  return (
    <DriverLayout>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Mapa" subtitle="Visualização básica da rota" onBack={() => navigation.goBack()} />
        <TripMap altura={560} posicao={null} mensagem="Mapa em revisão: a posição e as paradas serão exibidas aqui." />
        <Text style={styles.nota} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          Este mapa é um placeholder para validar o layout das telas. A integração com GPS e paradas fica para a próxima etapa.
        </Text>
      </ScrollView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  nota: { ...typography.caption, color: colors.slate500 },
});
