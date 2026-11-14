import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { Greeting, Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Button, ShortcutCard } from '../components/ui';
import { motoristaService } from '../services/motoristaService';
import { periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { AgendaViagemDTO, DocumentoMotoristaDTO, MotoristaDTO, ParadaViagemDTO, SolicitacaoDTO, ViagemDTO } from '../types';
import { documentoService, pendenciasDocumentais } from '../services/documentoService';
import { TIPO_DOCUMENTO_LABEL } from '../utils/statusLabels';
import { formatDayRelative } from '../utils/format';
import { enderecoResumido } from '../utils/paradas';
import { SENTIDO_LABEL, TURNO_LABEL, rotuloRota } from '../utils/periodo';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// Ordem de prioridade da próxima viagem dentro do mesmo dia.
const ORDEM_PERIODO = ['MANHA_IDA', 'TARDE_IDA', 'MANHA_VOLTA', 'TARDE_VOLTA'];

/** Início do motorista: viagem em andamento (ou próxima), avisos que pedem ação e atalhos. */
export default function DriverMainScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, activeViagemDia, currentStops, setActiveViagemDia, setCurrentStops } = useAppContext();
  const driver = currentUser as MotoristaDTO;
  const hasVehicle = !!driver?.veiculoDTO?.placa;

  const [trips, setTrips] = useState<ViagemDTO[]>([]);
  const [requests, setRequests] = useState<SolicitacaoDTO[]>([]);
  const [agenda, setAgenda] = useState<AgendaViagemDTO[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoMotoristaDTO[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!driver?.id) return;
      viagemService.listarViagens(driver.id).then(setTrips).catch(() => setTrips([]));
      motoristaService.listarSolicitacoes(driver.id).then(setRequests).catch(() => setRequests([]));
      viagemService.agenda(driver.id).then(restaurarViagemEmAndamento).catch(() => setAgenda([]));
      documentoService.listar(driver.id).then(setDocumentos).catch(() => setDocumentos(null));
    }, [driver?.id]),
  );

  // A viagem em andamento vive só no contexto; ao reabrir o app ela precisa ser recarregada pela agenda.
  const restaurarViagemEmAndamento = async (lista: AgendaViagemDTO[]) => {
    setAgenda(lista);
    const emAndamento = lista.find((a) => a.status === 'EM_ANDAMENTO' && a.idViagemDia);
    if (!emAndamento?.idViagemDia) {
      if (activeViagemDia?.status === 'EM_ANDAMENTO') setActiveViagemDia(null);
      return;
    }
    if (activeViagemDia?.id === emAndamento.idViagemDia) return;
    const [exec, paradas] = await Promise.all([
      viagemService.visualizarViagemDia(emAndamento.idViagemDia),
      viagemService.buscarParadasViagemDia(emAndamento.idViagemDia),
    ]);
    setActiveViagemDia({ ...exec, viagemId: emAndamento.idViagem });
    setCurrentStops(paradas);
  };

  const activeTrips = trips.filter((t) => t.ativo);
  const received = requests.filter((s) => s.origem === 'RESPONSAVEL');
  const inRoute = activeViagemDia?.status === 'EM_ANDAMENTO';
  const nextStop = currentStops.find(
    (s) => s.tipoParada !== 'MOTORISTA' && s.listaDependentes.some((d) => d.statusEmbarque === 'ESPERANDO' || d.statusEmbarque === 'EMBARCADO'),
  );
  const alunosDaRota = Array.from(new Map(currentStops.flatMap((s) => s.listaDependentes).map((d) => [d.id, d])).values());
  const embarcadosNaRota = alunosDaRota.filter((d) => d.statusEmbarque === 'EMBARCADO' || d.statusEmbarque === 'DESEMBARCADO').length;
  const rotaAtual = rotuloRota(activeViagemDia?.periodo ?? activeViagemDia?.viagem?.periodo);

  // Próxima viagem: hoje ou amanhã, ainda não iniciada; hoje vem antes de amanhã e ida antes de volta.
  const ordemProxima = (a: AgendaViagemDTO) => {
    const dia = formatDayRelative(a.data) === 'Hoje' ? 0 : 10;
    const turno = ORDEM_PERIODO.indexOf(a.periodo ?? '');
    return dia + (turno < 0 ? ORDEM_PERIODO.length : turno);
  };
  const proximaViagem = agenda
    .filter((a) => (!a.status || a.status === 'PLANEJADA') && ['Hoje', 'Amanhã'].includes(formatDayRelative(a.data)))
    .sort((x, y) => ordemProxima(x) - ordemProxima(y))[0];
  const [turnoProxima, sentidoProxima] = (proximaViagem?.periodo ?? '').split('_');
  const docsPendentes = documentos ? pendenciasDocumentais(documentos) : [];

  const openRoute = () => {
    if (activeViagemDia?.id) navigation.navigate('DriverAttendance', { viagemDiaId: activeViagemDia.id });
  };

  return (
    <DriverLayout>
      <View style={homeStyles.wrapper}>
        <HomeScroll>
          <Greeting name={driver?.nome} subtitle={inRoute ? 'Você está em rota agora.' : 'Pronto para a rota de hoje?'} />

          {inRoute ? (
            <HighlightCard
              chip="Viagem atual - em rota"
              chipTone="info"
              icon="navigation"
              title={rotaAtual ? `Rota da ${rotaAtual}` : 'Rota'}
              tituloSecundario={`${embarcadosNaRota}/${alunosDaRota.length} embarcados`}
              lines={[nextStop ? `Indo para ${enderecoResumido(nextStop)}` : 'Todas as paradas concluídas']}
              onPress={openRoute}
            />
          ) : activeTrips.length > 0 ? (
            <HighlightCard
              chip="Próxima viagem"
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

          {proximaViagem && (
            <Button
              variant="secondary"
              labelLines={2}
              label={`Próxima viagem\n${formatDayRelative(proximaViagem.data)} - ${TURNO_LABEL[turnoProxima] ?? ''} - ${SENTIDO_LABEL[sentidoProxima] ?? ''}`}
              onPress={() => navigation.navigate('DriverTripDay', { viagemId: proximaViagem.idViagem, data: proximaViagem.data, viagemDiaId: proximaViagem.idViagemDia })}
              fullWidth
            />
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
            <ShortcutCard label="Perfil" icon="settings" caption="Conta e configurações" onPress={() => navigation.navigate('DriverProfile')} />
            <ShortcutCard label="Histórico" icon="clock" caption="Ver viagens" onPress={() => navigation.navigate('DriverHistory')} />
            <ShortcutCard label="Alunos" icon="users" caption="Buscar e convidar" onPress={() => navigation.navigate('DriverSearchStudents')} />
            <ShortcutCard
              label="Documentos"
              icon="file-text"
              caption={documentos ? (docsPendentes.length ? plural(docsPendentes.length, 'pendência', 'pendências') : 'Em dia') : 'CNH e veículo'}
              onPress={() => navigation.navigate('DriverDocuments')}
            />
          </Grid>
        </HomeScroll>
      </View>
    </DriverLayout>
  );
}
