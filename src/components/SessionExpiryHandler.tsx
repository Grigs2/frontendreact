import { useEffect } from 'react';
import { authSession } from '../services/authSession';
import { useAppContext } from '../context/AppContext';
import { navigationRef } from '../navigation';

/**
 * Quando a renovação do token falha (refresh token expirado/revogado), limpa o usuário,
 * avisa e volta para o Login. Não renderiza nada.
 */
export default function SessionExpiryHandler() {
  const { setCurrentUser, showToast } = useAppContext();

  useEffect(() => {
    authSession.setSessionExpiredHandler(() => {
      setCurrentUser(null, null);
      if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name !== 'Login') {
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
      // A tela que fez a chamada também mostra seu próprio toast de erro logo em seguida;
      // o aviso de sessão vem por último para ser o que fica visível.
      setTimeout(() => showToast('Sua sessão expirou. Entre novamente.', 'warning'), 400);
    });
    return () => authSession.setSessionExpiredHandler(null);
  }, [setCurrentUser, showToast]);

  return null;
}
