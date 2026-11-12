import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DriverLayout from '../components/DriverLayout';
import SchoolLayout from '../components/SchoolLayout';
import VinculoEscolaCard from '../components/VinculoEscolaCard';
import ReasonDialog from '../components/ReasonDialog';
import Timeline from '../components/Timeline';
import { Notice } from '../components/Feedback';
import { SectionTitle } from '../components/HomeBlocks';
import { Button, Card, ScreenHeader, StateView } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { MOTIVO_VINCULO_MAX, vinculoEscolaService } from '../services/vinculoEscolaService';
import { HistoricoVinculoEscolaDTO, VinculoEscolaDTO } from '../types';
import { PERFIL_LABEL, statusInfo } from '../utils/statusLabels';
import { formatDateTime } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverSchoolLinkDetail' | 'SchoolDriverLinkDetail'>;

type Acao = 'Aceitar' | 'Aprovar' | 'Recusar' | 'Suspender' | 'Reativar' | 'Encerrar';

interface AcaoConfig {
  acao: Acao;
  label: string;
  variant: 'primary' | 'secondary' | 'destructive';
  motivoObrigatorio: boolean;
  titulo: string;
  mensagem: string;
}

/**
 * Detalhe do vínculo motorista–escola (2.4.4–2.4.9, 4.3.2–4.3.10, 4.4.6).
 * Motivo obrigatório ao recusar, suspender e encerrar; opcional ao aprovar, aceitar e reativar.
 */
