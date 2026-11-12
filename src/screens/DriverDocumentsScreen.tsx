import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import ChoiceChips from '../components/ChoiceChips';
import Timeline from '../components/Timeline';
import { Notice } from '../components/Feedback';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { TIPOS_DOCUMENTO, documentoService, documentosVigentes } from '../services/documentoService';
import { DocumentoMotoristaDTO, MotoristaDTO, TipoDocumento } from '../types';
import { brToIsoDate, isoToBrDate, maskCNH, maskDate, onlyDigits } from '../utils/masks';
import {
  isExpired,
  validateCNH,
  validateExpiryDate,
  validatePastDate,
  validateRenavam,
  validateRequired,
} from '../utils/validators';
import { TIPO_DOCUMENTO_LABEL, statusInfo } from '../utils/statusLabels';
import { formatDate, formatDateTime, maskDocument } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverDocuments'>;

const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

const ICONE: Record<TipoDocumento, React.ComponentProps<typeof Feather>['name']> = {
  CNH: 'credit-card',
  VISTORIA: 'clipboard',
  LICENCIAMENTO: 'file-text',
};

const DESCRICAO: Record<TipoDocumento, string> = {
  CNH: 'Número, categoria e validade da habilitação',
  VISTORIA: 'Laudo da vistoria do veículo escolar',
  LICENCIAMENTO: 'RENAVAM e validade do licenciamento (CRLV)',
};

interface FormState {
  numero: string;
  categoria: string;
  dataRealizacao: string;
  dataValidade: string;
}

const EMPTY_FORM: FormState = { numero: '', categoria: 'D', dataRealizacao: '', dataValidade: '' };

