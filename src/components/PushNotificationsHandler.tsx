import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppContext } from '../context/AppContext';
import { navigationRef } from '../navigation';
import { pushService } from '../services/pushService';

/**
 * Registra o aparelho para push depois do login e trata o toque no aviso:
 * leva para o acompanhamento do aluno, para os vínculos ou para a central de notificações.
 * Não renderiza nada; no navegador não faz nada.
 */
export default function PushNotificationsHandler() {
  const { currentUser, userRole, refreshUnreadCount } = useAppContext();

  useEffect(() => {
    if (currentUser && Platform.OS !== 'web') pushService.registrar();
  }, [currentUser]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const abrir = (data: Record<string, unknown> | undefined) => {
      if (!navigationRef.isReady() || !userRole) return;
      const tipo = String(data?.tipo ?? '');
      const dependenteId = Number(data?.dependenteId) || null;
      if (tipo === 'SOLICITACAO') {
        navigationRef.navigate(userRole === 'MOTORISTA' ? 'DriverInvites' : 'GuardianInvites');
      } else if (userRole === 'RESPONSAVEL' && dependenteId) {
        navigationRef.navigate('GuardianMonitoring', { dependenteId });
      } else {
        navigationRef.navigate('NotificationList');
      }
    };

    // Aviso recebido com o app aberto: atualiza o contador do sino.
    const recebida = Notifications.addNotificationReceivedListener(() => refreshUnreadCount());
    const tocada = Notifications.addNotificationResponseReceivedListener((resp) =>
      abrir(resp.notification.request.content.data as Record<string, unknown>),
    );
    return () => {
      recebida.remove();
      tocada.remove();
    };
  }, [userRole, refreshUnreadCount]);

  return null;
}
