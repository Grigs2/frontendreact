import { RootStackParamList } from '../navigation';

// Destino ao tocar numa notificação (central ou push) — 9.1.5 da listagem.
// Usado por NotificationListScreen e PushNotificationsHandler para manter o mesmo comportamento.

type Destino = { [K in keyof RootStackParamList]: { route: K; params?: RootStackParamList[K] } }[keyof RootStackParamList];

interface DadosNotificacao {
  tipo?: string | null;
  dependenteId?: number | null;
  viagemDiaId?: number | null;
}

const VIAGEM = new Set([
  'MOTORISTA_A_CAMINHO',
  'EMBARQUE',
  'DESEMBARQUE',
  'VIAGEM_FINALIZADA',
  'AUSENCIA',
  'ATRASO',
  'VIAGEM_CANCELADA',
  'VIAGEM_INTERROMPIDA',
  'TROCA_VEICULO',
]);

export const destinoNotificacao = (role: string | null | undefined, n: DadosNotificacao): Destino | null => {
  const tipo = n.tipo ?? 'GERAL';
  if (!role) return null;

  if (tipo === 'SOLICITACAO') {
    if (role === 'MOTORISTA') return { route: 'DriverInvites' };
    if (role === 'RESPONSAVEL') return { route: 'GuardianInvites' };
    if (role === 'ESCOLA') return { route: 'SchoolDrivers' };
  }

  if (role === 'RESPONSAVEL') {
    if (n.dependenteId) return { route: 'GuardianMonitoring', params: { dependenteId: n.dependenteId } };
    if (n.viagemDiaId || VIAGEM.has(tipo)) return { route: 'GuardianMain' };
  }

  if (role === 'MOTORISTA') {
    if (n.viagemDiaId) return { route: 'DriverAttendance', params: { viagemDiaId: n.viagemDiaId } };
    if (tipo === 'AUSENCIA_INFORMADA' || VIAGEM.has(tipo)) return { route: 'DriverTrips' };
  }

  return null;
};
