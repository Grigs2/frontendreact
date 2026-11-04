import React from 'react';
import AppLayout from './AppLayout';

interface DriverLayoutProps {
  children: React.ReactNode;
}

export default function DriverLayout({ children }: DriverLayoutProps) {
  return <AppLayout role="driver">{children}</AppLayout>;
}