/** 2.2 e 2.3.7/2.3.9 — documentos do motorista: situação, envio, correção e histórico. */
export default function DriverDocumentsScreen({ navigation }: Props) {
  const { currentUser, showToast } = useAppContext();
  const driver = currentUser as MotoristaDTO;
  const hasVehicle = !!driver?.veiculoDTO?.placa;

  const [documentos, setDocumentos] = useState<DocumentoMotoristaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<TipoDocumento | null>(null);
  const [historyOpen, setHistoryOpen] = useState<TipoDocumento | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string | null>>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!driver?.id) return;
    try {
      setError(null);
      setDocumentos(await documentoService.listar(driver.id));
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível carregar seus documentos.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driver?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const vigentes = documentosVigentes(documentos);

  const openForm = (tipo: TipoDocumento) => {
    const atual = vigentes[tipo];
    // Correção: reabre preenchido com a última versão (2.2.9).
    setForm(
      atual
        ? {
            numero: tipo === 'CNH' ? maskCNH(atual.numero) : atual.numero,
            categoria: atual.categoria || 'D',
            dataRealizacao: isoToBrDate(atual.dataRealizacao),
            dataValidade: isoToBrDate(atual.dataValidade),
          }
        : EMPTY_FORM,
    );
    setErrors({});
    setEditing(tipo);
  };

  const setField = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const submit = async () => {
    if (!editing || !driver?.id) return;
    const next: Partial<Record<keyof FormState, string | null>> = {
      numero:
        editing === 'CNH'
          ? validateCNH(form.numero)
          : editing === 'LICENCIAMENTO'
            ? validateRenavam(form.numero)
            : validateRequired(form.numero, 'o número do laudo'),
      categoria: editing === 'CNH' && !form.categoria ? 'Escolha a categoria.' : null,
      dataRealizacao: editing === 'VISTORIA' ? validatePastDate(form.dataRealizacao, 'data da vistoria') : null,
      dataValidade: validateExpiryDate(form.dataValidade, editing === 'VISTORIA' ? form.dataRealizacao : undefined),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    try {
      await documentoService.submeter(driver.id, {
        tipo: editing,
        numero: editing === 'VISTORIA' ? form.numero.trim() : onlyDigits(form.numero),
        categoria: editing === 'CNH' ? form.categoria : null,
        dataRealizacao: editing === 'VISTORIA' ? brToIsoDate(form.dataRealizacao) : null,
        dataValidade: brToIsoDate(form.dataValidade),
      });
      showToast('Documento enviado. Ele ficará em análise até a revisão.', 'success');
      setEditing(null);
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível enviar o documento.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (tipo: TipoDocumento) => {
    const vencido = form.dataValidade.length === 10 && isExpired(form.dataValidade);
    return (
      <View style={styles.form}>
        <TextField
          label={tipo === 'CNH' ? 'Número da CNH' : tipo === 'LICENCIAMENTO' ? 'RENAVAM' : 'Número do laudo'}
          value={form.numero}
          onChangeText={(t) => setField('numero', tipo === 'VISTORIA' ? t : onlyDigits(t).slice(0, 11))}
          keyboardType={tipo === 'VISTORIA' ? 'default' : 'number-pad'}
          maxLength={tipo === 'VISTORIA' ? 40 : 11}
          hint={tipo === 'VISTORIA' ? undefined : '11 dígitos'}
          error={errors.numero || undefined}
          editable={!saving}
        />
        {tipo === 'CNH' && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>Categoria</Text>
            <ChoiceChips
              options={CATEGORIAS_CNH.map((c) => ({ value: c, label: c }))}
              value={form.categoria as (typeof CATEGORIAS_CNH)[number]}
              onChange={(v) => setField('categoria', v)}
              accessibilityLabel="Categoria da CNH"
            />
            {!['D', 'E', 'AD', 'AE'].includes(form.categoria) && (
              <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Para transporte escolar normalmente é exigida a categoria D.
              </Text>
            )}
          </View>
        )}
        {tipo === 'VISTORIA' && (
          <TextField
            label="Data da vistoria"
            value={form.dataRealizacao}
            onChangeText={(t) => setField('dataRealizacao', maskDate(t))}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            error={errors.dataRealizacao || undefined}
            editable={!saving}
          />
        )}
        <TextField
          label="Validade"
          value={form.dataValidade}
          onChangeText={(t) => setField('dataValidade', maskDate(t))}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          error={errors.dataValidade || undefined}
          editable={!saving}
        />
        {vencido && (
          <Notice tone="warning">Esta data já passou. Documento vencido não pode ser aprovado.</Notice>
        )}
        <View style={styles.actions}>
          <Button label="Enviar para análise" icon="send" onPress={submit} loading={saving} fullWidth />
          <Button label="Cancelar" variant="tertiary" onPress={() => setEditing(null)} disabled={saving} fullWidth />
        </View>
      </View>
    );
  };

  const renderDocumento = (tipo: TipoDocumento) => {
    const doc = vigentes[tipo];
    const info = doc ? statusInfo('documento', doc.status) : { label: 'Não enviado', tone: 'danger' as const };
    const precisaVeiculo = tipo !== 'CNH' && !hasVehicle;
    const historico = documentos
      .filter((d) => d.tipo === tipo)
      .sort((a, b) => new Date(b.submetidoEm).getTime() - new Date(a.submetidoEm).getTime());
    const actionLabel = !doc
      ? 'Enviar'
      : doc.status === 'RECUSADO'
        ? 'Enviar correção'
        : doc.status === 'VENCIDO'
          ? 'Atualizar'
          : 'Enviar nova versão';

    return (
      <Card key={tipo} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconSlot}>
            <Feather name={ICONE[tipo]} size={layout.icon} color={colors.ink} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{TIPO_DOCUMENTO_LABEL[tipo]}</Text>
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>{DESCRICAO[tipo]}</Text>
          </View>
          <Chip label={info.label} tone={info.tone} size="sm" />
        </View>

        {doc && (
          <View style={styles.details}>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Número: {tipo === 'VISTORIA' ? doc.numero : maskDocument(doc.numero)}
              {doc.categoria ? ` · Categoria ${doc.categoria}` : ''}
            </Text>
            {doc.dataRealizacao && (
              <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Realizada em {formatDate(doc.dataRealizacao)}
              </Text>
            )}
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Válido até {formatDate(doc.dataValidade)} · enviado em {formatDateTime(doc.submetidoEm)}
            </Text>
          </View>
        )}

        {doc?.status === 'RECUSADO' && (
          <Notice tone="danger" title="Documento recusado">
            {doc.motivoRecusa || 'O revisor não informou o motivo. Confira os dados e envie novamente.'}
          </Notice>
        )}
        {doc?.status === 'VENCIDO' && <Notice tone="danger">Documento vencido. Atualize para poder iniciar viagens.</Notice>}
        {precisaVeiculo && <Notice tone="info">Cadastre o veículo antes de enviar este documento.</Notice>}

        {editing === tipo ? (
          renderForm(tipo)
        ) : (
          <View style={styles.actions}>
            {precisaVeiculo ? (
              <Button label="Cadastrar veículo" icon="truck" variant="secondary" size="md" onPress={() => navigation.navigate('DriverVehicle')} fullWidth />
            ) : (
              <Button
                label={actionLabel}
                icon={doc ? 'refresh-cw' : 'upload'}
                variant={!doc || doc.status === 'RECUSADO' || doc.status === 'VENCIDO' ? 'primary' : 'secondary'}
                size="md"
                onPress={() => openForm(tipo)}
                disabled={!!editing}
                fullWidth
              />
            )}
            {historico.length > 1 && (
              <Button
                label={historyOpen === tipo ? 'Ocultar histórico' : `Ver histórico (${historico.length})`}
                variant="tertiary"
                size="md"
                onPress={() => setHistoryOpen(historyOpen === tipo ? null : tipo)}
                fullWidth
              />
            )}
          </View>
        )}

        {historyOpen === tipo && (
          <Timeline
            items={historico.map((d) => {
              const s = statusInfo('documento', d.status);
              return {
                key: d.id,
                title: `${s.label} · válido até ${formatDate(d.dataValidade)}`,
                caption: `Enviado em ${formatDateTime(d.submetidoEm)}${d.revisadoEm ? ` · revisado em ${formatDateTime(d.revisadoEm)}` : ''}`,
                detail: d.motivoRecusa,
                tone: s.tone,
              };
            })}
          />
        )}
      </Card>
    );
  };

  const body = loading ? (
    <StateView kind="loading" title="Carregando documentos..." />
  ) : error ? (
    <StateView kind="error" title="Não foi possível carregar" message={error} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
  ) : (
    <>
      <Notice tone="info">
        A análise confere os dados informados; ela não comprova, por si só, a autenticidade do documento. CNH, vistoria e
        licenciamento aprovados e dentro da validade são obrigatórios para iniciar viagens.
      </Notice>
      {TIPOS_DOCUMENTO.map(renderDocumento)}
    </>
  );

  return (
    <DriverLayout>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <ScreenHeader title="Documentos" subtitle="Habilitação e documentos do veículo" onBack={() => navigation.goBack()} />
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconSlot: { width: layout.iconSlot, height: layout.iconSlot, borderRadius: radius.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.heading, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  body: { ...typography.body, color: colors.ink },
  details: { gap: spacing.xs },
  form: { gap: spacing.lg, marginTop: spacing.sm },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.label, color: colors.ink },
  hint: { ...typography.caption, color: colors.slate700 },
  actions: { gap: layout.buttonGap },
});
