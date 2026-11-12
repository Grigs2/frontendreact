import React from 'react';
import AppLayout from './AppLayout';

/** Layout do administrador (acesso separado da escola). Uso recomendado no navegador. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout role="admin">{children}</AppLayout>;
}
