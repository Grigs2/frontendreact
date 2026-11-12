import { onlyDigits } from './masks';

// Validadores de formulário. Cada função devolve a mensagem de erro (string) ou null quando o valor é válido,
// para ser usada diretamente na prop `error` do TextField.

const allSameDigits = (digits: string) => /^(\d)\1+$/.test(digits);

/** Algoritmo oficial dos dígitos verificadores do CPF. */
export const isValidCPF = (value: string) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || allSameDigits(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
};

/** Algoritmo oficial dos dígitos verificadores do CNPJ. */
export const isValidCNPJ = (value: string) => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || allSameDigits(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
};

// RFC 5322 simplificado: parte local sem espaços, domínio com TLD de 2+ letras, sem pontos duplicados.
const EMAIL_REGEX =
  /^(?!.*\.\.)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export const isValidEmail = (value: string) => {
  const email = (value || '').trim();
  return email.length <= 254 && EMAIL_REGEX.test(email) && !email.startsWith('.') && !email.split('@')[0].endsWith('.');
};

/** DDDs válidos no Brasil (Anatel). */
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Data DD/MM/AAAA real (rejeita 31/02 etc.). Retorna o Date ou null. */
export const parseBrDate = (value: string): Date | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

export const ageOn = (birth: Date, today = new Date()) => {
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age;
};

// ---------------------------------------------------------------------------------------------
// Validações por campo (mensagens exibidas ao usuário)
// ---------------------------------------------------------------------------------------------

export const validateRequired = (value: string, label: string) =>
  (value || '').trim() ? null : `Informe ${label}.`;

export const validateEmail = (value: string) => {
  if (!(value || '').trim()) return 'Informe o e-mail.';
  return isValidEmail(value) ? null : 'E-mail inválido. Ex.: nome@dominio.com';
};

export const validateCPF = (value: string) => {
  if (!onlyDigits(value)) return 'Informe o CPF.';
  if (onlyDigits(value).length < 11) return 'CPF incompleto.';
  return isValidCPF(value) ? null : 'CPF inválido. Confira os números.';
};

export const validateCNPJ = (value: string) => {
  if (!onlyDigits(value)) return 'Informe o CNPJ.';
  if (onlyDigits(value).length < 14) return 'CNPJ incompleto.';
  return isValidCNPJ(value) ? null : 'CNPJ inválido. Confira os números.';
};

/** CNH: 11 dígitos (regra do backend para documentos). */
export const validateCNH = (value: string) => {
  const cnh = onlyDigits(value);
  if (!cnh) return 'Informe o número da CNH.';
  if (cnh.length !== 11) return 'A CNH deve ter 11 dígitos.';
  if (allSameDigits(cnh)) return 'Número de CNH inválido.';
  return null;
};

export const validatePhone = (value: string) => {
  const phone = onlyDigits(value);
  if (!phone) return 'Informe o telefone.';
  if (phone.length !== 10 && phone.length !== 11) return 'Telefone incompleto. Use DDD + número.';
  if (!VALID_DDDS.has(Number(phone.slice(0, 2)))) return 'DDD inválido.';
  if (phone.length === 11 && phone[2] !== '9') return 'Celular deve começar com 9 após o DDD.';
  if (phone.length === 10 && !/[2-5]/.test(phone[2])) return 'Telefone fixo inválido.';
  return null;
};

export const validateCEP = (value: string) => {
  const cep = onlyDigits(value);
  if (!cep) return 'Informe o CEP.';
  return cep.length === 8 ? null : 'CEP deve ter 8 dígitos.';
};

export const validateBirthDate = (value: string, minAge = 18) => {
  if (!value) return 'Informe a data de nascimento.';
  if (value.length < 10) return 'Data incompleta. Use DD/MM/AAAA.';
  const date = parseBrDate(value);
  if (!date) return 'Data inválida.';
  if (date > new Date()) return 'A data não pode estar no futuro.';
  if (date.getFullYear() < 1900) return 'Data inválida.';
  if (minAge > 0 && ageOn(date) < minAge) return `É preciso ter ${minAge} anos ou mais.`;
  return null;
};

export const validateUF = (value: string) =>
  /^[A-Za-z]{2}$/.test((value || '').trim()) ? null : 'UF deve ter 2 letras.';

/** Idade de um aluno do transporte escolar: entre 1 e 25 anos. */
export const DEPENDENT_AGE = { min: 1, max: 25 } as const;

export const validateDependentBirthDate = (value: string) => {
  const base = validateBirthDate(value, 0);
  if (base) return base;
  const age = ageOn(parseBrDate(value)!);
  if (age < DEPENDENT_AGE.min) return `O aluno precisa ter ao menos ${DEPENDENT_AGE.min} ano.`;
  if (age > DEPENDENT_AGE.max) return `Confira a data: o aluno teria ${age} anos.`;
  return null;
};

