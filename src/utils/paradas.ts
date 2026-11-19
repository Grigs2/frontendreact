import { DependenteParadaDTO, ParadaViagemDTO } from '../types';

/** Rua e número do aluno (antes do bairro) ou o nome da escola. */
export const enderecoResumido = (parada: ParadaViagemDTO) =>
  parada.tipoParada === 'ESCOLA'
    ? parada.nomeLocal.replace(/^Escola:\s*/, '')
    : (parada.endereco ?? '').split(' - ')[0] || parada.nomeLocal;

/** Nome da escola sem o prefixo "Escola:". */
export const nomeEscola = (parada: ParadaViagemDTO) => parada.nomeLocal.replace(/^Escola:\s*/, '');

/** Alunos em ordem alfabética (ignora acentos e maiúsculas). */
export const ordenarAlunos = (alunos: DependenteParadaDTO[]) =>
  [...alunos].sort((a, b) => a.nomeDependente.localeCompare(b.nomeDependente, 'pt-BR', { sensitivity: 'base' }));

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;

/** "Lucas", "Ana e Lucas" ou "Ana, Bia e Lucas", em ordem alfabética. */
export const nomesDosAlunos = (alunos: DependenteParadaDTO[]) => {
  const nomes = ordenarAlunos(alunos).map((a) => primeiroNome(a.nomeDependente));
  if (nomes.length <= 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
};

/** Na ida o embarque é na casa do aluno e o desembarque na escola; na volta é o contrário. */
export const ehEmbarque = (parada: ParadaViagemDTO, ida: boolean) =>
  ida ? parada.tipoParada !== 'ESCOLA' : parada.tipoParada === 'ESCOLA';

/**
 * Rótulo da parada sem endereço (o endereço fica no pop-up "Ver detalhes").
 * Ex.: "Embarque de Ana e Lucas", "Desembarque na EMEF Pedro II", "Casa do motorista".
 */
export const rotuloParada = (parada: ParadaViagemDTO, ida: boolean, alunos: DependenteParadaDTO[] = parada.listaDependentes) => {
  if (parada.tipoParada === 'MOTORISTA') return parada.nomeLocal || 'Casa do motorista';
  const acao = ehEmbarque(parada, ida) ? 'Embarque' : 'Desembarque';
  if (parada.tipoParada === 'ESCOLA') return `${acao} na ${nomeEscola(parada)}`;
  return alunos.length ? `${acao} de ${nomesDosAlunos(alunos)}` : acao;
};
