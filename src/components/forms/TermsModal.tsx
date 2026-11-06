import React from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui';
import {
  TERMS_INTRO,
  TERMS_SECTIONS,
  TERMS_UPDATED_AT,
  TERMS_VERSION,
} from '../../content/termosPrivacidade';
import { TERMOS_PDF_URL } from '../../services/config';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../../theme';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Quando informado, mostra o botão "Li e aceito" (fluxo de cadastro e novo aceite). */
  onAccept?: () => void;
  /** Texto acima do conteúdo (ex.: aviso de que os termos mudaram). */
  notice?: string;
  acceptLoading?: boolean;
  /** Rótulo do botão de sair sem aceitar (padrão: "Voltar sem aceitar"). */
  declineLabel?: string;
}

/** Abre o PDF (link permanente) no navegador do aparelho. */
const abrirPdf = () => {
  Linking.openURL(TERMOS_PDF_URL).catch(() => undefined);
};

/** Termos de Uso e Política de Privacidade em tela cheia, com rolagem. */
export default function TermsModal({ visible, onClose, onAccept, notice, acceptLoading, declineLabel }: TermsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Termos de Uso e Política de Privacidade
          </Text>
          <Text style={styles.meta} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Versão {TERMS_VERSION} · atualizada em {TERMS_UPDATED_AT}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.body}>
            {notice ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{notice}</Text>
              </View>
            ) : null}
            <Text style={styles.paragraph} maxFontSizeMultiplier={maxFontSizeMultiplier}>{TERMS_INTRO}</Text>
            {TERMS_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {section.title}
                </Text>
                {section.paragraphs?.map((p) => (
                  <Text key={p} style={styles.paragraph} maxFontSizeMultiplier={maxFontSizeMultiplier}>{p}</Text>
                ))}
                {section.items?.map((item) => (
                  <View key={item} style={styles.item}>
                    <Text style={styles.bullet} maxFontSizeMultiplier={maxFontSizeMultiplier}>•</Text>
                    <Text style={[styles.paragraph, styles.itemText]} maxFontSizeMultiplier={maxFontSizeMultiplier}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.actions}>
            {onAccept ? (
              <>
                <Button label="Li e aceito" icon="check" onPress={onAccept} loading={acceptLoading} fullWidth />
                <Button label="Baixar PDF" icon="download" variant="secondary" onPress={abrirPdf} fullWidth />
                <Button label={declineLabel ?? 'Voltar sem aceitar'} variant="tertiary" onPress={onClose} disabled={acceptLoading} fullWidth />
              </>
            ) : (
              <>
                <Button label="Baixar PDF" icon="download" variant="secondary" onPress={abrirPdf} fullWidth />
                <Button label="Fechar" variant="tertiary" onPress={onClose} fullWidth />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: layout.screenMargin,
    paddingTop: 48,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  title: { ...typography.title, color: colors.ink, maxWidth: 640, width: '100%', alignSelf: 'center' },
  meta: { ...typography.caption, color: colors.slate500, maxWidth: 640, width: '100%', alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  body: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: spacing.xl },
  section: { gap: spacing.sm },
  notice: { backgroundColor: colors.primaryTint, borderRadius: 12, padding: spacing.md },
  noticeText: { ...typography.label, color: colors.ink },
  sectionTitle: { ...typography.heading, color: colors.ink },
  paragraph: { ...typography.body, color: colors.slate700 },
  item: { flexDirection: 'row', gap: spacing.sm },
  bullet: { ...typography.body, color: colors.slate700 },
  itemText: { flex: 1 },
  footer: {
    padding: layout.screenMargin,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  actions: { gap: layout.buttonGap, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