export default function SchoolLinkDetailScreen({ navigation, route }: Props) {
  const { showToast } = useAppContext();
  const perspectiva = route.name === 'SchoolDriverLinkDetail' ? 'escola' : 'motorista';
  const [vinculo, setVinculo] = useState<VinculoEscolaDTO>(route.params.vinculo);
  const [historico, setHistorico] = useState<HistoricoVinculoEscolaDTO[] | null>(null);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [acaoAtiva, setAcaoAtiva] = useState<AcaoConfig | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregarHistorico = useCallback(async () => {
    try {
      setErroHistorico(null);
      const dados =
        perspectiva === 'escola'
          ? await vinculoEscolaService.historicoEscola(vinculo.id)
          : await vinculoEscolaService.historicoMotorista(vinculo.id);
      setHistorico([...dados].sort((a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime()));
    } catch (e) {
      setErroHistorico(getApiErrorMessage(e, 'Não foi possível carregar o histórico.'));
    }
  }, [perspectiva, vinculo.id]);

  useFocusEffect(
    useCallback(() => {
      carregarHistorico();
    }, [carregarHistorico]),
  );

  const outro = perspectiva === 'motorista' ? 'a escola' : 'o motorista';
  const acoes: AcaoConfig[] = [];
  const s = vinculo.status;
  if (perspectiva === 'motorista') {
    if (s === 'PENDENTE_MOTORISTA') {
      acoes.push(
        { acao: 'Aceitar', label: 'Aceitar convite', variant: 'primary', motivoObrigatorio: false, titulo: 'Aceitar convite da escola?', mensagem: 'Você passará a atender esta escola.' },
        { acao: 'Recusar', label: 'Recusar convite', variant: 'secondary', motivoObrigatorio: true, titulo: 'Recusar convite?', mensagem: 'Informe o motivo. A escola poderá enviar um novo convite depois.' },
      );
    }
    if (s === 'ATIVO' || s === 'SUSPENSO') {
      acoes.push({ acao: 'Encerrar', label: 'Encerrar vínculo', variant: 'destructive', motivoObrigatorio: true, titulo: 'Encerrar vínculo?', mensagem: 'O vínculo com a escola será encerrado. Um novo pedido poderá ser feito depois.' });
    }
  } else {
    if (s === 'PENDENTE_ESCOLA') {
      acoes.push(
        { acao: 'Aprovar', label: 'Aprovar motorista', variant: 'primary', motivoObrigatorio: false, titulo: 'Aprovar motorista?', mensagem: 'O motorista passará a atender a escola. O sistema confere se os documentos estão aprovados.' },
        { acao: 'Recusar', label: 'Recusar solicitação', variant: 'secondary', motivoObrigatorio: true, titulo: 'Recusar solicitação?', mensagem: 'Informe o motivo da recusa. O motorista poderá pedir novamente.' },
      );
    }
    if (s === 'ATIVO') {
      acoes.push({ acao: 'Suspender', label: 'Suspender vínculo', variant: 'secondary', motivoObrigatorio: true, titulo: 'Suspender vínculo?', mensagem: 'O vínculo fica suspenso até ser reativado ou encerrado.' });
    }
    if (s === 'SUSPENSO') {
      acoes.push({ acao: 'Reativar', label: 'Reativar vínculo', variant: 'primary', motivoObrigatorio: false, titulo: 'Reativar vínculo?', mensagem: 'O motorista volta a atender a escola.' });
    }
    if (s === 'ATIVO' || s === 'SUSPENSO') {
      acoes.push({ acao: 'Encerrar', label: 'Encerrar vínculo', variant: 'destructive', motivoObrigatorio: true, titulo: 'Encerrar vínculo?', mensagem: 'O vínculo será encerrado. Um novo ciclo poderá ser iniciado depois.' });
    }
  }

  const executar = async (motivo: string) => {
    if (!acaoAtiva) return;
    setSalvando(true);
    try {
      let atualizado: VinculoEscolaDTO;
      if (perspectiva === 'motorista') {
        atualizado =
          acaoAtiva.acao === 'Aceitar'
            ? await vinculoEscolaService.aceitar(vinculo.id, motivo)
            : acaoAtiva.acao === 'Recusar'
              ? await vinculoEscolaService.recusarMotorista(vinculo.id, motivo)
              : await vinculoEscolaService.encerrarMotorista(vinculo.id, motivo);
      } else {
        atualizado = await vinculoEscolaService.acaoEscola(
          vinculo.id,
          acaoAtiva.acao as 'Aprovar' | 'Recusar' | 'Suspender' | 'Reativar' | 'Encerrar',
          motivo,
        );
      }
      setVinculo(atualizado);
      showToast(`Vínculo ${statusInfo('vinculoEscola', atualizado.status).label.toLowerCase()}.`, 'success');
      setAcaoAtiva(null);
      carregarHistorico();
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível concluir a ação. Nada foi alterado.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const aguardando =
    (perspectiva === 'motorista' && s === 'PENDENTE_ESCOLA') || (perspectiva === 'escola' && s === 'PENDENTE_MOTORISTA');

  const content = (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        title={perspectiva === 'motorista' ? 'Vínculo com a escola' : 'Vínculo com o motorista'}
        onBack={() => navigation.goBack()}
      />
      <VinculoEscolaCard vinculo={vinculo} perspectiva={perspectiva} />

      {aguardando && <Notice tone="info">{`Aguardando a resposta ${outro === 'a escola' ? 'da escola' : 'do motorista'}.`}</Notice>}
      {s === 'SUSPENSO' && <Notice tone="danger">Vínculo suspenso pela escola.</Notice>}
      {perspectiva === 'escola' && s === 'PENDENTE_ESCOLA' && (
        <Notice tone="info">
          A aprovação só é aceita se o motorista tiver veículo cadastrado e CNH, vistoria e licenciamento aprovados. Se
          houver pendência, o motivo aparece ao tentar aprovar.
        </Notice>
      )}

      {acoes.length > 0 && (
        <View style={styles.actions}>
          {acoes.map((a) => (
            <Button key={a.acao} label={a.label} variant={a.variant} onPress={() => setAcaoAtiva(a)} fullWidth />
          ))}
        </View>
      )}

      <SectionTitle>Histórico</SectionTitle>
      <Card>
        {erroHistorico ? (
          <StateView kind="error" message={erroHistorico} actionLabel="Tentar novamente" onAction={carregarHistorico} />
        ) : historico === null ? (
          <StateView kind="loading" />
        ) : (
          <Timeline
            items={historico.map((h) => {
              const info = statusInfo('vinculoEscola', h.statusNovo);
              return {
                key: h.id,
                title: info.label,
                caption: `${PERFIL_LABEL[h.perfilAtor] ?? h.perfilAtor} · ${formatDateTime(h.ocorridoEm)}`,
                detail: h.motivo,
                tone: info.tone,
              };
            })}
          />
        )}
      </Card>
      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        Todas as mudanças ficam registradas com autor, data e motivo.
      </Text>

      <ReasonDialog
        visible={!!acaoAtiva}
        title={acaoAtiva?.titulo ?? ''}
        message={acaoAtiva?.mensagem}
        confirmLabel={acaoAtiva?.label ?? 'Confirmar'}
        required={acaoAtiva?.motivoObrigatorio}
        maxLength={MOTIVO_VINCULO_MAX}
        destructive={acaoAtiva?.variant !== 'primary'}
        loading={salvando}
        onConfirm={executar}
        onCancel={() => setAcaoAtiva(null)}
      />
    </ScrollView>
  );

  return perspectiva === 'escola' ? <SchoolLayout>{content}</SchoolLayout> : <DriverLayout>{content}</DriverLayout>;
}

const styles = StyleSheet.create({
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 800, alignSelf: 'center', gap: spacing.lg },
  actions: { gap: layout.buttonGap },
  caption: { ...typography.caption, color: colors.slate500 },
});
