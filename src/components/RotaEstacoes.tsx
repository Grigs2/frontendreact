import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DependenteParadaDTO, ParadaViagemDTO } from '../types';
import { ehEmbarque, nomeEscola, nomesDosAlunos } from '../utils/paradas';
import { colors, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  /** Paradas com alunos, na ordem da rota. */
  paradas: ParadaViagemDTO[];
  ida: boolean;
  /** Índice (em `paradas`) do destino mostrado no atendimento. */
  indiceAtual: number;
  pendenteNaParada: (parada: ParadaViagemDTO, aluno: DependenteParadaDTO) => boolean;
  /** Toque numa estação: abre os detalhes ou leva o atendimento até ela. */
  onSelecionar: (indice: number) => void;
}

const LARGURA_ESTACAO = 104;

/**
 * Rota como linha de metrô: cada parada é uma estação ligada à próxima.
 * Não depende de mapa nem de internet, então serve de alternativa ao mapa e de vista offline.
 */
export default function RotaEstacoes({ paradas, ida, indiceAtual, pendenteNaParada, onSelecionar }: Props) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  // Mantém a estação atual visível.
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, (indiceAtual - 1) * LARGURA_ESTACAO), animated: true });
  }, [indiceAtual]);

  return (
    <View style={styles.wrapper} accessibilityLabel="Rota em linha: paradas na ordem">
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trilho}>
        {paradas.map((p, i) => {
          // Embarque: concluída quando ninguém mais espera. Desembarque: quando ninguém espera nem está a bordo.
          const concluida = !p.listaDependentes.some(
            (d) => pendenteNaParada(p, d) || d.statusEmbarque === 'ESPERANDO' || (!ehEmbarque(p, ida) && d.statusEmbarque === 'EMBARCADO'),
          );
          const atual = i === indiceAtual && !concluida;
          const escola = p.tipoParada === 'ESCOLA';
          const nome = escola ? nomeEscola(p) : nomesDosAlunos(p.listaDependentes);
          const acao = ehEmbarque(p, ida) ? 'Embarque' : 'Desembarque';
          return (
            <Pressable
              key={`${p.id ?? i}-${p.ordem}`}
              onPress={() => onSelecionar(i)}
              accessibilityRole="button"
              accessibilityLabel={`Parada ${i + 1}: ${acao} ${escola ? 'na' : 'de'} ${nome}${concluida ? ', concluída' : atual ? ', atual' : ''}`}
              style={styles.estacao}
            >
              <View style={styles.linhaTrilho}>
                <View style={[styles.segmento, i === 0 && styles.segmentoVazio, i > 0 && i <= indiceAtual && styles.segmentoFeito]} />
                <View style={[styles.ponto, concluida && styles.pontoFeito, atual && styles.pontoAtual]}>
                  {concluida ? (
                    <Feather name="check" size={14} color={colors.surface} />
                  ) : escola ? (
                    <Feather name="book-open" size={12} color={colors.ink} />
                  ) : (
                    <Text style={[styles.numero, atual && styles.numeroAtual]} maxFontSizeMultiplier={1.2}>{i + 1}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.segmento,
                    i === paradas.length - 1 && styles.segmentoVazio,
                    i < indiceAtual && styles.segmentoFeito,
                  ]}
                />
              </View>
              <Text style={[styles.acao, atual && styles.textoAtual]} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
                {acao}
              </Text>
              <Text style={[styles.nome, atual && styles.textoAtual]} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={2}>
                {nome}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const PONTO = 26;

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  trilho: { paddingHorizontal: spacing.xs },
  estacao: { width: LARGURA_ESTACAO, alignItems: 'center', gap: 2 },
  linhaTrilho: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', height: PONTO + 4 },
  segmento: { flex: 1, height: 4, backgroundColor: colors.border },
  segmentoFeito: { backgroundColor: colors.success },
  segmentoVazio: { backgroundColor: 'transparent' },
  ponto: {
    width: PONTO,
    height: PONTO,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontoFeito: { backgroundColor: colors.success, borderColor: colors.success },
  pontoAtual: { backgroundColor: colors.primary, borderColor: colors.ink, transform: [{ scale: 1.15 }] },
  numero: { ...typography.captionBold, fontSize: 11, lineHeight: 13, color: colors.ink },
  numeroAtual: { color: colors.onPrimary },
  acao: { ...typography.caption, fontSize: 11, lineHeight: 14, color: colors.slate500, paddingHorizontal: 4 },
  nome: { ...typography.captionBold, color: colors.ink, textAlign: 'center', paddingHorizontal: 4 },
  textoAtual: { color: colors.ink, textDecorationLine: 'underline' },
});
