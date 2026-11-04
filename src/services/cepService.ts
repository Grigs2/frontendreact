import { onlyDigits } from '../utils/masks';

// Consulta de CEP no ViaCEP, usada só para pré-preencher o formulário.
// O backend valida o CEP novamente ao salvar o endereço.

export interface EnderecoCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export class CepError extends Error {
  constructor(public readonly kind: 'invalido' | 'nao_encontrado' | 'indisponivel', message: string) {
    super(message);
    this.name = 'CepError';
  }
}

const TIMEOUT_MS = 8000;

export const cepService = {
  buscar: async (cep: string): Promise<EnderecoCep> => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) throw new CepError('invalido', 'CEP deve ter 8 dígitos.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
      if (response.status === 400) throw new CepError('invalido', 'CEP inválido.');
      if (!response.ok) throw new CepError('indisponivel', 'Serviço de CEP indisponível. Preencha o endereço manualmente.');
      const data = await response.json();
      if (data?.erro) throw new CepError('nao_encontrado', 'CEP não encontrado. Confira o número ou preencha manualmente.');
      return {
        cep: digits,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
      };
    } catch (error) {
      if (error instanceof CepError) throw error;
      throw new CepError('indisponivel', 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.');
    } finally {
      clearTimeout(timer);
    }
  },
};