/** "9 anos" / "1 ano" a partir de DD/MM/AAAA válida; vazio enquanto a data estiver incompleta. */
export const ageLabel = (value: string) => {
  const date = value?.length === 10 ? parseBrDate(value) : null;
  if (!date || date > new Date()) return '';
  const age = ageOn(date);
  return age === 1 ? '1 ano' : `${age} anos`;
};

// ---------------------------------------------------------------------------------------------
// Veículo
// ---------------------------------------------------------------------------------------------

/** Placa antiga (ABC1234) ou Mercosul (ABC1D23). Aceita hífen e minúsculas. */
export const isValidPlate = (value: string) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test((value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase());

export const validatePlate = (value: string) => {
  if (!(value || '').trim()) return 'Informe a placa.';
  return isValidPlate(value) ? null : 'Placa inválida. Use ABC-1234 ou ABC1D23.';
};

export const validateVehicleYear = (value: string) => {
  const year = Number(onlyDigits(value));
  const max = new Date().getFullYear() + 1;
  if (!value) return 'Informe o ano.';
  if (String(year).length !== 4 || year < 1980 || year > max) return `Ano deve estar entre 1980 e ${max}.`;
  return null;
};

export const validateCapacity = (value: string) => {
  const n = Number(onlyDigits(value));
  if (!value) return 'Informe a capacidade.';
  if (!n || n < 1 || n > 60) return 'Capacidade entre 1 e 60 passageiros.';
  return null;
};

// ---------------------------------------------------------------------------------------------
// Senha
// ---------------------------------------------------------------------------------------------

/** O backend exige no mínimo 12 caracteres e no máximo 72 bytes (UTF-8). */
export const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

const utf8Length = (value: string) => {
  let bytes = 0;
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
};

export interface PasswordRule {
  key: 'length' | 'upper' | 'number' | 'special';
  label: string;
  ok: boolean;
}

export const passwordRules = (value: string): PasswordRule[] => [
  { key: 'length', label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`, ok: value.length >= PASSWORD_MIN_LENGTH },
  { key: 'upper', label: 'Uma letra maiúscula', ok: /[A-ZÀ-Ý]/.test(value) },
  { key: 'number', label: 'Um número', ok: /\d/.test(value) },
  { key: 'special', label: 'Um caractere especial (ex.: ! @ # $)', ok: /[^A-Za-z0-9À-ÿ\s]/.test(value) },
];

/** 0 (vazia) a 4 (forte). */
export const passwordStrength = (value: string) => {
  if (!value) return 0;
  const passed = passwordRules(value).filter((r) => r.ok).length;
  return Math.max(1, passed);
};

export const validatePassword = (value: string) => {
  if (!value) return 'Informe a senha.';
  if (utf8Length(value) > PASSWORD_MAX_BYTES) return 'Senha longa demais.';
  const failed = passwordRules(value).filter((r) => !r.ok);
  return failed.length ? 'A senha não atende a todos os critérios.' : null;
};

export const validatePasswordConfirmation = (password: string, confirmation: string) => {
  if (!confirmation) return 'Confirme a senha.';
  return password === confirmation ? null : 'As senhas não coincidem.';
};

// ---------------------------------------------------------------------------------------------
// Documentos do motorista, datas de validade e motivos
// ---------------------------------------------------------------------------------------------

/** RENAVAM: 11 dígitos. */
export const validateRenavam = (value: string) => {
  const renavam = onlyDigits(value);
  if (!renavam) return 'Informe o RENAVAM.';
  if (renavam.length !== 11) return 'O RENAVAM deve ter 11 dígitos.';
  if (allSameDigits(renavam)) return 'RENAVAM inválido.';
  return null;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Data DD/MM/AAAA válida e que não esteja no futuro. */
export const validatePastDate = (value: string, label: string) => {
  if (!value) return `Informe ${label}.`;
  const date = parseBrDate(value);
  if (!date) return 'Data inválida. Use DD/MM/AAAA.';
  if (date.getTime() > startOfToday().getTime()) return `A ${label} não pode estar no futuro.`;
  return null;
};

/** Data de validade DD/MM/AAAA; opcionalmente não anterior a outra data. */
export const validateExpiryDate = (value: string, after?: string) => {
  if (!value) return 'Informe a data de validade.';
  const date = parseBrDate(value);
  if (!date) return 'Data inválida. Use DD/MM/AAAA.';
  const base = after ? parseBrDate(after) : null;
  if (base && date.getTime() < base.getTime()) return 'A validade não pode ser anterior à data de realização.';
  return null;
};

/** true quando a data (DD/MM/AAAA ou yyyy-MM-dd) já passou. */
export const isExpired = (value?: string | null) => {
  if (!value) return false;
  const date = /^\d{4}-/.test(value) ? new Date(`${value.slice(0, 10)}T00:00:00`) : parseBrDate(value);
  return !!date && date.getTime() < startOfToday().getTime();
};

/** Motivo com limite de caracteres (obrigatório por padrão). */
export const validateReason = (value: string, max: number, required = true) => {
  const text = (value || '').trim();
  if (required && !text) return 'Informe o motivo.';
  if (text.length > max) return `O motivo deve ter no máximo ${max} caracteres.`;
  return null;
};
