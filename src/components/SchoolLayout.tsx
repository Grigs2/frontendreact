import React from 'react';
import AppLayout from './AppLayout';

interface SchoolLayoutProps {
  children: React.ReactNode;
}

export default function SchoolLayout({ children }: SchoolLayoutProps) {
  return <AppLayout role="school">{children}</AppLayout>;
}
