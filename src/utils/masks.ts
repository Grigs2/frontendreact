// Máscaras de entrada. Todas aceitam texto livre e devolvem o valor formatado parcialmente
// (aplicadas no onChangeText). Para enviar ao backend use onlyDigits quando necessário.

export const onlyDigits = (value: string) => (value || '').replace(/\D/g, '');

const apply = (digits: string, pattern: string) => {
  let out = '';
  let i = 0;
  for (const ch of pattern) {
    if (i >= digits.length) break;
    if (ch === '0') {
      out += digits[i++];
    } else {
      out += ch;
    }
  }
  return out;
};

/** 000.000.000-00 */
export const maskCPF = (value: string) => apply(onlyDigits(value).slice(0, 11), '000.000.000-00');

/** 00.000.000/0000-00 */
export const maskCNPJ = (value: string) => apply(onlyDigits(value).slice(0, 14), '00.000.000/0000-00');

/** 00000-000 */
export const maskCEP = (value: string) => apply(onlyDigits(value).slice(0, 8), '00000-000');

/** DD/MM/AAAA */
export const maskDate = (value: string) => apply(onlyDigits(value).slice(0, 8), '00/00/0000');

/** CNH: 11 dígitos, sem separadores */
export const maskCNH = (value: string) => onlyDigits(value).slice(0, 11);

/** (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo), escolhida pelo número de dígitos */
export const maskPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return apply(digits, '(00) 0000-0000');
  }
  return apply(digits, '(00) 00000-0000');
};

/** "YYYY-MM-DD" (API) → "DD/MM/AAAA" (tela) */
export const isoToBrDate = (iso?: string | null) => {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

/** "DD/MM/AAAA" (tela) → "YYYY-MM-DD" (API) */
export const brToIsoDate = (br: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};
