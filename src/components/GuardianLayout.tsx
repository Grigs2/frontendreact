import React from 'react';
import AppLayout from './AppLayout';

interface GuardianLayoutProps {
  children: React.ReactNode;
}

export default function GuardianLayout({ children }: GuardianLayoutProps) {
  return <AppLayout role="guardian">{children}</AppLayout>;
}
