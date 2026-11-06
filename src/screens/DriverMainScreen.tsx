import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import DriverLayout from '../components/DriverLayout';
import { Greeting, Grid, HighlightCard, HomeScroll, SectionTitle, homeStyles } from '../components/HomeBlocks';
import { Button, ShortcutCard } from '../components/ui';
import { motoristaService } from '../services/motoristaService';
import { periodoLabel, viagemNome, viagemService } from '../services/viagemService';
import { MotoristaDTO, SolicitacaoDTO, ViagemDTO } from '../types';
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

  useFocusEffect(
    useCallback(() => {
      if (!driver?.id) return;
      viagemService.listarViagens(driver.id).then(setTrips).catch(() => setTrips([]));
      motoristaService.listarSolicitacoes(driver.id).then(setRequests).catch(() => setRequests([]));
    }, [driver?.id]),
  );

  const activeTrips = trips.filter((t) => t.ativo);
  const received = requests.filter((s) => s.origem === 'RESPONSAVEL');
  const inRoute = activeViagemDia?.status === 'EM_ANDAMENTO';
  const nextStop = currentStops.find(
    (s) => s.tipoParada !== 'MOTORISTA' && s.listaDependentes.some((d) => d.statusEmbarque === 'ESPERANDO' || d.statusEmbarque === 'EMBARCADO'),
  );

  const startRoute = () => {
    if (inRoute && activeViagemDia?.id) navigation.navigate('DriverAttendance', { viagemDiaId: activeViagemDia.id });
    else navigation.navigate('DriverTrips');
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
            <ShortcutCard label="Avisos" icon="bell" caption="Notificações" onPress={() => navigation.navigate('NotificationList')} />
          </Grid>

          <Button label={inRoute ? 'Continuar chamada' : 'Iniciar rota'} icon={inRoute ? 'clipboard' : 'play'} onPress={startRoute} fullWidth />
        </HomeScroll>
      </View>
    </DriverLayout>
  );
}
