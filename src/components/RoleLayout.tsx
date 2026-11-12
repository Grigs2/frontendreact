import React from 'react';
import AppLayout, { LayoutRole } from './AppLayout';
import { useAppContext } from '../context/AppContext';

const ROLE: Record<string, LayoutRole> = {
  MOTORISTA: 'driver',
  RESPONSAVEL: 'guardian',
  ESCOLA: 'school',
  ADMIN: 'admin',
};

/** Layout do perfil autenticado, para telas comuns a todos os perfis (ex.: Configurações). */
export default function RoleLayout({ children }: { children: React.ReactNode }) {
  const { userRole } = useAppContext();
  return <AppLayout role={ROLE[userRole ?? ''] ?? 'guardian'}>{children}</AppLayout>;
}
