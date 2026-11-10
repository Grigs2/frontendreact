// src/types.ts

export type UserRole = 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA' | null;

export interface UsuarioDTO {
  id?: number;
  email: string;
  senha?: string | null;
  endereco: string;
  telefone: string;
  tipoPerfil: 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA';
  /** Obrigatório (true) em novos cadastros no backend com JWT */
  aceitouTermos?: boolean | null;
}

export type StatusValidacaoEndereco = 'VALIDADO' | 'PENDENTE';

/** Endereço estruturado (motorista e escola). O CEP é validado no ViaCEP pelo backend. */
export interface EnderecoOperacionalDTO {
  id?: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  statusValidacao?: StatusValidacaoEndereco | null;
}

export type TipoPerfil = 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA' | 'ADMIN';

export interface PerfilAutenticadoDTO {
  id: number;
  usuarioId: number;
  nome: string;
  tipoPerfil: TipoPerfil;
}

export interface AutenticacaoResponseDTO {
  tokenType: string;
  accessToken: string;
  /** segundos */
  accessTokenExpiresIn: number;
  refreshToken: string;
  /** segundos */
  refreshTokenExpiresIn: number;
  perfil: PerfilAutenticadoDTO;
  /** true quando a versão vigente dos termos é diferente da que o usuário aceitou (pedir novo aceite). */
  termosPendentes?: boolean;
}

export interface VeiculoDTO {
  id?: number;
  modelo: string;
  placa: string;
  ano: number;
  capacidade: number;
  cor?: string | null;
}

export interface MotoristaDTO {
  id?: number;
  nome: string;
  dataNascimento: string;
  cpf: string;
  cnh: string;
  usuarioDTO: UsuarioDTO;
  veiculoDTO?: VeiculoDTO | null;
  enderecoOperacionalDTO?: EnderecoOperacionalDTO | null;
}

export interface DependenteDTO {
  id?: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  periodo: string;
  endereco: string;
  escola?: {
    id: number;
    nome: string;
  } | null;
}

export interface ResponsavelDTO {
  id?: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  usuario: UsuarioDTO;
  dependentes?: DependenteDTO[];
}

export interface EscolaDTO {
  id?: number;
  nome: string;
  cnpj?: string | null;
  admResponsavel: string;
  usuarioDTO: UsuarioDTO;
  enderecoOperacionalDTO?: EnderecoOperacionalDTO | null;
}

export interface UsuarioResumoDTO {
  id: number;
  nome: string;
  tipoPerfil: string;
  telefone: string;
}

export interface NotificacaoDTO {
  id: number;
  titulo: string;
  mensagem: string;
  dataCriacao: string;
  visto: boolean;
  remetente: UsuarioResumoDTO;
  /** Preenchidos pelo servidor nos avisos automáticos (ausentes em backends antigos). */
  tipo?: TipoNotificacao;
  prioridade?: 'NORMAL' | 'ALTA';
  viagemDiaId?: number | null;
  dependenteId?: number | null;
  lidaEm?: string | null;
}

export type TipoNotificacao =
  | 'MOTORISTA_A_CAMINHO' | 'EMBARQUE' | 'DESEMBARQUE' | 'VIAGEM_FINALIZADA'
  | 'AUSENCIA' | 'AUSENCIA_INFORMADA' | 'ATRASO' | 'VIAGEM_CANCELADA' | 'VIAGEM_INTERROMPIDA' | 'TROCA_VEICULO'
  | 'SOLICITACAO' | 'MANUAL' | 'GERAL';

/** Grupos dos filtros da central de notificações. */
export type GrupoNotificacao = 'VIAGEM' | 'ALERTA' | 'SOLICITACAO' | 'AVISO';

/** Viagem do dia no histórico do motorista (GET /Viagem/Historico/{id}). */
export interface ViagemDiaResumoDTO {
  id: number;
  data: string;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';
  dataUltimaAlteracaoStatus?: string | null;
  viagemId?: number | null;
  viagemNome?: string | null;
  periodo?: string | null;
  totalAlunos: number;
  embarcados: number;
  desembarcados: number;
  faltas: number;
  inicio?: string | null;
  fim?: string | null;
  motivo?: string | null;
}

/** Uma viagem do dia na visão do responsável (GET /Responsavel/Dependente/{id}/Historico). */
export interface HistoricoAlunoDTO {
  viagemDiaId: number;
  data: string;
  viagemNome?: string | null;
  periodo?: string | null;
  motoristaNome?: string | null;
  placa?: string | null;
  statusPresenca?: 'ESPERANDO' | 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU' | null;
  horarioEmbarque?: string | null;
  horarioDesembarque?: string | null;
  statusViagem?: string | null;
  motivo?: string | null;
}

export type TrechoAusencia = 'TODOS' | 'IDA' | 'VOLTA';

