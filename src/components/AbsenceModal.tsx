import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, SegmentedControl, TextField } from './ui';
import { responsavelService } from '../services/responsavelService';
import { AusenciaDTO, TrechoAusencia } from '../types';
import { useAppContext } from '../context/AppContext';
import { getApiErrorMessage } from '../utils/apiError';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

interface Props {
  visible: boolean;
  dependenteId: number;
  dependenteNome: string;
  onClose: () => void;
  onChanged?: () => void;
}

/** Quantos dias aparecem para escolha (o backend aceita até 60). */
const DIAS_VISIVEIS = 14;
const MOTIVO_MAX = 200;

const isoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const rotuloDia = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a, m - 1, d);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  if (iso === isoDia(hoje)) return 'Hoje';
  if (iso === isoDia(amanha)) return 'Amanhã';
  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

const TRECHO_LABEL: Record<TrechoAusencia, string> = { TODOS: 'Ida e volta', IDA: 'Só a ida', VOLTA: 'Só a volta' };

/**
 * "Avisar falta": o responsável informa que o aluno não vai em um dia (ida, volta ou as duas).
 * O motorista e os outros responsáveis recebem um aviso, e o aluno entra como "faltou" na viagem desse dia.
 */
export default function AbsenceModal({ visible, dependenteId, dependenteNome, onClose, onChanged }: Props) {
  const { showToast } = useAppContext();
  const dias = Array.from({ length: DIAS_VISIVEIS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return isoDia(d);
  });
  const [data, setData] = useState(dias[1]);
  const [trecho, setTrecho] = useState<TrechoAusencia>('TODOS');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [ausencias, setAusencias] = useState<AusenciaDTO[] | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const primeiroNome = dependenteNome.split(' ')[0];

  const carregar = useCallback(async () => {
    try {
      setAusencias(await responsavelService.listarAusencias(dependenteId));
    } catch {
      setAusencias([]);
    }
  }, [dependenteId]);

  useEffect(() => {
    if (visible) {
      setAusencias(null);
      setMotivo('');
      carregar();
    }
  }, [visible, carregar]);

  const enviar = async () => {
    setSalvando(true);
    try {
      await responsavelService.avisarAusencia(dependenteId, { data, trecho, motivo: motivo.trim() || null });
      showToast(`Ausência de ${primeiroNome} avisada ao motorista.`, 'success');
      setMotivo('');
      await carregar();
      onChanged?.();
    } catch (error: any) {
      showToast(getApiErrorMessage(error, 'Não foi possível avisar a ausência.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = async (a: AusenciaDTO) => {
    if (!a.id) return;
    setCancelando(a.id);
    try {
      await responsavelService.cancelarAusencia(dependenteId, a.id);
      showToast('Ausência cancelada.', 'success');
      await carregar();
      onChanged?.();
    } catch (error: any) {
      showToast(getApiErrorMessage(error, 'Não foi possível cancelar a ausência.'), 'error');
    } finally {
      setCancelando(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!salvando) onClose(); }}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier} accessibilityRole="header">
              Avisar falta de {primeiroNome}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.fechar}>
              <Feather name="x" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Qual dia?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dias}>
              {dias.map((d) => {
                const ativo = d === data;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setData(d)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    style={[styles.dia, ativo && styles.diaAtivo]}
                  >
                    <Text style={[styles.diaTexto, ativo && styles.diaTextoAtivo]}>{rotuloDia(d)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Qual trecho?</Text>
            <SegmentedControl<TrechoAusencia>
              options={(['TODOS', 'IDA', 'VOLTA'] as TrechoAusencia[]).map((t) => ({ value: t, label: TRECHO_LABEL[t] }))}
              value={trecho}
              onChange={setTrecho}
            />

            <TextField
              label="Motivo (opcional)"
              value={motivo}
              onChangeText={(t) => setMotivo(t.slice(0, MOTIVO_MAX))}
              placeholder="Ex.: consulta médica"
              hint={`${motivo.length}/${MOTIVO_MAX}`}
              maxLength={MOTIVO_MAX}
            />

            <Text style={styles.aviso}>
              O motorista e os outros responsáveis de {primeiroNome} recebem um aviso.
            </Text>

            <Button label="Avisar falta" icon="send" onPress={enviar} loading={salvando} fullWidth />

            <View style={styles.lista}>
              <Text style={styles.label}>Ausências avisadas</Text>
              {ausencias === null ? (
                <ActivityIndicator color={colors.ink} />
              ) : ausencias.length === 0 ? (
                <Text style={styles.vazio}>Nenhuma ausência avisada.</Text>
              ) : (
                ausencias.map((a) => (
                  <View key={a.id} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitulo}>
                        {rotuloDia(a.data)} · {TRECHO_LABEL[a.trecho] ?? a.trecho}
                      </Text>
                      {a.motivo ? <Text style={styles.vazio}>{a.motivo}</Text> : null}
                    </View>
                    <Button
                      label="Cancelar"
                      variant="tertiary"
                      size="md"
                      loading={cancelando === a.id}
                      accessibilityLabel={`Cancelar ausência de ${rotuloDia(a.data)}`}
                      onPress={() => cancelar(a)}
                    />
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: layout.screenMargin },
  content: { backgroundColor: colors.surface, borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '90%', paddingVertical: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  title: { ...typography.heading, color: colors.ink, flex: 1 },
  fechar: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  label: { ...typography.captionBold, color: colors.slate700 },
  dias: { gap: spacing.sm },
  dia: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaAtivo: { backgroundColor: colors.ink, borderColor: colors.ink },
  diaTexto: { ...typography.caption, color: colors.slate700 },
  diaTextoAtivo: { ...typography.captionBold, color: colors.surface },
  aviso: { ...typography.caption, color: colors.slate500 },
  lista: { gap: spacing.sm, borderTopWidth: borders.hairline, borderTopColor: colors.border, paddingTop: spacing.md },
  vazio: { ...typography.caption, color: colors.slate500 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitulo: { ...typography.body, color: colors.ink },
});
