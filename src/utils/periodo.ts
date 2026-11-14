export const TURNO_LABEL: Record<string, string> = { MANHA: 'manhã', TARDE: 'tarde', NOITE: 'noite' };
export const SENTIDO_LABEL: Record<string, string> = { IDA: 'ida', VOLTA: 'volta' };

// Período vem como MANHA_IDA, TARDE_VOLTA etc.
export const rotuloRota = (periodo?: string | null) => {
  const [turno, sentido] = (periodo ?? '').split('_');
  const t = TURNO_LABEL[turno];
  if (!t) return null;
  const s = SENTIDO_LABEL[sentido];
  return s ? `${t} (${s})` : t;
};
