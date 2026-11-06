import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificacaoService } from './notificacaoService';

// Push pelo Expo (Expo Push API). Só no celular: no navegador o app usa apenas a central e o contador do sino.
// Fluxo: pede permissão → obtém o ExpoPushToken → registra em POST /Notificacao/Dispositivos.
// Ao sair da conta, o authService chama POST /Notificacao/Dispositivos/Remover com esse token.

/** ID do projeto no EAS (obrigatório para gerar o token fora do Expo Go). Defina EXPO_PUBLIC_EAS_PROJECT_ID. */
const PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

let tokenAtual: string | null = null;
let configurado = false;

const configurar = async () => {
  if (configurado) return;
  configurado = true;
  // Com o app aberto o aviso também aparece (banner + lista), com som.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  if (Platform.OS === 'android') {
    // Mesmos canais usados pelo backend (channelId "viagem" e "alertas").
    await Notifications.setNotificationChannelAsync('viagem', {
      name: 'Viagem',
      description: 'Embarque, desembarque, motorista a caminho e viagem concluída',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('alertas', {
      name: 'Alertas',
      description: 'Cancelamento, interrupção, atraso, falta e troca de veículo',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
};

export const pushService = {
  getToken: () => tokenAtual,

  /** Registra o aparelho para receber push. Falhas não atrapalham o uso do app. */
  async registrar(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    try {
      await configurar();
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        status = (await Notifications.requestPermissionsAsync()).status;
      }
      if (status !== 'granted') return null;
      const { data } = await Notifications.getExpoPushTokenAsync(PROJECT_ID ? { projectId: PROJECT_ID } : undefined);
      tokenAtual = data;
      await notificacaoService.registrarDispositivo(data, Platform.OS);
      return data;
    } catch (error) {
      console.warn('[pushService] Push não registrado:', error);
      return null;
    }
  },

  /** Esquece o token local (o authService avisa o backend ao sair). */
  esquecer() {
    tokenAtual = null;
  },
};
