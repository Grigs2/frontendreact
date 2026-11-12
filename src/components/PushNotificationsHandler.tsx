import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppContext } from '../context/AppContext';
import { navigationRef } from '../navigation';
import { pushService } from '../services/pushService';
import { destinoNotificacao } from '../utils/notificationRouting';

/**
 * Registra o aparelho para push depois do login e trata o toque no aviso:
 * leva para o acompanhamento do aluno, para os vínculos ou para a central de notificações.
 * Não renderiza nada; no navegador não faz nada.
 */
export default function PushNotificationsHandler() {
  const { currentUser, userRole, refreshUnreadCount } = useAppContext();

  useEffect(() => {
    if (currentUser && userRole !== 'ADMIN' && Platform.OS !== 'web') pushService.registrar();
  }, [currentUser, userRole]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const abrir = (data: Record<string, unknown> | undefined) => {
      if (!navigationRef.isReady() || !userRole) return;
      const destino = destinoNotificacao(userRole, {
        tipo: data?.tipo ? String(data.tipo) : null,
        dependenteId: Number(data?.dependenteId) || null,
        viagemDiaId: Number(data?.viagemDiaId) || null,
      });
      if (destino) (navigationRef as any).navigate(destino.route, destino.params);
      else navigationRef.navigate('NotificationList');
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
