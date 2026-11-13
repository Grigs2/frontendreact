import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Chip } from './ui';
import { ContraparteDTO, SolicitacaoDTO } from '../types';
import { motoristaService } from '../services/motoristaService';
import { responsavelService } from '../services/responsavelService';
import { periodoLabel } from '../services/viagemService';
import { getApiErrorMessage } from '../utils/apiError';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  /** Solicitação aberta no pop-up; null fecha. */
  solicitacao: SolicitacaoDTO | null;
  /** Quem está olhando: o responsável vê o motorista; o motorista vê o responsável e o aluno. */
  viewer: 'RESPONSAVEL' | 'MOTORISTA';
  /** Mostra "Aceitar vínculo" e "Recusar" (quando quem olha é quem responde). */
  canAnswer?: boolean;
  loading?: boolean;
  onAccept?: (s: SolicitacaoDTO) => void;
  onRefuse?: (s: SolicitacaoDTO) => void;
  onClose: () => void;
}

const initials = (nome?: string | null) =>
  (nome || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/**
 * Pop-up com os dados de quem está do outro lado do vínculo, para conferir antes de aceitar.
 * Nome e telefone aparecem completos; CPF, e-mail e placa chegam mascarados da API; endereço só bairro e cidade.
 */
export default function CounterpartModal({ solicitacao, viewer, canAnswer, loading, onAccept, onRefuse, onClose }: Props) {
  const [dados, setDados] = useState<ContraparteDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!solicitacao?.id) return;
    let ativo = true;
    setDados(null);
    setErro(null);
    setCarregando(true);
    const req = viewer === 'RESPONSAVEL'
      ? responsavelService.contraparte(solicitacao.id)
      : motoristaService.contraparte(solicitacao.id);
    req
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(getApiErrorMessage(e, 'Não foi possível carregar os dados.')))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [solicitacao?.id, viewer]);

  const visible = !!solicitacao;
  const titulo = viewer === 'RESPONSAVEL' ? 'Dados do motorista' : 'Dados do responsável';
  const ligar = () => {
    const tel = dados?.telefone?.replace(/\D/g, '');
    if (tel) Linking.openURL(`tel:${tel}`).catch(() => undefined);
  };
  const local = [dados?.bairro, dados?.cidade && `${dados.cidade}${dados.uf ? `/${dados.uf}` : ''}`].filter(Boolean).join(', ');
  const veiculo = dados?.veiculo;
  const aluno = dados?.aluno;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!loading) onClose(); }}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>{titulo}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close} disabled={loading}>
              <Feather name="x" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {carregando && <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing.xl }} />}
            {!!erro && <Text style={styles.erro} maxFontSizeMultiplier={maxFontSizeMultiplier}>{erro}</Text>}

            {dados && (
              <>
                <View style={styles.person}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{initials(dados.nome)}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>{dados.nome}</Text>
                    <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {dados.perfil === 'MOTORISTA' ? 'Motorista de transporte escolar' : 'Responsável pelo aluno'}
                    </Text>
                  </View>
                  {dados.perfil === 'MOTORISTA' && (
                    <Chip
                      label={dados.totalAvaliacoes ? `★ ${(dados.avaliacaoMedia ?? 0).toFixed(1)} (${dados.totalAvaliacoes})` : 'Sem avaliações'}
                      tone={dados.totalAvaliacoes ? 'success' : 'neutral'}
                      size="sm"
                    />
                  )}
                </View>

                <Section title="Contato">
                  <Row icon="phone" label="Telefone" value={dados.telefone || 'Não informado'} />
                  {!!dados.telefone && Platform.OS !== 'web' && (
                    <Button label="Ligar" icon="phone" variant="secondary" size="md" onPress={ligar} fullWidth />
                  )}
                  <Row icon="mail" label="E-mail" value={dados.emailMascarado} />
                  <Row icon="credit-card" label="CPF" value={dados.cpfMascarado} />
                  <Row icon="map-pin" label={dados.perfil === 'MOTORISTA' ? 'Atende a partir de' : 'Região'} value={local || null} />
                </Section>

                {veiculo && (
                  <Section title="Veículo">
                    <Row icon="truck" label="Modelo" value={[veiculo.modelo, veiculo.cor?.toLowerCase(), veiculo.ano || null].filter(Boolean).join(' · ')} />
                    <Row icon="users" label="Capacidade" value={veiculo.capacidade ? `${veiculo.capacidade} lugares` : null} />
                    <Row icon="hash" label="Placa" value={veiculo.placaMascarada} />
                  </Section>
                )}

                <Section title="Viagem">
                  <Row icon="navigation" label="Viagem" value={[dados.viagemNome, periodoLabel(dados.viagemPeriodo)].filter(Boolean).join(' · ')} />
                  {!!dados.escolasAtendidas?.length && <Row icon="book" label="Escolas" value={dados.escolasAtendidas.join(', ')} />}
                </Section>

                {aluno && (
                  <Section title="Aluno">
                    <Row icon="user" label="Nome" value={aluno.nome} />
                    <Row icon="calendar" label="Idade" value={aluno.idade != null ? `${aluno.idade} anos` : null} />
                    <Row icon="book" label="Escola" value={[aluno.escola, periodoLabel(aluno.periodo)].filter(Boolean).join(' · ')} />
                    <Row icon="map-pin" label="Região" value={[aluno.bairro, aluno.cidade].filter(Boolean).join(', ') || null} />
                  </Section>
                )}

                <Text style={styles.note} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Por segurança, CPF, e-mail e placa aparecem parcialmente. Endereço completo só é usado na rota da viagem.
                </Text>
              </>
            )}
          </ScrollView>

          {canAnswer && solicitacao ? (
            <View style={styles.footer}>
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Ao aceitar, os dados do aluno e do responsável são compartilhados com o motorista e o acordo de transporte é fechado.
              </Text>
              <Button label="Aceitar vínculo" icon="check" onPress={() => onAccept?.(solicitacao)} loading={loading} disabled={!dados} fullWidth />
              <Button label="Recusar" variant="secondary" onPress={() => onRefuse?.(solicitacao)} disabled={loading} fullWidth />
            </View>
          ) : (
            <View style={styles.footer}>
              <Button label="Fechar" variant="secondary" onPress={onClose} fullWidth />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ icon, label, value }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={colors.slate500} style={styles.rowIcon} />
      <Text style={styles.rowLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>{label}</Text>
      <Text style={styles.rowValue} selectable maxFontSizeMultiplier={maxFontSizeMultiplier}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '90%', paddingVertical: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  title: { ...typography.heading, color: colors.ink, flex: 1 },
  close: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  erro: { ...typography.body, color: colors.danger },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.label, color: colors.ink },
  name: { ...typography.label, fontSize: 18, lineHeight: 24, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  section: { gap: spacing.sm, borderTopWidth: borders.hairline, borderTopColor: colors.border, paddingTop: spacing.md },
  sectionTitle: { ...typography.captionBold, color: colors.slate700, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowIcon: { marginTop: 3 },
  rowLabel: { ...typography.caption, color: colors.slate500, width: 120 },
  rowValue: { ...typography.body, color: colors.ink, flex: 1 },
  note: { ...typography.caption, color: colors.slate500 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: layout.buttonGap, borderTopWidth: borders.hairline, borderTopColor: colors.border, marginTop: spacing.sm },
});
