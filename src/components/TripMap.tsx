import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Chip } from './ui';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';
import { formatTimeSeconds } from '../utils/format';

export interface TripMapProps {
  posicao?: { latitude: number; longitude: number } | null;
  /** ISO da última posição aceita pelo servidor. */
  ultimaAtualizacao?: string | null;
  desatualizada?: boolean;
  /** Texto exibido quando não há posição (ex.: "Aguardando a primeira posição"). */
  mensagem?: string;
  altura?: number;
  /** Ocupa todo o espaço do pai (ignora altura). */
  preencher?: boolean;
}

/** Mapa da viagem. Só a posição do motorista: paradas ainda não têm coordenadas. */
export default function TripMap({ posicao, ultimaAtualizacao, desatualizada, mensagem, altura = 220, preencher = false }: TripMapProps) {
  const ref = useRef<MapView>(null);
  const h = Math.min(altura, layout.topAreaMax);

  useEffect(() => {
    if (posicao) {
      ref.current?.animateCamera({ center: posicao, zoom: 16 }, { duration: 600 });
    }
  }, [posicao?.latitude, posicao?.longitude]);

  return (
    <View style={[styles.wrap, preencher ? styles.preencher : { height: h }]} accessibilityLabel={posicao ? 'Mapa com a posição do veículo' : mensagem}>
      {posicao ? (
        <MapView
          ref={ref}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...posicao, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          toolbarEnabled={false}
          showsCompass={false}
        >
          <Marker coordinate={posicao} title="Veículo" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.marker} />
          </Marker>
        </MapView>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {mensagem ?? 'Aguardando a primeira posição'}
          </Text>
        </View>
      )}
      {(ultimaAtualizacao || desatualizada) && (
        <View style={styles.badge} pointerEvents="none">
          <Chip
            label={
              desatualizada
                ? 'Localização desatualizada'
                : `Atualizado às ${formatTimeSeconds(ultimaAtualizacao)}`
            }
            tone={desatualizada ? 'warning' : 'info'}
            icon={desatualizada ? 'alert-triangle' : 'navigation'}
            size="sm"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: colors.pressedNeutral, overflow: 'hidden' },
  preencher: { flex: 1, height: undefined },
  marker: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.info,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: layout.screenMargin },
  emptyText: { ...typography.body, color: colors.slate700, textAlign: 'center' },
  badge: { position: 'absolute', top: spacing.md, left: spacing.md },
});