/** Ausência avisada pelo responsável ("meu filho não vai amanhã"). */
export interface AusenciaDTO {
  id?: number;
  dependenteId?: number;
  /** yyyy-MM-dd */
  data: string;
  trecho: TrechoAusencia;
  motivo?: string | null;
}

export interface NotificacaoCreateDTO {
  titulo: string;
  mensagem: string;
  visto: false;
  remetenteId: number;
  destinatarioId: number;
}

/** Aluno visto pelo motorista antes do acordo: sem nome completo, CPF ou endereço. */
export interface DependenteAnonimoDTO {
  id: number;
  iniciais: string;
  idade?: number | null;
  periodo?: string | null;
  escola?: { id: number; nome: string } | null;
  responsavelNome?: string | null;
}

export interface SolicitacaoDTO {
  id?: number;
  viagemId: number;
  dependenteId: number;
  responsavelId: number;
  respondido: boolean;
  aceito: boolean;
  dataInicio: string;
  dataFim?: string | null;
  /** Quem pediu: o motorista convida (o responsável responde) ou o responsável pede vaga (o motorista responde). */
  origem?: 'MOTORISTA' | 'RESPONSAVEL';
  /** PENDENTE, ACEITA, RECUSADA ou EXPIRADA (vence em 3 dias). */
  status?: 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA';
  dataExpiracao?: string | null;
  /** Confirmação de que os dados do aluno/responsável serão compartilhados se aceita. */
  compartilhamentoAutorizado?: boolean | null;
  viagemNome?: string | null;
  viagemPeriodo?: string | null;
  motoristaId?: number | null;
  responsavelNome?: string | null;
  // Enriched fields
  motoristaNome?: string;
  motoristaTelefone?: string;
  dependenteNome?: string;
  escolaNome?: string;
  periodo?: string;
}

export interface ViagemDTO {
  id?: number;
  motoristaId: number;
  periodo: string;
  motoristaNome?: string;
  dependentes?: DependenteDTO[];
  ativo: boolean;
  /** Escolas atendidas pela viagem (ida ou volta). */
  escolas?: EscolaResumoDTO[] | null;
  /** Nome editável; se vazio, o servidor devolve o padrão de ida/volta com as escolas. */
  nome?: string | null;
}

export interface EscolaResumoDTO {
  id: number;
  nome: string;
}

export interface EscolaBuscaDTO {
  id: number;
  nome: string;
  cnpj: string;
}

/** Motorista na busca do responsável (dados públicos do serviço). */
export interface MotoristaDisponivelDTO {
  id: number;
  nome: string;
  veiculoModelo?: string | null;
  veiculoCor?: string | null;
  veiculoCapacidade?: number | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  proximidade: 'MESMO_BAIRRO' | 'MESMA_CIDADE' | 'OUTRA_CIDADE' | 'SEM_REFERENCIA';
  viagens: ViagemDTO[];
}

export interface EnderecoDependenteDTO {
  id?: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  finalidade: 'EMBARQUE' | 'DESEMBARQUE' | 'AMBOS';
}

export interface MotoristaViagemDTO {
  motoristaId: number;
  nomeMotorista: string;
  telefone: string;
  modeloVeiculo: string;
  placaVeiculo: string;
  corVeiculo: string;
}

export interface ViagemDiaDTO {
  id?: number;
  data: string;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';
  dataUltimaAlteracaoStatus?: string | null;
  ultimaAlteracao?: string | null;
  viagemId?: number;
  viagem?: {
    id: number;
    periodo?: string;
  };
  // Enriched fields for history and monitoring
  periodo?: string;
  nomeMotorista?: string;
  quantidadePassageiros?: number;
  horarioInicio?: string | null;
  horarioFim?: string | null;
}

export interface MonitoramentoItemDTO {
  viagemDiaId: number;
  viagemId?: number;
  status: 'ESPERANDO' | 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU';
  horarioEmbarque?: string | null;
  horarioDesembarque?: string | null;
  data?: string;
  periodoViagem?: string;
  ultimaAlteracao?: string;
}

export interface MonitoramentoDTO {
  dependenteNome: string;
  statusAtual: MonitoramentoItemDTO | null;
  historicoRecente: MonitoramentoItemDTO[];
}

export interface ViagemPresencaDTO {
  id?: number;
  viagemDiaId: number;
  dependenteId: number;
  status: 'ESPERANDO' | 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU';
  horarioEmbarque?: string | null;
  horarioDesembarque?: string | null;
}

export interface DependenteParadaDTO {
  id: number;
  nomeDependente: string;
  nomeResponsavel: string;
  statusEmbarque: 'ESPERANDO' | 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU';
}

export interface ParadaViagemDTO {
  ordem: number;
  tipoParada: 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA';
  nomeLocal: string;
  endereco: string;
  listaDependentes: DependenteParadaDTO[];
}

// Keep some legacy types if they are used and not yet migrated, but ideally we should migrate everything.
// For now, let's keep it clean and only have DTOs.
