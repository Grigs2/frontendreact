import { ParadaViagemDTO } from '../types';

/** Rua e número do aluno (antes do bairro) ou o nome da escola. */
export const enderecoResumido = (parada: ParadaViagemDTO) =>
  parada.tipoParada === 'ESCOLA'
    ? parada.nomeLocal.replace(/^Escola:\s*/, '')
    : (parada.endereco ?? '').split(' - ')[0] || parada.nomeLocal;
