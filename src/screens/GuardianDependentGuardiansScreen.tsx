import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GuardianLayout from '../components/GuardianLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import ChoiceChips from '../components/ChoiceChips';
import { Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { CATEGORIAS_VINCULO, categoriaLabel, redeResponsaveisService } from '../services/redeResponsaveisService';
import { CategoriaVinculoResponsavel, ConviteResponsavelDTO, ResponsavelDTO, VinculoResponsavelDTO } from '../types';
import { statusInfo } from '../utils/statusLabels';
import { formatDate, formatDateTime } from '../utils/format';
import { validateEmail } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependentGuardians'>;

/** 3.5 — outros responsáveis do aluno: lista, convite (só o criador), situação dos convites e revogação. */
export default function GuardianDependentGuardiansScreen({ navigation, route }: Props) {
  const { dependenteId } = route.params;
  const { currentUser, showToast } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;
  const dependente = guardian?.dependentes?.find((d) => d.id === dependenteId);

  const [responsaveis, setResponsaveis] = useState<VinculoResponsavelDTO[] | null>(null);
  const [convites, setConvites] = useState<ConviteResponsavelDTO[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [convidando, setConvidando] = useState(false);
  const [email, setEmail] = useState('');
  const [categoria, setCategoria] = useState<CategoriaVinculoResponsavel>('MAE');
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [revogar, setRevogar] = useState<VinculoResponsavelDTO | null>(null);

  const load = useCallback(async () => {
    try {
      setErro(null);
      const [r, c] = await Promise.all([
        redeResponsaveisService.responsaveis(dependenteId),
        redeResponsaveisService.historicoConvites(dependenteId).catch(() => [] as ConviteResponsavelDTO[]),
      ]);
      setResponsaveis(r);
      setConvites([...c].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os responsáveis.'));
    }
  }, [dependenteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const souCriador = responsaveis?.some((r) => r.responsavelCriador && r.responsavelId === guardian?.id) ?? false;

  const enviar = async () => {
    const e = validateEmail(email);
    setErroEmail(e);
    if (e) return;
    setEnviando(true);
    try {
      await redeResponsaveisService.convidar(dependenteId, email, categoria);
      showToast('Convite enviado. Ele vale por 7 dias.', 'success');
      setConvidando(false);
      setEmail('');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível enviar o convite.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const confirmarRevogar = async () => {
    if (!revogar) return;
    setEnviando(true);
    try {
      await redeResponsaveisService.revogar(dependenteId, revogar.responsavelId);
      showToast('Vínculo removido.', 'success');
      setRevogar(null);
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível remover o vínculo.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const body = erro ? (
    <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={load} />
  ) : responsaveis === null ? (
    <StateView kind="loading" title="Carregando responsáveis..." />
  ) : (
    <>
      <Card style={styles.card}>
        {responsaveis.map((r, i) => (
          <View key={r.responsavelId} style={[styles.person, i > 0 && styles.divider]}>
            <View style={styles.personTop}>
              <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {r.nome}
                {r.responsavelId === guardian?.id ? ' (você)' : ''}
              </Text>
              {r.responsavelCriador && <Chip label="Criador" tone="info" size="sm" />}
            </View>
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {[categoriaLabel(r.categoria), r.email, r.vinculadoEm && `desde ${formatDate(r.vinculadoEm)}`].filter(Boolean).join(' · ')}
            </Text>
            {souCriador && !r.responsavelCriador && (
              <Button label="Remover" icon="user-x" variant="tertiary" size="md" onPress={() => setRevogar(r)} style={styles.remove} />
            )}
          </View>
        ))}
      </Card>

      {souCriador ? (
        convidando ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Convidar responsável
            </Text>
            <TextField
              label="E-mail da conta do responsável"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErroEmail(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              hint="A pessoa precisa ter conta de responsável no Tio da Perua."
              error={erroEmail || undefined}
              editable={!enviando}
            />
            <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Vínculo com o aluno</Text>
            <ChoiceChips
              options={CATEGORIAS_VINCULO}
              value={categoria}
              onChange={setCategoria}
              accessibilityLabel="Vínculo com o aluno"
            />
            <View style={styles.actions}>
              <Button label="Enviar convite" icon="send" onPress={enviar} loading={enviando} fullWidth />
              <Button label="Cancelar" variant="tertiary" onPress={() => setConvidando(false)} disabled={enviando} fullWidth />
            </View>
          </Card>
        ) : (
          <Button label="Convidar responsável" icon="user-plus" onPress={() => setConvidando(true)} fullWidth />
        )
      ) : (
        <Notice tone="info">Somente quem cadastrou o aluno pode convidar ou remover responsáveis.</Notice>
      )}

      {convites.length > 0 && (
        <>
          <SectionTitle>Convites</SectionTitle>
          {convites.map((c) => {
            const info = statusInfo('solicitacao', c.status);
            return (
              <Card key={c.id} style={styles.card}>
                <View style={styles.personTop}>
                  <Text style={styles.name} maxFontSizeMultiplier={maxFontSizeMultiplier}>{c.convidadoNome || c.convidadoEmail}</Text>
                  <Chip label={info.label} tone={info.tone} size="sm" />
                </View>
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {categoriaLabel(c.categoria)} · enviado em {formatDateTime(c.criadoEm)}
                </Text>
                {c.status === 'PENDENTE' && (
                  <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Expira em {formatDate(c.expiraEm)}</Text>
                )}
              </Card>
            );
          })}
        </>
      )}
    </>
  );

  return (
    <GuardianLayout>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Responsáveis" subtitle={dependente?.nome} onBack={() => navigation.goBack()} />
          {body}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={!!revogar}
        title="Remover responsável?"
        message={`${revogar?.nome ?? ''} deixará de acompanhar este aluno.`}
        confirmLabel="Remover"
        loading={enviando}
        onConfirm={confirmarRevogar}
        onCancel={() => setRevogar(null)}
      />
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  card: { gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.ink },
  person: { gap: spacing.xs, paddingVertical: spacing.sm },
  personTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.label, color: colors.ink, flex: 1 },
  caption: { ...typography.caption, color: colors.slate500 },
  label: { ...typography.label, color: colors.ink },
  remove: { alignSelf: 'flex-start' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  actions: { gap: layout.buttonGap, marginTop: spacing.sm },
});
