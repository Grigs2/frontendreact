import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Chip } from './ui';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';
import { formatTimeSeconds } from '../utils/format';
import type { TripMapProps } from './TripMap';

/** Versão web: react-native-maps não roda no navegador, então mostramos a posição e um link para o mapa. */
export default function TripMap({ posicao, ultimaAtualizacao, desatualizada, mensagem, altura = 220 }: TripMapProps) {
  const h = Math.min(altura, layout.topAreaMax);
  const abrir = () => {
    if (!posicao) return;
    const { latitude, longitude } = posicao;
    Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`);
  };

  return (
    <View style={[styles.wrap, { minHeight: Math.min(h, 200) }]}>
      <View style={styles.iconSlot}>
        <Feather name="map-pin" size={layout.icon} color={colors.ink} />
      </View>
      {posicao ? (
        <>
          <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>Posição do veículo</Text>
          <Text style={styles.coords} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {posicao.latitude.toFixed(5)}, {posicao.longitude.toFixed(5)}
          </Text>
          {(ultimaAtualizacao || desatualizada) && (
            <Chip
              label={desatualizada ? 'Localização desatualizada' : `Atualizado às ${formatTimeSeconds(ultimaAtualizacao)}`}
              tone={desatualizada ? 'warning' : 'info'}
              size="sm"
            />
          )}
          <Button label="Abrir no mapa" icon="external-link" variant="secondary" size="md" onPress={abrir} />
        </>
      ) : (
        <Text style={styles.coords} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {mensagem ?? 'Aguardando a primeira posição'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: colors.pressedNeutral,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: layout.screenMargin,
  },
  iconSlot: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.heading, color: colors.ink },
  coords: { ...typography.body, color: colors.slate700, textAlign: 'center' },
});
