import React, { useCallback, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import RoleLayout from '../components/RoleLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { TermsModal } from '../components/forms';
import { Card, Chip, ListRow, ScreenHeader } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/authService';
import { localizacaoService, RETENCAO_GPS_DIAS } from '../services/localizacaoService';
import { TERMOS_PDF_URL } from '../services/config';
import { getApiErrorMessage, getApiStatus } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;
type Permissao = 'granted' | 'denied' | 'undetermined' | 'indisponivel';

const PERMISSAO: Record<Permissao, { label: string; tone: 'success' | 'danger' | 'neutral' | 'warning' }> = {
  granted: { label: 'Permitido', tone: 'success' },
  denied: { label: 'Negado', tone: 'danger' },
  undetermined: { label: 'Não solicitado', tone: 'neutral' },
  indisponivel: { label: 'Indisponível no navegador', tone: 'neutral' },
};

/** 11.2 e 11.3 — permissões, privacidade, consentimento de localização e ajuda. */
export default function SettingsScreen({ navigation }: Props) {
  const { userRole, showToast } = useAppContext();
  const [notif, setNotif] = useState<Permissao>('undetermined');
  const [local, setLocal] = useState<Permissao>('undetermined');
  const [versao, setVersao] = useState<string | null>(null);
  const [termos, setTermos] = useState(false);
  const [gps, setGps] = useState<boolean | null>(null);
  const [gpsConfirm, setGpsConfirm] = useState<boolean | null>(null);
  const [salvando, setSalvando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') {
        setNotif('indisponivel');
      } else {
        Notifications.getPermissionsAsync().then((p) => setNotif(p.status as Permissao)).catch(() => undefined);
      }
      if (userRole === 'MOTORISTA') {
        Location.getForegroundPermissionsAsync().then((p) => setLocal(p.status as Permissao)).catch(() => setLocal('indisponivel'));
      }
      authService.termosVigente().then((t) => setVersao(t.versao)).catch(() => undefined);
    }, [userRole]),
  );

  const abrirConfiguracoes = () => Linking.openSettings().catch(() => showToast('Abra as configurações do aparelho manualmente.', 'info'));

  const salvarGps = async (aceito: boolean) => {
    setSalvando(true);
    try {
      const r = await localizacaoService.consentirMotorista(aceito);
      setGps(r.aceito);
      showToast(aceito ? 'Envio de localização autorizado.' : 'Envio de localização revogado.', 'success');
      setGpsConfirm(null);
    } catch (e) {
      showToast(
        getApiStatus(e) === 503 ? 'A localização está desativada no servidor no momento.' : getApiErrorMessage(e, 'Não foi possível salvar.'),
        'error',
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <RoleLayout>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Configurações" subtitle="Permissões, privacidade e ajuda" onBack={() => navigation.goBack()} />

        <SectionTitle>Permissões do aplicativo</SectionTitle>
        <Card style={styles.card}>
          <ListRow
            icon="bell"
            title="Notificações no aparelho"
            caption="Avisos de embarque, desembarque, atrasos e vínculos"
            right={<Chip label={PERMISSAO[notif].label} tone={PERMISSAO[notif].tone} size="sm" />}
          />
          {userRole === 'MOTORISTA' && (
            <ListRow
              icon="navigation"
              title="Localização"
              caption="Usada só com a viagem em andamento"
              divider
              right={<Chip label={PERMISSAO[local].label} tone={PERMISSAO[local].tone} size="sm" />}
            />
          )}
          {Platform.OS !== 'web' && (
            <ListRow icon="settings" title="Abrir configurações do aparelho" divider onPress={abrirConfiguracoes} />
          )}
          <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            As preferências por tipo de aviso ainda não estão disponíveis; o aparelho controla se as notificações aparecem.
          </Text>
        </Card>

        {userRole === 'MOTORISTA' && (
          <>
            <SectionTitle>Compartilhar localização</SectionTitle>
            <Card style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Enviar minha posição durante as viagens</Text>
                  <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    A cada 15 segundos, só com a viagem em andamento. Os responsáveis dos alunos acompanham pelo mapa.
                  </Text>
                </View>
                <Switch
                  value={!!gps}
                  onValueChange={(v) => setGpsConfirm(v)}
                  disabled={salvando}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                  accessibilityLabel="Enviar minha posição durante as viagens"
                />
              </View>
              {gps === null && (
                <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  A situação atual aparece na tela de cada viagem. Use a chave para autorizar ou revogar.
                </Text>
              )}
            </Card>
          </>
        )}

        <SectionTitle>Privacidade</SectionTitle>
        <Card style={styles.card}>
          <ListRow icon="file-text" title="Termos de Uso e Política de Privacidade" caption={versao ? `Versão vigente: ${versao}` : undefined} onPress={() => setTermos(true)} />
          <ListRow icon="download" title="Baixar PDF dos termos" divider onPress={() => Linking.openURL(TERMOS_PDF_URL)} />
          <View style={styles.retention}>
            <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Por quanto tempo guardamos</Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>• Posições do GPS: {RETENCAO_GPS_DIAS} dias, depois são apagadas.</Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>• Notificações: 90 dias.</Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>• Registros de embarque e desembarque: mantidos no histórico das viagens.</Text>
            <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              • A localização só é vista pelo motorista e pelos responsáveis dos alunos da viagem.
            </Text>
          </View>
        </Card>

        <SectionTitle>Seus dados e ajuda</SectionTitle>
        <Notice tone="info" title="Correção de dados ou encerramento da conta">
          Os dados que você pode alterar estão no Perfil. Para corrigir um dado bloqueado (como CPF ou CNPJ) ou pedir o
          encerramento da conta, fale com o suporte da sua escola ou com o administrador do Tio da Perua. Essa solicitação
          ainda não pode ser feita pelo aplicativo.
        </Notice>
        <Card style={styles.card}>
          <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>Dúvidas frequentes</Text>
          <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            • Sem internet, o motorista continua registrando embarque, desembarque e ausência; os registros são enviados
            quando a conexão voltar.
          </Text>
          <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            • A posição no mapa não confirma embarque: o embarque é sempre confirmado pelo motorista.
          </Text>
          <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            • Se uma ação não for concluída, nada é alterado. Tente novamente quando a conexão estiver estável.
          </Text>
        </Card>
      </ScrollView>

      <TermsModal visible={termos} onClose={() => setTermos(false)} />
      <ConfirmDialog
        visible={gpsConfirm !== null}
        title={gpsConfirm ? 'Autorizar envio da localização?' : 'Revogar envio da localização?'}
        message={
          gpsConfirm
            ? 'Sua posição será enviada durante as viagens e guardada por 7 dias.'
            : 'O GPS deixa de ser enviado nas suas viagens. O registro de presença continua funcionando.'
        }
        confirmLabel={gpsConfirm ? 'Autorizar' : 'Revogar'}
        destructive={!gpsConfirm}
        loading={salvando}
        onConfirm={() => salvarGps(!!gpsConfirm)}
        onCancel={() => setGpsConfirm(null)}
      />
    </RoleLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center', gap: spacing.lg },
  card: { gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { ...typography.label, color: colors.ink },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
  retention: { gap: spacing.xs, marginTop: spacing.sm },
});
