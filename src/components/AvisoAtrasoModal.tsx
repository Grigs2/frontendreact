import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import ChoiceChips from './ChoiceChips';
import { Button, TextField } from './ui';
import { viagemService } from '../services/viagemService';
import { useAppContext } from '../context/AppContext';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, maxFontSizeMultiplier, spacing, typography } from '../theme';

interface Props {
  visible: boolean;
  viagemDiaId: number | null | undefined;
  onClose: () => void;
  onSent?: () => void;
}

/** "Aviso geral" / "Enviar aviso": atraso da viagem para os responsáveis dos alunos que ainda não embarcaram. */
export default function AvisoAtrasoModal({ visible, viagemDiaId, onClose, onSent }: Props) {
  const { showToast } = useAppContext();
  const [minutos, setMinutos] = useState('15');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMotivo('');
    }
  }, [visible]);

  const enviar = async () => {
    if (!viagemDiaId) return;
    setEnviando(true);
    try {
      await viagemService.avisarAtraso(viagemDiaId, Number(minutos), motivo);
      showToast('Responsáveis avisados do atraso.', 'success');
      onSent?.();
      onClose();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível avisar o atraso.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>Avisar atraso</Text>
          <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Os responsáveis dos alunos que ainda vão embarcar ou estão no veículo recebem o aviso.
          </Text>
          <ChoiceChips
            options={['5', '10', '15', '20', '30', '45'].map((m) => ({ value: m, label: `${m} min` }))}
            value={minutos}
            onChange={setMinutos}
            accessibilityLabel="Minutos de atraso"
          />
          <TextField label="Motivo (opcional)" value={motivo} onChangeText={setMotivo} placeholder="Ex.: trânsito na avenida" maxLength={200} />
          <Button label="Enviar aviso" icon="send" onPress={enviar} loading={enviando} fullWidth />
          <Button label="Voltar" variant="tertiary" onPress={onClose} disabled={enviando} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  content: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 600, alignSelf: 'center' },
  title: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.slate700 },
});
