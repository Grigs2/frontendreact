import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import AdminLayout from '../components/AdminLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import ReasonDialog from '../components/ReasonDialog';
import ImagemDocumentoModal, { FonteImagem } from '../components/ImagemDocumentoModal';
import { InfoLine, Notice } from '../components/Feedback';
import { Button, Card, Chip, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { adminService } from '../services/adminService';
import { LADOS_DOCUMENTO, LADO_LABEL } from '../services/documentoService';
import { ConferenciaDocumentoDTO, DocumentoMotoristaDTO, DocumentoRevisaoDTO, LadoDocumento } from '../types';

import { TIPO_DOCUMENTO_LABEL } from '../utils/statusLabels';
import { formatDate, formatDateTime } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDocuments'>;

/** Documentos pendentes de um mesmo motorista, revisados juntos. */
interface GrupoMotorista {
  chave: string;
  nome: string;
  idade?: number | null;
  veiculo?: string | null;
  itens: DocumentoRevisaoDTO[];
}

const ICONE: Record<ConferenciaDocumentoDTO['situacao'], { nome: 'check-circle' | 'alert-triangle' | 'x-circle'; cor: string }> = {
  OK: { nome: 'check-circle', cor: colors.success },
  ATENCAO: { nome: 'alert-triangle', cor: colors.primaryPressed },
  ERRO: { nome: 'x-circle', cor: colors.danger },
};

const avisos = (item: DocumentoRevisaoDTO) => item.conferencias.filter((c) => c.situacao !== 'OK').length;

/**
 * 10.4.2/10.4.5 — revisão dos documentos dos motoristas.
 * Agrupa por motorista e mostra conferências automáticas (dígitos da CNH e do RENAVAM, categoria, idade, vistoria
 * semestral e validade). Documento vencido não pode ser aprovado; os demais avisos são para o administrador conferir.
 */
export default function AdminDocumentsScreen({ navigation }: Props) {
  const { showToast } = useAppContext();
  const [itens, setItens] = useState<DocumentoRevisaoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aprovar, setAprovar] = useState<DocumentoRevisaoDTO[] | null>(null);
  const [recusar, setRecusar] = useState<DocumentoMotoristaDTO | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [visualizacao, setVisualizacao] = useState<{ titulo: string; fonte: FonteImagem } | null>(null);

  const load = useCallback(async () => {
    try {
      setErro(null);
      setItens(await adminService.documentosParaRevisao());
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os documentos.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const grupos = useMemo<GrupoMotorista[]>(() => {
    const mapa = new Map<string, GrupoMotorista>();
    for (const item of itens) {
      const chave = String(item.motoristaId ?? `doc-${item.documento.id}`);
      const grupo = mapa.get(chave) ?? {
        chave,
        nome: item.motoristaNome ?? 'Motorista',
        idade: item.motoristaIdade,
        veiculo: [item.veiculoModelo, item.veiculoPlaca].filter(Boolean).join(' · ') || null,
        itens: [],
      };
      if (!grupo.veiculo && item.veiculoPlaca) grupo.veiculo = [item.veiculoModelo, item.veiculoPlaca].filter(Boolean).join(' · ');
      grupo.itens.push(item);
      mapa.set(chave, grupo);
    }
    return Array.from(mapa.values());
  }, [itens]);

  const aprovarDocumentos = async (lista: DocumentoRevisaoDTO[]) => {
    setSalvando(true);
    let aprovados = 0;
    try {
      for (const item of lista) {
        await adminService.revisarDocumento(item.documento.id, 'APROVADO');
        aprovados++;
      }
      showToast(aprovados === 1 ? 'Documento aprovado.' : `${aprovados} documentos aprovados.`, 'success');
    } catch (e) {
      showToast(
        getApiErrorMessage(e, aprovados ? `${aprovados} aprovado(s); o restante não foi alterado.` : 'Não foi possível aprovar. Nada foi alterado.'),
        'error',
      );
    } finally {
      setSalvando(false);
      setAprovar(null);
      load();
    }
  };

  const recusarDocumento = async (doc: DocumentoMotoristaDTO, motivo?: string) => {
    setSalvando(true);
    try {
      await adminService.revisarDocumento(doc.id, 'RECUSADO', motivo);
      showToast('Documento recusado. O motorista verá o motivo.', 'success');
      setRecusar(null);
      setItens((l) => l.filter((i) => i.documento.id !== doc.id));
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível recusar. Nada foi alterado.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const mensagemAprovar = (lista: DocumentoRevisaoDTO[]) => {
    const nomes = lista.map((i) => TIPO_DOCUMENTO_LABEL[i.documento.tipo]).join(', ');
    const totalAvisos = lista.reduce((s, i) => s + avisos(i), 0);
    return `${nomes}.${totalAvisos ? ` Atenção: ${totalAvisos} ponto(s) para conferir no documento antes de aprovar.` : ' Todas as conferências automáticas estão ok.'}`;
  };

  const abrirImagem = async (item: DocumentoRevisaoDTO, lado: LadoDocumento) => {
    try {
      const fonte = await adminService.fonteImagemDocumento(item.documento.id, lado);
      setVisualizacao({
        titulo: `${item.motoristaNome ?? 'Motorista'} · ${TIPO_DOCUMENTO_LABEL[item.documento.tipo]} · ${LADO_LABEL[lado]}`,
        fonte,
      });
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível abrir a imagem.'), 'error');
    }
  };

  const renderDocumento = (item: DocumentoRevisaoDTO) => {
    const doc = item.documento;
    const pendencias = avisos(item);
    return (
      <View key={doc.id} style={styles.documento}>
        <View style={styles.top}>
          <Text style={styles.docTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>{TIPO_DOCUMENTO_LABEL[doc.tipo]}</Text>
          <Chip
            label={!item.podeAprovar ? 'Não pode aprovar' : pendencias ? `${pendencias} para conferir` : 'Conferido'}
            tone={!item.podeAprovar ? 'danger' : pendencias ? 'warning' : 'success'}
            size="sm"
          />
        </View>
        <InfoLine label={doc.tipo === 'LICENCIAMENTO' ? 'RENAVAM' : 'Número'} value={doc.numero} />
        {!!doc.categoria && <InfoLine label="Categoria" value={doc.categoria} />}
        {!!doc.dataRealizacao && <InfoLine label="Realização" value={formatDate(doc.dataRealizacao)} />}
        <InfoLine label="Validade" value={formatDate(doc.dataValidade)} />

        <View style={styles.conferencias} accessibilityLabel="Conferências automáticas">
          {item.conferencias.map((c) => (
            <View key={`${c.item}-${c.detalhe}`} style={styles.conferencia}>
              <Feather name={ICONE[c.situacao].nome} size={16} color={ICONE[c.situacao].cor} />
              <Text style={styles.conferenciaTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                <Text style={styles.conferenciaItem}>{c.item}: </Text>
                {c.detalhe}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.imagens}>
          <Text style={styles.docTitle} maxFontSizeMultiplier={maxFontSizeMultiplier}>Imagens</Text>
          {LADOS_DOCUMENTO[doc.tipo].map((lado) => {
            const enviada = (item.imagens ?? []).some((i) => i.lado === lado);
            return (
              <View key={lado} style={styles.ladoRow}>
                <Text style={styles.conferenciaTexto} maxFontSizeMultiplier={maxFontSizeMultiplier}>{LADO_LABEL[lado]}</Text>
                <Chip label={enviada ? 'Enviada' : 'Faltando'} tone={enviada ? 'success' : 'danger'} size="sm" />
                {enviada && (
                  <Button label="Ver" variant="tertiary" size="md" onPress={() => abrirImagem(item, lado)} />
                )}
              </View>
            );
          })}
          {LADOS_DOCUMENTO[doc.tipo].some((l) => !(item.imagens ?? []).some((i) => i.lado === l)) && (
            <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              A aprovação exige todas as imagens deste documento.
            </Text>
          )}
        </View>

        <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          Documento #{doc.id} · enviado em {formatDateTime(doc.submetidoEm)}
        </Text>
        <View style={styles.actions}>
          <Button label="Recusar" variant="secondary" size="md" onPress={() => setRecusar(doc)} style={styles.flex} />
          <Button label="Aprovar" icon="check" size="md" onPress={() => setAprovar([item])} disabled={!item.podeAprovar} style={styles.flex} />
        </View>
      </View>
    );
  };

  return (
    <AdminLayout>
      {loading ? (
        <StateView kind="loading" title="Carregando documentos..." />
      ) : erro ? (
        <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(g) => g.chave}
          style={styles.list}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: layout.cardGap }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenHeader
                title="Documentos"
                subtitle={itens.length ? `${itens.length} na fila de revisão` : 'Fila de revisão'}
                onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
              />
              <Notice tone="info">
                As conferências automáticas checam os dígitos da CNH e do RENAVAM, a categoria, a idade, a vistoria
                semestral e a validade. Elas não comprovam a autenticidade: confira com o documento. Documento vencido não
                pode ser aprovado.
              </Notice>
            </View>
          }
          ListEmptyComponent={<StateView kind="empty" icon="check-circle" title="Nenhum documento pendente" message="Novos envios aparecem aqui." />}
          renderItem={({ item: grupo }) => {
            const aprovaveis = grupo.itens.filter((i) => i.podeAprovar);
            return (
              <Card style={styles.card}>
                <View style={styles.motorista}>
                  <View style={styles.avatar}>
                    <Feather name="user" size={20} color={colors.ink} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{grupo.nome}</Text>
                    <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {[grupo.idade != null ? `${grupo.idade} anos` : null, grupo.veiculo].filter(Boolean).join(' · ') || 'Sem veículo informado'}
                    </Text>
                  </View>
                </View>

                {grupo.itens.map(renderDocumento)}

                {aprovaveis.length > 1 && (
                  <Button
                    label={`Aprovar ${aprovaveis.length} documentos de ${grupo.nome.split(' ')[0]}`}
                    icon="check-circle"
                    onPress={() => setAprovar(aprovaveis)}
                    fullWidth
                  />
                )}
              </Card>
            );
          }}
        />
      )}

      <ConfirmDialog
        visible={!!aprovar}
        title={aprovar && aprovar.length > 1 ? `Aprovar ${aprovar.length} documentos?` : 'Aprovar documento?'}
        message={aprovar ? mensagemAprovar(aprovar) : ''}
        confirmLabel="Aprovar"
        destructive={false}
        loading={salvando}
        onConfirm={() => aprovar && aprovarDocumentos(aprovar)}
        onCancel={() => setAprovar(null)}
      />
      <ReasonDialog
        visible={!!recusar}
        title="Recusar documento?"
        message="O motorista verá o motivo e poderá enviar uma correção."
        confirmLabel="Recusar documento"
        required={false}
        maxLength={1000}
        loading={salvando}
        onConfirm={(motivo) => recusar && recusarDocumento(recusar, motivo)}
        onCancel={() => setRecusar(null)}
      />
      <ImagemDocumentoModal
        visible={!!visualizacao}
        title={visualizacao?.titulo ?? ''}
        fonte={visualizacao?.fonte ?? null}
        onClose={() => setVisualizacao(null)}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  list: { width: '100%', maxWidth: 1000, alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  card: { gap: spacing.md },
  motorista: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documento: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: borders.hairline, borderTopColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: colors.ink },
  docTitle: { ...typography.label, color: colors.ink, flex: 1 },
  conferencias: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.card, backgroundColor: colors.background },
  conferencia: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  conferenciaTexto: { ...typography.caption, color: colors.slate700, flex: 1 },
  conferenciaItem: { ...typography.captionBold, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  actions: { flexDirection: 'row', gap: layout.buttonGap },
  imagens: { gap: spacing.xs },
  ladoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
