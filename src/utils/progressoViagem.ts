import { ParadaViagemDTO, StatusViagemDia, StatusViagemPresenca } from '../types';
import { StatusTone } from '../theme';

/**
 * Minutos médios por parada usados na estimativa de horário.
 * Não há provedor de rota (decisão D8): a estimativa é sempre rotulada como "estimativa".
 */
export const MINUTOS_POR_PARADA = 5;

/** Situação de cada parada no mapa alternativo (linha de metrô). */
export type EstadoParada = 'concluida' | 'atual' | 'futura';

export interface ParadaProgresso {
  parada: ParadaViagemDTO;
  estado: EstadoParada;
  /** A parada tem o aluno acompanhado. */
  doAluno: boolean;
  /** Rótulo curto e sem nomes de outros alunos (privacidade). */
  rotulo: string;
}

export type TipoInteracao = 'BUSCAR_EM_CASA' | 'CHEGAR_NA_ESCOLA' | 'EMBARCAR_NA_ESCOLA' | 'CHEGAR_EM_CASA';

export interface ProximaInteracao {
  tipo: TipoInteracao;
  /** Paradas pendentes antes da parada do aluno (0 = é a próxima parada da viagem). */
  paradasAntes: number;
  /** Horário estimado (ISO) ou null quando a viagem ainda não começou. */
  estimativa: string | null;
  /** Frase do próximo passo, ex.: "O motorista vai buscar a Ana". */
  titulo: string;
  /** Rótulo do horário, ex.: "Chegada do motorista na sua casa". */
  rotuloHorario: string;
}

export interface ProgressoViagem {
  paradas: ParadaProgresso[];
  /** Índice da parada para onde o veículo está indo (-1 se terminou). */
  indiceAtual: number;
  proxima: ProximaInteracao | null;
}

export const ehIda = (periodo?: string | null) => !!periodo && periodo.endsWith('IDA');

/** Na ida o embarque é na casa do aluno e o desembarque na escola; na volta é o contrário. */
const embarqueNaParada = (p: ParadaViagemDTO, ida: boolean) =>
  p.tipoParada === 'MOTORISTA' ? false : ida ? p.tipoParada !== 'ESCOLA' : p.tipoParada === 'ESCOLA';

const paradaConcluida = (p: ParadaViagemDTO, i: number, ida: boolean, status?: StatusViagemDia | null) => {
  if (p.tipoParada === 'MOTORISTA') {
    // Saída conta como feita quando a viagem começou; o retorno, quando terminou.
    if (i === 0) return status === 'EM_ANDAMENTO' || status === 'FINALIZADA' || status === 'INTERROMPIDA';
    return status === 'FINALIZADA';
  }
  if (!p.listaDependentes.length) return status === 'FINALIZADA';
  return embarqueNaParada(p, ida)
    ? p.listaDependentes.every((d) => d.statusEmbarque !== 'ESPERANDO')
    : p.listaDependentes.every((d) => d.statusEmbarque === 'DESEMBARCADO' || d.statusEmbarque === 'FALTOU');
};

const primeiroNome = (nome?: string | null) => (nome || '').trim().split(/\s+/)[0] || 'seu aluno';

const TEXTOS: Record<TipoInteracao, { titulo: (n: string) => string; horario: string }> = {
  BUSCAR_EM_CASA: { titulo: (n) => `O motorista vai buscar ${n}`, horario: 'Chegada do motorista na sua casa' },
  CHEGAR_NA_ESCOLA: { titulo: (n) => `${n} está a caminho da escola`, horario: 'Chegada na escola' },
  EMBARCAR_NA_ESCOLA: { titulo: (n) => `${n} embarca na escola`, horario: 'Embarque na escola' },
  CHEGAR_EM_CASA: { titulo: (n) => `${n} está voltando para você`, horario: 'Chegada em casa' },
};

interface Entrada {
  paradas: ParadaViagemDTO[];
  dependenteId: number;
  dependenteNome?: string | null;
  periodo?: string | null;
  statusViagem?: StatusViagemDia | null;
  /** Instantes (ISO) do último evento conhecido: mudança de status da viagem e da presença do aluno. */
  ultimosEventos?: (string | null | undefined)[];
  agora?: number;
}

/**
 * Calcula o progresso da execução a partir das paradas: o que já foi feito, para onde o veículo vai
 * e quando deve acontecer a próxima interação com o aluno (buscar, chegar à escola, embarcar na volta, entregar).
 */
