import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { Chip } from './ui';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';
import { formatTimeSeconds } from '../utils/format';

export interface PontoMapa {
  latitude: number;
  longitude: number;
  titulo: string;
  /** Número mostrado no marcador (ordem da parada); sem número aparece um alfinete. */
  numero?: number;
  /** Destino atual: marcador maior e amarelo. */
  destaque?: boolean;
  icone?: 'home' | 'book-open' | 'map-pin';
}

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
  /** Linha da rota (já decodificada). */
  rota?: { latitude: number; longitude: number }[];
  /** Paradas a mostrar no mapa. */
  paradas?: PontoMapa[];
  /**
   * seguir: a câmera acompanha o veículo de perto (motorista, estilo Waze).
   * enquadrar: mostra o veículo e as paradas inteiros na tela (responsável, estilo Uber).
   */
  modo?: 'seguir' | 'enquadrar';
}

/** Mapa da viagem: veículo (carrinho), rota calculada pelo Google e paradas. */
export default function TripMap({
  posicao,
  ultimaAtualizacao,
  desatualizada,
  mensagem,
  altura = 220,
  preencher = false,
  rota = [],
  paradas = [],
  modo = 'seguir',
}: TripMapProps) {
  const ref = useRef<MapView>(null);
  const enquadrou = useRef('');
  const h = Math.min(altura, layout.topAreaMax);
  const centro = posicao ?? rota[0] ?? paradas[0] ?? null;

  // Motorista: acompanha o veículo de perto.
  useEffect(() => {
    if (modo === 'seguir' && posicao) {
      ref.current?.animateCamera({ center: posicao, zoom: 16 }, { duration: 600 });
    }
  }, [modo, posicao?.latitude, posicao?.longitude]);

  // Responsável: enquadra veículo + paradas quando elas mudam (não a cada posição, para não brigar com o dedo).
  const chaveParadas = paradas.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join('|');
  useEffect(() => {
    if (modo !== 'enquadrar' || !centro) return;
    const chave = `${chaveParadas}|${posicao ? 'v' : ''}`;
    if (enquadrou.current === chave) return;
    const pontos = [...(posicao ? [posicao] : []), ...paradas.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))];
    if (pontos.length < 2) {
      ref.current?.animateCamera({ center: pontos[0] ?? centro, zoom: 15 }, { duration: 600 });
    } else {
      ref.current?.fitToCoordinates(pontos, {
        edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
        animated: true,
      });
    }
    enquadrou.current = chave;
  }, [modo, chaveParadas, !!posicao, !!centro]);

  return (
    <View
      style={[styles.wrap, preencher ? styles.preencher : { height: h }]}
      accessibilityLabel={posicao ? 'Mapa com a posição do veículo e a rota' : mensagem}
    >
      {centro ? (
        <MapView
          ref={ref}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...centro, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          toolbarEnabled={false}
          showsCompass={false}
          onMapReady={() => {
            enquadrou.current = '';
          }}
        >
          {rota.length > 1 && <Polyline coordinates={rota} strokeColor={colors.info} strokeWidth={5} />}
          {paradas.map((p, i) => (
            <Marker key={`${p.latitude},${p.longitude},${i}`} coordinate={p} title={p.titulo} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={[styles.parada, p.destaque && styles.paradaDestaque]}>
                {p.numero !== undefined ? (
                  <Text style={styles.paradaNumero} maxFontSizeMultiplier={1.1}>{p.numero}</Text>
                ) : (
                  <Feather name={p.icone ?? 'map-pin'} size={14} color={colors.ink} />
                )}
              </View>
            </Marker>
          ))}
          {posicao && (
            <Marker coordinate={posicao} title="Perua" anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
              <View style={styles.veiculo}>
                <Feather name="truck" size={18} color={colors.onPrimary} />
              </View>
            </Marker>
          )}
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
            label={desatualizada ? 'Localização desatualizada' : `Atualizado às ${formatTimeSeconds(ultimaAtualizacao)}`}
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
  veiculo: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parada: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paradaDestaque: { width: 32, height: 32, backgroundColor: colors.primary, borderWidth: 3 },
  paradaNumero: { ...typography.captionBold, fontSize: 12, lineHeight: 14, color: colors.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: layout.screenMargin },
  emptyText: { ...typography.body, color: colors.slate700, textAlign: 'center' },
  badge: { position: 'absolute', top: spacing.md, left: spacing.md },
});
