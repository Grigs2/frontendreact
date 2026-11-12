// Formatação de datas e horas para exibição (pt-BR).

const pad = (n: number) => String(n).padStart(2, '0');

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Converte "yyyy-MM-dd" (data local) ou ISO completo em Date. */
export const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(onlyDate ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Date → "yyyy-MM-dd" no fuso local (formato LocalDate da API). */
export const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayIso = () => toIsoDate(new Date());

/** dd/mm/aaaa */
export const formatDate = (value?: string | null) => {
  const d = parseDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
};

/** HH:mm */
export const formatTime = (value?: string | null) => {
  const d = parseDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
};

/** HH:mm:ss */
export const formatTimeSeconds = (value?: string | null) => {
  const d = parseDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '';
};

/** dd/mm/aaaa às HH:mm */
export const formatDateTime = (value?: string | null) => {
  const d = parseDate(value);
  return d ? `${formatDate(value)} às ${formatTime(value)}` : '';
};

/** "Seg, 19 out" */
export const formatDayShort = (value?: string | null) => {
  const d = parseDate(value);
  return d ? `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}` : '';
};

/** "Hoje", "Amanhã" ou "Seg, 19 out". */
export const formatDayRelative = (value?: string | null) => {
  const d = parseDate(value);
  if (!d) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return formatDayShort(value);
};

/** "agora", "há 2 minutos", "há 3 horas" ou a data completa. */
export const formatRelative = (value?: string | null, now = Date.now()) => {
  const d = parseDate(value);
  if (!d) return '';
  const seconds = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (seconds < 60) return 'agora';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours === 1 ? '' : 's'}`;
  return formatDateTime(value);
};

/** Próximos 7 dias (hoje + 6), no formato da API. */
export const nextSevenDays = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return toIsoDate(d);
  });

/** Mostra só os 4 últimos dígitos de um documento: "•••••••8901". */
export const maskDocument = (value?: string | null) => {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length < 6) return value || '';
  return `${'•'.repeat(digits.length - 4)}${digits.slice(-4)}`;
};
