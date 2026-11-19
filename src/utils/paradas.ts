import { ParadaViagemDTO } from '../types';

/** Rua e número do aluno (antes do bairro) ou o nome da escola. */
export const enderecoResumido = (parada: ParadaViagemDTO) =>
  parada.tipoParada === 'ESCOLA'
    ? parada.nomeLocal.replace(/^Escola:\s*/, '')
    : (parada.endereco ?? '').split(' - ')[0] || parada.nomeLocal;

const primeiroNome = (nome?: string | null) => (nome || '').trim().split(/\s+/)[0];

/**
 * Nome da parada com todos os alunos dela. O backend nomeia a parada só pelo primeiro aluno do endereço
 * ("Embarque de Lucas Silva"); quando há irmãos ou vizinhos no mesmo ponto, vira "Embarque de Lucas, Ana".
 * Paradas de escola e do motorista mantêm o nome original.
 */
export const nomeParada = (parada: ParadaViagemDTO) => {
  const nomes = Array.from(new Set(parada.listaDependentes.map((d) => primeiroNome(d.nomeDependente)).filter(Boolean)));
  if (parada.tipoParada !== 'RESPONSAVEL' || nomes.length === 0) return parada.nomeLocal || parada.endereco;
  const original = (parada.nomeLocal || '').trim();
  const prefixo = /^desembarque/i.test(original) ? 'Desembarque' : /^embarque/i.test(original) ? 'Embarque' : 'Parada';
  return `${prefixo} de ${nomes.join(', ')}`;
};
