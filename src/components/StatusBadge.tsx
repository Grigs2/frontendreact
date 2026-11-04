import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import Chip from './ui/Chip';
import { StatusTone } from '../theme';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium';
}

const VARIANT_TONES: Record<NonNullable<StatusBadgeProps['variant']>, StatusTone> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
  default: 'neutral',
};

// "EM_ANDAMENTO" → "Em andamento" (apenas exibição; o valor original não é alterado)
function formatStatus(status: string) {
  const text = status.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function StatusBadge({ status, variant = 'default', style, textStyle, size = 'medium' }: StatusBadgeProps) {
  return (
    <Chip
      label={formatStatus(status)}
      tone={VARIANT_TONES[variant] || 'neutral'}
      size={size === 'small' ? 'sm' : 'md'}
      style={style}
      textStyle={textStyle}
    />
  );
}
