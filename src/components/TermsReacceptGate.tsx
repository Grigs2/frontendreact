import React, { useEffect, useState } from 'react';
import { TermsModal } from './forms';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/authService';
import { authSession } from '../services/authSession';
import { navigationRef } from '../navigation';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Novo aceite dos termos: quando a versão vigente mudou desde o último aceite (login ou renovação devolvem
 * termosPendentes = true), mostra os termos com "Li e aceito". Sem aceitar, a pessoa sai da conta.
 */
export default function TermsReacceptGate() {
  const { currentUser, setCurrentUser, showToast } = useAppContext();
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVisible(!!currentUser && authSession.getTermosPendentes());
  }, [currentUser]);

  const aceitar = async () => {
    setSaving(true);
    try {
      await authService.aceitarTermos();
      setVisible(false);
      showToast('Obrigado! Aceite registrado.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível registrar o aceite.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const sair = async () => {
    setVisible(false);
    await authService.sair();
    setCurrentUser(null, null);
    if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    showToast('Para usar o app é preciso aceitar a nova versão dos termos.', 'warning');
  };

  return (
    <TermsModal
      visible={visible}
      onClose={sair}
      onAccept={aceitar}
      acceptLoading={saving}
      declineLabel="Não aceito (sair da conta)"
      notice="Atualizamos os Termos de Uso e a Política de Privacidade. Leia e aceite para continuar usando o app."
    />
  );
}