export function calcularProgresso({ paradas, dependenteId, dependenteNome, periodo, statusViagem, ultimosEventos = [], agora = Date.now() }: Entrada): ProgressoViagem {
  const ida = ehIda(periodo);
  const ordenadas = [...paradas].sort((a, b) => a.ordem - b.ordem);
  const feitas = ordenadas.map((p, i) => paradaConcluida(p, i, ida, statusViagem));
  const indiceAtual = feitas.findIndex((f) => !f);
  const doAluno = (p: ParadaViagemDTO) => p.listaDependentes.some((d) => d.id === dependenteId);
  const nome = primeiroNome(dependenteNome);

  let contador = 0;
  const lista: ParadaProgresso[] = ordenadas.map((p, i) => {
    const meu = doAluno(p);
    let rotulo: string;
    if (p.tipoParada === 'MOTORISTA') rotulo = i === 0 ? 'Saída' : 'Fim';
    else if (p.tipoParada === 'ESCOLA') rotulo = p.nomeLocal.replace(/^Escola:\s*/, '') || 'Escola';
    else if (meu) rotulo = nome;
    else rotulo = `Parada ${++contador}`;
    return { parada: p, estado: feitas[i] ? 'concluida' : i === indiceAtual ? 'atual' : 'futura', doAluno: meu, rotulo };
  });

  // Situação atual do aluno nesta execução.
  const meuStatus: StatusViagemPresenca | undefined = ordenadas
    .flatMap((p) => p.listaDependentes)
    .find((d) => d.id === dependenteId)?.statusEmbarque;

  let proxima: ProximaInteracao | null = null;
  if (meuStatus === 'ESPERANDO' || meuStatus === 'EMBARCADO') {
    const querEmbarque = meuStatus === 'ESPERANDO';
    const alvo = ordenadas.findIndex((p, i) => !feitas[i] && doAluno(p) && embarqueNaParada(p, ida) === querEmbarque);
    if (alvo >= 0) {
      const tipo: TipoInteracao = ida
        ? querEmbarque ? 'BUSCAR_EM_CASA' : 'CHEGAR_NA_ESCOLA'
        : querEmbarque ? 'EMBARCAR_NA_ESCOLA' : 'CHEGAR_EM_CASA';
      const inicio = indiceAtual < 0 ? alvo : indiceAtual;
      const paradasAntes = Math.max(0, feitas.slice(inicio, alvo).filter((f) => !f).length);
      proxima = {
        tipo,
        paradasAntes,
        estimativa: statusViagem === 'EM_ANDAMENTO' ? estimar(paradasAntes, ultimosEventos, agora) : null,
        titulo: TEXTOS[tipo].titulo(nome),
        rotuloHorario: TEXTOS[tipo].horario,
      };
    }
  }

  return { paradas: lista, indiceAtual, proxima };
}

/**
 * Estimativa simples: último evento conhecido + (paradas antes + 1) × minutos por parada,
 * nunca antes de agora + paradas antes × minutos por parada.
 */
export function estimar(paradasAntes: number, eventos: (string | null | undefined)[], agora = Date.now()): string {
  const passo = MINUTOS_POR_PARADA * 60000;
  const ultimo = Math.max(0, ...eventos.map((e) => (e ? new Date(e).getTime() : 0)).filter((t) => !Number.isNaN(t)));
  const pelaUltima = ultimo ? ultimo + (paradasAntes + 1) * passo : 0;
  return new Date(Math.max(pelaUltima, agora + paradasAntes * passo)).toISOString();
}

/** "2 paradas antes da sua casa" / "É a próxima parada". */
export function textoParadasAntes(p: ProximaInteracao): string {
  if (p.paradasAntes === 0) return 'É a próxima parada da viagem';
  const local = p.tipo === 'BUSCAR_EM_CASA' || p.tipo === 'CHEGAR_EM_CASA' ? 'da sua casa' : 'da escola';
  return `${p.paradasAntes} ${p.paradasAntes === 1 ? 'parada' : 'paradas'} antes ${local}`;
}

// ---------------------------------------------------------------------------
// Luz de status (canto do card do Início)
// ---------------------------------------------------------------------------

export interface LuzStatus {
  tone: StatusTone;
  texto: string;
}

/**
 * Situação resumida do aluno + viagem para a "luz" do card: cor do tom e texto curto.
 * A hora mostrada é a da última alteração entre o status da viagem e o do aluno.
 */
export function luzStatus(statusViagem: StatusViagemDia | null | undefined, presenca: StatusViagemPresenca | null | undefined, periodo?: string | null): LuzStatus {
  const ida = ehIda(periodo);
  if (!statusViagem && !presenca) return { tone: 'neutral', texto: 'Sem viagem hoje' };
  if (statusViagem === 'CANCELADA') return { tone: 'neutral', texto: 'Viagem cancelada' };
  if (statusViagem === 'INTERROMPIDA') return { tone: 'danger', texto: 'Viagem interrompida' };
  if (presenca === 'FALTOU') return { tone: 'danger', texto: 'Ausente' };
  if (presenca === 'DESEMBARCADO') return { tone: 'success', texto: ida ? 'Na escola' : 'Entregue' };
  if (presenca === 'EMBARCADO') return { tone: 'success', texto: 'No veículo' };
  if (statusViagem === 'FINALIZADA') return { tone: 'success', texto: 'Viagem concluída' };
  if (statusViagem === 'EM_ANDAMENTO') return { tone: 'info', texto: 'Em rota' };
  return { tone: 'warning', texto: 'Aguardando início' };
}

/** Instante mais recente (ISO) entre os informados, ou null. */
export function maisRecente(...valores: (string | null | undefined)[]): string | null {
  const t = valores.map((v) => (v ? new Date(v).getTime() : NaN)).filter((n) => !Number.isNaN(n));
  return t.length ? new Date(Math.max(...t)).toISOString() : null;
}
