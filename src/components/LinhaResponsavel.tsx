import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinhaViagemDTO } from '../types';
import { colors, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  linha: LinhaViagemDTO;
}

const LARGURA_ESTACAO = 104;
const PONTO = 26;

/** Linha de estações do responsável. Vem do servidor e não depende do Google Maps. */
export default function LinhaResponsavel({ linha }: Props) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const indiceAtual = linha.indiceAtual ?? null;
  const posicaoAtual = indiceAtual == null ? -1 : linha.paradas.findIndex((p) => p.ordem === indiceAtual);

  // Mantém a estação atual visível.
  useEffect(() => {
    if (posicaoAtual < 0) return;
    scroll.current?.scrollTo({ x: Math.max(0, (posicaoAtual - 1) * LARGURA_ESTACAO), animated: true });
  }, [posicaoAtual]);

  if (!linha.disponivel) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.textoVazio} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {linha.mensagem ?? 'A linha da viagem ainda não está disponível.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} accessibilityLabel="Linha de paradas da viagem">
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trilho}>
        {linha.paradas.map((p, i) => {
          const atual = i === posicaoAtual && !p.concluida;
          const escola = p.tipoParada === 'ESCOLA';
          const nome = p.rotulo ?? `Parada ${p.ordem}`;
          const acao = p.acao === 'EMBARQUE' ? 'Embarque' : 'Desembarque';
          return (
            <View
              key={p.ordem}
              accessible
              accessibilityLabel={`Parada ${p.ordem}: ${acao}, ${nome}${p.doFilho ? ', parada do seu aluno' : ''}${p.concluida ? ', concluída' : atual ? ', atual' : ''}`}
              style={styles.estacao}
            >
              <View style={styles.linhaTrilho}>
                <View style={[styles.segmento, i === 0 && styles.segmentoVazio, i > 0 && i <= posicaoAtual && styles.segmentoFeito]} />
                <View style={[styles.ponto, p.concluida && styles.pontoFeito, atual && styles.pontoAtual, p.doFilho && !p.concluida && styles.pontoFilho]}>
                  {p.concluida ? (
                    <Feather name="check" size={14} color={colors.surface} />
                  ) : escola ? (
                    <Feather name="book-open" size={12} color={colors.ink} />
                  ) : p.doFilho ? (
                    <Feather name="home" size={12} color={colors.ink} />
                  ) : (
                    <Text style={[styles.numero, atual && styles.numeroAtual]} maxFontSizeMultiplier={1.2}>{p.ordem}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.segmento,
                    i === linha.paradas.length - 1 && styles.segmentoVazio,
                    posicaoAtual >= 0 && i < posicaoAtual && styles.segmentoFeito,
                  ]}
                />
              </View>
              <Text style={[styles.acao, atual && styles.textoAtual]} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
                {acao}
              </Text>
              <Text style={[styles.nome, atual && styles.textoAtual]} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={2}>
                {nome}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  vazio: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  textoVazio: { ...typography.body, color: colors.slate500 },
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
  pontoFilho: { borderColor: colors.primary },
  numero: { ...typography.captionBold, fontSize: 11, lineHeight: 13, color: colors.ink },
  numeroAtual: { color: colors.onPrimary },
  acao: { ...typography.caption, fontSize: 11, lineHeight: 14, color: colors.slate500, paddingHorizontal: 4 },
  nome: { ...typography.captionBold, color: colors.ink, textAlign: 'center', paddingHorizontal: 4 },
  textoAtual: { color: colors.ink, textDecorationLine: 'underline' },
});
