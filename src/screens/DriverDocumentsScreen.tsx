import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import ChoiceChips from '../components/ChoiceChips';
import Timeline from '../components/Timeline';
import ImagemDocumentoModal, { FonteImagem } from '../components/ImagemDocumentoModal';
import { Notice } from '../components/Feedback';
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import {
  LADOS_DOCUMENTO,
  LADO_LABEL,
  LIMITE_IMAGEM_BYTES,
  TIPOS_DOCUMENTO,
  TIPOS_IMAGEM_ACEITOS,
  documentoService,
  documentosVigentes,
  podeEnviarImagens,
} from '../services/documentoService';
import { DocumentoMotoristaDTO, ImagemDocumentoDTO, LadoDocumento, MotoristaDTO, TipoDocumento } from '../types';

import { brToIsoDate, isoToBrDate, maskCNH, maskDate, onlyDigits } from '../utils/masks';
import {
  isExpired,
  validateCNH,
  validateExpiryDate,
  validatePastDate,
  validateRenavam,
  cnhDigitosConferem,
  renavamDigitoConfere,
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

/** Imagens enviadas por documento vigente (uma chamada por documento). */
const buscarImagensVigentes = async (idMotorista: number, lista: DocumentoMotoristaDTO[]) => {
  const vigentes = Object.values(documentosVigentes(lista)).filter((d): d is DocumentoMotoristaDTO => !!d);
  const pares = await Promise.all(
    vigentes.map(async (d) => [d.id, await documentoService.listarImagens(idMotorista, d.id).catch(() => [])] as const),
  );
  return Object.fromEntries(pares) as Record<number, ImagemDocumentoDTO[]>;
};

type OrigemImagem = 'camera' | 'galeria';

const escolherOrigem = () =>
  new Promise<OrigemImagem | null>((resolve) =>
    Alert.alert(
      'Enviar imagem',
      'De onde deseja pegar a foto?',
      [
        { text: 'Tirar foto', onPress: () => resolve('camera') },
        { text: 'Galeria', onPress: () => resolve('galeria') },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    ),
  );

/** Abre câmera ou galeria. Retorna null se o usuário cancelar; lança erro se a permissão for negada. */
const capturarImagem = async (origem: OrigemImagem): Promise<ImagePicker.ImagePickerAsset | null> => {
  const permissao =
    origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new Error(
      origem === 'camera' ? 'Permita o acesso à câmera para tirar a foto.' : 'Permita o acesso às fotos para escolher a imagem.',
    );
  }
  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  const resultado =
    origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
  return resultado.canceled ? null : resultado.assets[0];
};

const tipoImagem = (asset: ImagePicker.ImagePickerAsset) => {
  if (asset.mimeType) return asset.mimeType;
  return asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
};

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
  const [imagens, setImagens] = useState<Record<number, ImagemDocumentoDTO[]>>({});
  const [enviandoLado, setEnviandoLado] = useState<string | null>(null);
  const [visualizacao, setVisualizacao] = useState<{ titulo: string; fonte: FonteImagem } | null>(null);

  const load = useCallback(async () => {
    if (!driver?.id) return;
    try {
      setError(null);
      const lista = await documentoService.listar(driver.id);
      setDocumentos(lista);
      setImagens(await buscarImagensVigentes(driver.id, lista));
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
      showToast('Documento enviado. Agora envie as imagens dele para a revisão poder aprovar.', 'success');
      setEditing(null);
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível enviar o documento.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const enviarImagemLado = async (doc: DocumentoMotoristaDTO, lado: LadoDocumento) => {
    if (!driver?.id) return;
    let asset: ImagePicker.ImagePickerAsset | null;
    try {
      const origem = await escolherOrigem();
      if (!origem) return;
      asset = await capturarImagem(origem);
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível abrir a câmera ou a galeria.'), 'error');
      return;
    }
    if (!asset) return;

    const type = tipoImagem(asset);
    if (!TIPOS_IMAGEM_ACEITOS.includes(type)) {
      showToast('Envie uma imagem JPEG ou PNG.', 'error');
      return;
    }
    if (asset.fileSize && asset.fileSize > LIMITE_IMAGEM_BYTES) {
      showToast('A imagem passa de 1 MB. Escolha outra foto.', 'error');
      return;
    }

    setEnviandoLado(`${doc.id}-${lado}`);
    try {
      await documentoService.enviarImagem(driver.id, doc.id, lado, {
        uri: asset.uri,
        name: asset.fileName ?? `${lado.toLowerCase()}.${type === 'image/png' ? 'png' : 'jpg'}`,
        type,
      });
      showToast(`${LADO_LABEL[lado]} enviada.`, 'success');
      setImagens(await buscarImagensVigentes(driver.id, documentos));
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível enviar a imagem.'), 'error');
    } finally {
      setEnviandoLado(null);
    }
  };

  const abrirImagem = async (doc: DocumentoMotoristaDTO, lado: LadoDocumento) => {
    if (!driver?.id) return;
    try {
      const fonte = await documentoService.fonteImagem(driver.id, doc.id, lado);
      setVisualizacao({ titulo: `${TIPO_DOCUMENTO_LABEL[doc.tipo]} · ${LADO_LABEL[lado]}`, fonte });
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível abrir a imagem.'), 'error');
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
          hint={
            tipo === 'VISTORIA'
              ? undefined
              : onlyDigits(form.numero).length === 11 &&
                  !(tipo === 'CNH' ? cnhDigitosConferem(form.numero) : renavamDigitoConfere(form.numero))
                ? 'Os dígitos finais não conferem: confira o número no documento.'
                : '11 dígitos'
          }
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

        {doc && (
          <View style={styles.details}>
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>Imagens do documento</Text>
            {LADOS_DOCUMENTO[tipo].map((lado) => {
              const enviada = (imagens[doc.id] ?? []).some((i) => i.lado === lado);
              const chave = `${doc.id}-${lado}`;
              return (
                <View key={lado} style={styles.ladoRow}>
                  <View style={styles.flex}>
                    <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>{LADO_LABEL[lado]}</Text>
                    <Chip label={enviada ? 'Enviada' : 'Não enviada'} tone={enviada ? 'success' : 'warning'} size="sm" />
                  </View>
                  {enviada && (
                    <Button label="Ver" variant="tertiary" size="md" onPress={() => abrirImagem(doc, lado)} disabled={!!enviandoLado} />
                  )}
                  {podeEnviarImagens(doc) && (
                    <Button
                      label={enviada ? 'Trocar' : 'Enviar'}
                      icon="camera"
                      variant={enviada ? 'secondary' : 'primary'}
                      size="md"
                      loading={enviandoLado === chave}
                      disabled={!!enviandoLado}
                      onPress={() => enviarImagemLado(doc, lado)}
                    />
                  )}
                </View>
              );
            })}
            {podeEnviarImagens(doc) && (
              <Notice tone="info">
                {`Envie ${LADOS_DOCUMENTO[tipo].map((l) => LADO_LABEL[l].toLowerCase()).join(' e ')}. Formatos JPEG ou PNG, até 1 MB cada.`}
              </Notice>
            )}
          </View>
        )}

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
      <ImagemDocumentoModal
        visible={!!visualizacao}
        title={visualizacao?.titulo ?? ''}
        fonte={visualizacao?.fonte ?? null}
        onClose={() => setVisualizacao(null)}
      />
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
  ladoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
