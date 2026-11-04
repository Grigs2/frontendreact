// Tokens do Design System "Tio da Perua" (assets/design/TioDaPerua_DesignPattern.figcraft).
// Fonte única de cores, tipografia, espaçamentos, raios e medidas de layout.
// Não use valores hardcoded nas telas: importe daqui.

export const colors = {
  // Neutros — base de 90% da interface
  ink: '#14181F',
  slate700: '#3A4250',
  slate500: '#5B6575',
  border: '#C9CFD8',
  surface: '#FFFFFF',
  background: '#F4F5F7',

  // Ação — única cor de marca; só para o que o usuário deve tocar (texto sempre ink)
  primary: '#FFC400',
  primaryPressed: '#E0AB00',
  primaryTint: '#FFF3C4',

  // Semânticas — só para status e alertas (sempre com texto ou ícone)
  success: '#1B7F3B',
  successTint: '#E3F4E8',
  danger: '#C62828',
  dangerPressed: '#A81F1F',
  dangerTint: '#FBE4E4',
  info: '#1456B8',
  infoTint: '#E2ECFA',

  // Estados
  pressedNeutral: '#E3E6EB',
  disabledBg: '#E3E6EB',
  disabledText: '#6B7482',
  disabledBorder: '#C9CFD8',
  disabledTextOutline: '#8A93A1',

  // Utilitários derivados
  onPrimary: '#14181F',
  onDanger: '#FFFFFF',
  overlay: 'rgba(20, 24, 31, 0.4)',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  captionBold: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
} as const;

// Respeita a escala de fonte do sistema até 1,3×
export const maxFontSizeMultiplier = 1.3;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, card: 16, button: 16, input: 16, pill: 999 } as const;

export const borders = { hairline: 1, alert: 2 } as const;

export const layout = {
  screenMargin: 16,
  gridGap: 16,
  cardPadding: 16,
  cardGap: 12,
  buttonGap: 12,
  buttonLg: 56,
  buttonMd: 48,
  buttonPaddingH: 24,
  iconButton: 56,
  iconSlot: 48,
  icon: 24,
  chip: 32,
  tabBar: 80,
  topAreaMax: 316,
  minTouch: 48,
} as const;

// O design não usa sombras: superfícies são separadas por borda de 1px.
// A única exceção é o que flutua sobre o conteúdo (drawer, modal, toast).
export const elevation = {
  none: {},
  overlay: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export type StatusTone = 'success' | 'danger' | 'info' | 'warning' | 'neutral';

// Pares fundo/texto para selos e avisos. "warning" usa o tint da marca com texto ink
// (o design não define âmbar semântico; amarelo sobre branco não atinge 4,5:1).
export const statusColors: Record<StatusTone, { bg: string; text: string; border: string }> = {
  success: { bg: colors.successTint, text: colors.success, border: colors.success },
  danger: { bg: colors.dangerTint, text: colors.danger, border: colors.danger },
  info: { bg: colors.infoTint, text: colors.info, border: colors.info },
  warning: { bg: colors.primaryTint, text: colors.ink, border: colors.primaryPressed },
  neutral: { bg: colors.pressedNeutral, text: colors.slate700, border: colors.border },
};

const theme = { colors, fonts, typography, maxFontSizeMultiplier, spacing, radius, borders, layout, elevation, statusColors };

export default theme;
