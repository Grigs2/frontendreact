import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AdminLayout from '../components/AdminLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import ReasonDialog from '../components/ReasonDialog';
import { InfoLine, Notice } from '../components/Feedback';
import { Button, Card, Chip, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { adminService } from '../services/adminService';
import { DocumentoMotoristaDTO } from '../types';
import { TIPO_DOCUMENTO_LABEL } from '../utils/statusLabels';
import { formatDate, formatDateTime } from '../utils/format';
import { isExpired } from '../utils/validators';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDocuments'>;

/** 10.4.2/10.4.5 — revisão dos documentos dos motoristas (aprovar ou recusar com motivo). */
export default function AdminDocumentsScreen({ navigation }: Props) {
  const { showToast } = useAppContext();
  const [docs, setDocs] = useState<DocumentoMotoristaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aprovar, setAprovar] = useState<DocumentoMotoristaDTO | null>(null);
  const [recusar, setRecusar] = useState<DocumentoMotoristaDTO | null>(null);
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    try {
      setErro(null);
      setDocs(await adminService.documentosPendentes());
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

  const revisar = async (doc: DocumentoMotoristaDTO, status: 'APROVADO' | 'RECUSADO', motivo?: string) => {
    setSalvando(true);
    try {
      await adminService.revisarDocumento(doc.id, status, motivo);
      showToast(status === 'APROVADO' ? 'Documento aprovado.' : 'Documento recusado.', 'success');
      setAprovar(null);
      setRecusar(null);
      setDocs((l) => l.filter((d) => d.id !== doc.id));
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível revisar. Nada foi alterado.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminLayout>
      {loading ? (
        <StateView kind="loading" title="Carregando documentos..." />
      ) : erro ? (
        <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => String(d.id)}
          style={styles.list}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: layout.cardGap }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenHeader title="Documentos" subtitle="Fila de revisão" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
              <Notice tone="info">
                Confira os dados informados. A aprovação não comprova a autenticidade do documento; documentos vencidos não
                podem ser aprovados.
              </Notice>
            </View>
          }
          ListEmptyComponent={<StateView kind="empty" icon="check-circle" title="Nenhum documento pendente" message="Novos envios aparecem aqui." />}
          renderItem={({ item }) => {
            const vencido = isExpired(item.dataValidade);
            return (
              <Card style={styles.card}>
                <View style={styles.top}>
                  <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>{TIPO_DOCUMENTO_LABEL[item.tipo]}</Text>
                  <Chip label={vencido ? 'Vencido' : 'Em análise'} tone={vencido ? 'danger' : 'warning'} size="sm" />
                </View>
                <InfoLine label="Número" value={item.numero} />
                <InfoLine label="Categoria" value={item.categoria} />
                <InfoLine label="Realização" value={item.dataRealizacao ? formatDate(item.dataRealizacao) : null} />
                <InfoLine label="Validade" value={formatDate(item.dataValidade)} />
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  Documento #{item.id} · enviado em {formatDateTime(item.submetidoEm)}
                </Text>
                <View style={styles.actions}>
                  <Button label="Recusar" variant="secondary" size="md" onPress={() => setRecusar(item)} style={styles.flex} />
                  <Button label="Aprovar" icon="check" size="md" onPress={() => setAprovar(item)} disabled={vencido} style={styles.flex} />
                </View>
              </Card>
            );
          }}
        />
      )}

      <ConfirmDialog
        visible={!!aprovar}
        title="Aprovar documento?"
        message={aprovar ? `${TIPO_DOCUMENTO_LABEL[aprovar.tipo]} nº ${aprovar.numero}, válido até ${formatDate(aprovar.dataValidade)}.` : ''}
        confirmLabel="Aprovar"
        destructive={false}
        loading={salvando}
        onConfirm={() => aprovar && revisar(aprovar, 'APROVADO')}
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
        onConfirm={(motivo) => recusar && revisar(recusar, 'RECUSADO', motivo)}
        onCancel={() => setRecusar(null)}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { width: '100%', maxWidth: 1000, alignSelf: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: colors.ink },
  caption: { ...typography.caption, color: colors.slate500 },
  actions: { flexDirection: 'row', gap: layout.buttonGap, marginTop: spacing.sm },
});
