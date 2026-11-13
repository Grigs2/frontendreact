import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { Greeting, Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Button, ShortcutCard } from '../components/ui';
import { motoristaService } from '../services/motoristaService';
import { periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { AgendaViagemDTO, DocumentoMotoristaDTO, MotoristaDTO, SolicitacaoDTO, VinculoEscolaDTO, ViagemDTO } from '../types';
import { documentoService, pendenciasDocumentais } from '../services/documentoService';
import { vinculoEscolaService } from '../services/vinculoEscolaService';
import { Card, Chip } from '../components/ui';
import { StyleSheet, Text } from 'react-native';
import { TIPO_DOCUMENTO_LABEL, statusExecucao } from '../utils/statusLabels';
import { formatDayRelative } from '../utils/format';
import { colors, maxFontSizeMultiplier, spacing, typography } from '../theme';
import { maskPlate } from '../utils/masks';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Início do motorista: viagem em andamento (ou próxima), avisos que pedem ação, atalhos e "Iniciar rota". */
export default function DriverMainScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, activeViagemDia, currentStops } = useAppContext();
  const driver = currentUser as MotoristaDTO;
  const hasVehicle = !!driver?.veiculoDTO?.placa;

  const [trips, setTrips] = useState<ViagemDTO[]>([]);
  const [requests, setRequests] = useState<SolicitacaoDTO[]>([]);
  const [agenda, setAgenda] = useState<AgendaViagemDTO[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoMotoristaDTO[] | null>(null);
  const [escolas, setEscolas] = useState<VinculoEscolaDTO[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!driver?.id) return;
      viagemService.listarViagens(driver.id).then(setTrips).catch(() => setTrips([]));
      motoristaService.listarSolicitacoes(driver.id).then(setRequests).catch(() => setRequests([]));
      viagemService.agenda(driver.id).then(setAgenda).catch(() => setAgenda([]));
      documentoService.listar(driver.id).then(setDocumentos).catch(() => setDocumentos(null));
      vinculoEscolaService.listarMotorista().then(setEscolas).catch(() => setEscolas([]));
    }, [driver?.id]),
  );

  const activeTrips = trips.filter((t) => t.ativo);
  const received = requests.filter((s) => s.origem === 'RESPONSAVEL');
  const inRoute = activeViagemDia?.status === 'EM_ANDAMENTO';
  const nextStop = currentStops.find(
    (s) => s.tipoParada !== 'MOTORISTA' && s.listaDependentes.some((d) => d.statusEmbarque === 'ESPERANDO' || d.statusEmbarque === 'EMBARCADO'),
  );

  // Próximas viagens (2.5.1): hoje e amanhã, ainda não encerradas.
  const proximas = agenda
    .filter((a) => !a.status || a.status === 'PLANEJADA' || a.status === 'EM_ANDAMENTO')
    .slice(0, 3);
  const docsPendentes = documentos ? pendenciasDocumentais(documentos) : [];
  const escolasAtivas = escolas.filter((e) => e.status === 'ATIVO').length;
  const convitesEscola = escolas.filter((e) => e.status === 'PENDENTE_MOTORISTA').length;

  const startRoute = () => {
    if (inRoute && activeViagemDia?.id) navigation.navigate('DriverAttendance', { viagemDiaId: activeViagemDia.id });
    else if (proximas[0]) {
      const a = proximas[0];
      navigation.navigate('DriverTripDay', { viagemId: a.idViagem, data: a.data, viagemDiaId: a.idViagemDia });
    } else navigation.navigate('DriverTrips');
  };

  return (
    <DriverLayout>
      <View style={homeStyles.wrapper}>
        <HomeScroll>
          <Greeting name={driver?.nome} subtitle={inRoute ? 'Você está em rota agora.' : 'Pronto para a rota de hoje?'} />

          {inRoute ? (
            <HighlightCard
              chip="Em rota"
              chipTone="info"
              icon="navigation"
              title={nextStop ? `Próxima parada: ${nextStop.listaDependentes.map((d) => d.nomeDependente.split(' ')[0]).join(', ') || nextStop.nomeLocal}` : 'Todas as paradas concluídas'}
              lines={[nextStop?.endereco]}
              onPress={startRoute}
            />
          ) : activeTrips.length > 0 ? (
            <HighlightCard
              chip={plural(activeTrips.length, 'viagem ativa', 'viagens ativas')}
              chipTone="success"
              icon="map"
              title={viagemNome(activeTrips[0])}
              lines={[periodoLabel(activeTrips[0].periodo), activeTrips.length > 1 && `e mais ${activeTrips.length - 1} em Rotas`]}
              onPress={() => navigation.navigate('DriverTripDetails', { viagemId: activeTrips[0].id })}
            />
          ) : (
            <HighlightCard
              chip="Primeiros passos"
              chipTone="warning"
              icon="map"
              title={hasVehicle ? 'Crie sua primeira viagem' : 'Cadastre seu veículo'}
              lines={[hasVehicle ? 'Escolha a escola e o período. Depois convide os alunos.' : 'O veículo é necessário para criar viagens.']}
            >
              <Button
                label={hasVehicle ? 'Criar viagem' : 'Cadastrar veículo'}
                variant="secondary"
                onPress={() => navigation.navigate(hasVehicle ? 'DriverTrips' : 'DriverVehicle')}
                fullWidth
              />
            </HighlightCard>
          )}

          {docsPendentes.length > 0 && (
            // Documentos não bloqueiam a viagem: ainda não há quem os valide. O card só lembra de regularizar.
            <HighlightCard
              chip="Para regularizar"
              chipTone="warning"
              icon="file-text"
              title="Documentos pendentes"
              lines={[
                docsPendentes.map((t) => TIPO_DOCUMENTO_LABEL[t]).join(', ') + ': ausente, recusado ou vencido.',
                'Isso não impede iniciar as viagens.',
              ]}
            >
              <Button label="Ver documentos" variant="secondary" onPress={() => navigation.navigate('DriverDocuments')} fullWidth />
            </HighlightCard>
          )}

          {proximas.length > 0 && (
            <Card style={styles.agenda}>
              <Text style={styles.agendaTitle} accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>Próximas viagens</Text>
              {proximas.map((a) => {
                const trip = trips.find((t) => t.id === a.idViagem);
                const info = statusExecucao(a.status, { materializada: a.materializada });
                return (
                  <Card
                    key={`${a.idViagem}-${a.data}`}
                    variant="muted"
                    onPress={() => navigation.navigate('DriverTripDay', { viagemId: a.idViagem, data: a.data, viagemDiaId: a.idViagemDia })}
                    accessibilityLabel={`${trip ? viagemNome(trip) : 'Viagem'}, ${formatDayRelative(a.data)}, ${info.label}`}
                  >
                    <Text style={styles.agendaItem} maxFontSizeMultiplier={maxFontSizeMultiplier}>{trip ? viagemNome(trip) : 'Viagem'}</Text>
                    <Text style={styles.agendaCaption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {formatDayRelative(a.data)} · {periodoLabel(a.periodo)}
                    </Text>
                    <Chip label={info.label} tone={info.tone} size="sm" style={styles.alignStart} />
                  </Card>
                );
              })}
            </Card>
          )}

          {received.length > 0 && (
            <HighlightCard
              chip="Atenção"
              chipTone="danger"
              variant="alert"
              icon="inbox"
              title={plural(received.length, 'pedido de vaga aguardando', 'pedidos de vaga aguardando')}
              lines={[`${received[0].responsavelNome || 'Um responsável'} pediu vaga para ${received[0].dependenteNome || 'o aluno'}.`]}
            >
              <Button label="Responder pedidos" variant="secondary" onPress={() => navigation.navigate('DriverInvites')} fullWidth />
            </HighlightCard>
          )}

          <SectionTitle>Atalhos</SectionTitle>
          <Grid>
            <ShortcutCard label="Rotas" icon="map" caption={plural(activeTrips.length, 'ativa', 'ativas')} onPress={() => navigation.navigate('DriverTrips')} />
            <ShortcutCard label="Alunos" icon="users" caption="Buscar e convidar" onPress={() => navigation.navigate('DriverSearchStudents')} />
            <ShortcutCard label="Vínculos" icon="link" caption={plural(requests.length, 'pendente', 'pendentes')} onPress={() => navigation.navigate('DriverInvites')} />
            <ShortcutCard label="Histórico" icon="clock" caption="Ver viagens" onPress={() => navigation.navigate('DriverHistory')} />
            <ShortcutCard
              label="Veículo"
              icon="truck"
              caption={hasVehicle ? maskPlate(driver.veiculoDTO!.placa) : 'Cadastrar'}
              onPress={() => navigation.navigate('DriverVehicle')}
            />
            <ShortcutCard
              label="Escolas"
              icon="book"
              caption={convitesEscola ? plural(convitesEscola, 'convite', 'convites') : plural(escolasAtivas, 'vinculada', 'vinculadas')}
              onPress={() => navigation.navigate('DriverSchools')}
            />
            <ShortcutCard
              label="Documentos"
              icon="file-text"
              caption={documentos ? (docsPendentes.length ? plural(docsPendentes.length, 'pendência', 'pendências') : 'Em dia') : 'CNH e veículo'}
              onPress={() => navigation.navigate('DriverDocuments')}
            />
            <ShortcutCard label="Avisos" icon="bell" caption="Notificações" onPress={() => navigation.navigate('NotificationList')} />
            <ShortcutCard label="Perfil" icon="settings" caption="Conta e configurações" onPress={() => navigation.navigate('DriverProfile')} />
          </Grid>

          <Button label={inRoute ? 'Continuar chamada' : 'Iniciar rota'} icon={inRoute ? 'clipboard' : 'play'} onPress={startRoute} fullWidth />
        </HomeScroll>
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  agenda: { gap: spacing.md },
  agendaTitle: { ...typography.heading, color: colors.ink },
  agendaItem: { ...typography.label, color: colors.ink },
  agendaCaption: { ...typography.caption, color: colors.slate500, marginBottom: spacing.xs },
  alignStart: { alignSelf: 'flex-start' },
});
