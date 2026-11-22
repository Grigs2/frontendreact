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

/**
 * Ida ou volta, para telas que só têm as paradas (sem o período da viagem).
 * O backend nomeia a parada do aluno como "Embarque de ..." na ida e "Desembarque de ..." na volta;
 * sem esse nome, vale a ordem: na ida a casa do aluno vem antes da escola.
 */
export const idaDasParadas = (paradas: ParadaViagemDTO[]) => {
  const doAluno = paradas.find((p) => p.tipoParada === 'RESPONSAVEL' && p.nomeLocal);
  if (doAluno && /^desembarque/i.test(doAluno.nomeLocal.trim())) return false;
  if (doAluno && /^embarque/i.test(doAluno.nomeLocal.trim())) return true;
  const casa = paradas.findIndex((p) => p.tipoParada === 'RESPONSAVEL');
  const escola = paradas.findIndex((p) => p.tipoParada === 'ESCOLA');
  return casa < 0 || escola < 0 || casa < escola;
};

/** Resultado da conferência de uma nova ordem de paradas, antes de salvar. */
export interface AnaliseOrdem {
  /** Impedem salvar. */
  erros: string[];
  /** Mudanças que o servidor fará ao salvar (ex.: desembarque extra na escola). */
  avisos: string[];
}

const vaiDesembarcar = (d: DependenteParadaDTO) => d.statusEmbarque !== 'FALTOU' && d.statusEmbarque !== 'DESEMBARCADO';

/**
 * Cada aluno precisa embarcar antes de desembarcar (mesma regra do servidor).
 * - Desembarque na escola antes do embarque de parte dos alunos: eles vão para um desembarque extra nessa escola,
 *   depois do último embarque deles (ou para um desembarque dessa escola que já esteja depois).
 * - Desembarque na escola antes de todos os embarques, ou entrega em casa antes do embarque na escola: erro.
 */
export function analisarOrdem(paradas: ParadaViagemDTO[], ida: boolean): AnaliseOrdem {
  const erros: string[] = [];
  const avisos: string[] = [];
  const embarque = new Map<number, number>();
  paradas.forEach((p, i) => {
    if (p.tipoParada !== 'MOTORISTA' && ehEmbarque(p, ida)) p.listaDependentes.forEach((d) => embarque.set(d.id, i));
  });
  paradas.forEach((p, i) => {
    if (p.tipoParada === 'MOTORISTA' || ehEmbarque(p, ida)) return;
    const ativos = p.listaDependentes.filter(vaiDesembarcar);
    const antecipados = ativos.filter((d) => (embarque.get(d.id) ?? -1) > i);
    if (!antecipados.length) return;
    const nomes = nomesDosAlunos(antecipados);
    if (p.tipoParada !== 'ESCOLA') {
      erros.push(`A entrega de ${nomes} não pode vir antes do embarque na escola.`);
      return;
    }
    if (antecipados.length === ativos.length) {
      erros.push(`O desembarque na ${nomeEscola(p)} precisa vir depois do embarque de pelo menos um aluno dessa escola.`);
      return;
    }
    const ultimo = Math.max(...antecipados.map((d) => embarque.get(d.id) ?? i));
    const existente = paradas.findIndex(
      (q, k) => k > ultimo && q !== p && q.tipoParada === 'ESCOLA' && !ehEmbarque(q, ida) && q.endereco === p.endereco,
    );
    avisos.push(
      existente >= 0
        ? `${nomes} ${antecipados.length > 1 ? 'passam' : 'passa'} para o desembarque seguinte na ${nomeEscola(p)} (parada ${existente + 1}).`
        : `${nomes} ainda não ${antecipados.length > 1 ? 'embarcaram' : 'embarcou'} quando a perua passa na ${nomeEscola(p)}. Ao salvar, será criado um novo desembarque nessa escola no fim da rota, antes da casa do motorista.`,
    );
  });
  return { erros, avisos };
}
