import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, TextField } from './ui';
import { EscolaResumoDTO } from '../types';
import { HORARIO_PARTIDA_REGEX, mascararHorarioPartida } from '../services/viagemService';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

interface ConfigurarViagemModalProps {
  visible: boolean;
  /** Nome salvo atualmente ('' quando a viagem usa o nome padrão). */
  nomeAtual: string;
  nomePadrao: string;
  /** Horário de partida do dia aberto (HH:mm). */
  horarioAtual: string;
  horarioAjustado: boolean;
  podeEditarHorario: boolean;
  podeAdicionarEscolas: boolean;
  /** `null` enquanto carrega as escolas disponíveis. */
  escolasDisponiveis: EscolaResumoDTO[] | null;
  onSalvarNome: (nome: string) => Promise<boolean>;
  onSalvarHorario: (horario: string | null) => Promise<boolean>;
  onAdicionarEscolas: (escolaIds: number[]) => Promise<boolean>;
  onClose: () => void;
}

/** Configuração da viagem: nome, horário do dia e escolas. Cada seção salva por conta própria. */
export default function ConfigurarViagemModal({
  visible,
  nomeAtual,
  nomePadrao,
  horarioAtual,
  horarioAjustado,
  podeEditarHorario,
  podeAdicionarEscolas,
  escolasDisponiveis,
  onSalvarNome,
  onSalvarHorario,
  onAdicionarEscolas,
  onClose,
}: ConfigurarViagemModalProps) {
  const [nome, setNome] = useState(nomeAtual);
  const [horario, setHorario] = useState(horarioAtual);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [salvando, setSalvando] = useState<'nome' | 'horario' | 'escolas' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setNome(nomeAtual);
    setHorario(horarioAtual);
    setSelecionadas([]);
  }, [visible, nomeAtual, horarioAtual]);

  const ocupado = salvando !== null;
  const close = () => {
    if (!ocupado) onClose();
  };

  const horarioValido = HORARIO_PARTIDA_REGEX.test(horario);

  const alternarEscola = (id: number) =>
    setSelecionadas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  const salvarNome = async () => {
    setSalvando('nome');
    await onSalvarNome(nome.trim());
    setSalvando(null);
  };

  const salvarHorario = async (valor: string | null) => {
    setSalvando('horario');
    await onSalvarHorario(valor);
    setSalvando(null);
  };

  const adicionarEscolas = async () => {
    setSalvando('escolas');
    const ok = await onAdicionarEscolas(selecionadas);
    if (ok) setSelecionadas([]);
    setSalvando(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Configurar viagem
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.secao} maxFontSizeMultiplier={maxFontSizeMultiplier}>Nome</Text>
            <TextField
              label="Nome da viagem"
              value={nome}
              onChangeText={setNome}
              placeholder={nomePadrao}
              maxLength={200}
              hint="Deixe em branco para voltar ao nome padrão."
              containerStyle={styles.field}
              editable={!ocupado}
            />
            <Button
              label="Salvar nome"
              variant="secondary"
              onPress={salvarNome}
              disabled={ocupado || nome.trim() === nomeAtual.trim()}
              loading={salvando === 'nome'}
              fullWidth
            />

            <Text style={styles.secao} maxFontSizeMultiplier={maxFontSizeMultiplier}>Horário deste dia</Text>
            {podeEditarHorario ? (
              <>
                <TextField
                  label="Horário de partida"
                  value={horario}
                  onChangeText={(texto) => setHorario(mascararHorarioPartida(texto))}
                  placeholder="HH:mm"
                  keyboardType="number-pad"
                  maxLength={5}
                  hint="Vale somente para esta data."
                  error={horario.length > 0 && !horarioValido ? 'Use o formato HH:mm, por exemplo 07:30.' : undefined}
                  containerStyle={styles.field}
                  editable={!ocupado}
                />
                <Button
                  label="Salvar horário"
                  variant="secondary"
                  onPress={() => salvarHorario(horario)}
                  disabled={ocupado || !horarioValido || horario === horarioAtual}
                  loading={salvando === 'horario'}
                  fullWidth
                />
                {horarioAjustado && (
                  <Button label="Usar padrão da viagem" variant="tertiary" onPress={() => salvarHorario(null)} disabled={ocupado} fullWidth />
                )}
              </>
            ) : (
              <Text style={styles.aviso}>O horário só pode ser alterado enquanto a viagem do dia está planejada.</Text>
            )}

            <Text style={styles.secao} maxFontSizeMultiplier={maxFontSizeMultiplier}>Escolas</Text>
            {!podeAdicionarEscolas ? (
              <Text style={styles.aviso}>Não é possível adicionar escolas nesta viagem.</Text>
            ) : escolasDisponiveis === null ? (
              <Text style={styles.aviso}>Carregando escolas...</Text>
            ) : escolasDisponiveis.length === 0 ? (
              <Text style={styles.aviso}>Nenhuma escola disponível. Escolas com vínculo ativo aparecem aqui.</Text>
            ) : (
              <>
                {escolasDisponiveis.map((escola) => {
                  const marcada = selecionadas.includes(escola.id);
                  return (
                    <Pressable
                      key={escola.id}
                      onPress={() => alternarEscola(escola.id)}
                      disabled={ocupado}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: marcada }}
                      accessibilityLabel={escola.nome}
                      style={styles.escolaLinha}
                    >
                      <Feather name={marcada ? 'check-square' : 'square'} size={layout.icon} color={marcada ? colors.ink : colors.slate500} />
                      <Text style={styles.escolaNome} maxFontSizeMultiplier={maxFontSizeMultiplier}>{escola.nome}</Text>
                    </Pressable>
                  );
                })}
                <Text style={styles.aviso}>Os alunos dessas escolas entram na viagem somente após aceitar a solicitação.</Text>
                <Button
                  label="Adicionar escolas"
                  variant="secondary"
                  onPress={adicionarEscolas}
                  disabled={ocupado || selecionadas.length === 0}
                  loading={salvando === 'escolas'}
                  fullWidth
                />
              </>
            )}
          </ScrollView>

          <View style={styles.fechar}>
            <Button label="Fechar" variant="tertiary" onPress={close} disabled={ocupado} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, width: '100%', maxWidth: 440, maxHeight: '90%' },
  title: { ...typography.heading, color: colors.ink, marginBottom: spacing.lg },
  secao: { ...typography.caption, color: colors.slate500, marginTop: spacing.md, marginBottom: spacing.sm },
  field: { width: '100%', marginBottom: spacing.sm },
  aviso: { ...typography.caption, color: colors.slate500, marginBottom: spacing.sm },
  escolaLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  escolaNome: { ...typography.body, color: colors.ink, flex: 1 },
  fechar: { marginTop: spacing.lg },
});
