import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Notice } from './Feedback';
import { colors, maxFontSizeMultiplier, spacing, typography } from '../theme';

export interface FonteImagem {
  uri: string;
  headers: Record<string, string>;
}

interface Props {
  visible: boolean;
  title: string;
  /** Fonte autenticada obtida de fonteAutenticada(); null enquanto ainda não foi resolvida. */
  fonte: FonteImagem | null;
  onClose: () => void;
}

/** Visualização em tela cheia de uma imagem de documento (motorista e administrador). */
export default function ImagemDocumentoModal({ visible, title, fonte, onClose }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (visible) {
      setCarregando(true);
      setErro(false);
    }
  }, [visible, fonte?.uri]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar imagem" hitSlop={12}>
            <Feather name="x" size={24} color={colors.surface} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {erro ? (
            <Notice tone="danger">Não foi possível carregar a imagem. Tente novamente.</Notice>
          ) : (
            fonte && (
              <Image
                source={{ uri: fonte.uri, headers: fonte.headers }}
                style={styles.imagem}
                resizeMode="contain"
                accessibilityLabel={title}
                onLoadEnd={() => setCarregando(false)}
                onError={() => {
                  setCarregando(false);
                  setErro(true);
                }}
              />
            )
          )}
          {(carregando && !erro) && (
            <View style={styles.carregando} pointerEvents="none">
              <ActivityIndicator color={colors.surface} size="large" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,24,31,0.95)', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  title: { ...typography.heading, color: colors.surface, flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagem: { width: '100%', height: '100%' },
  carregando: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
