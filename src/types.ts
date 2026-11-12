// src/types.ts

export type UserRole = 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA' | 'ADMIN' | null;

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
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA' | 'INTERROMPIDA';
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
  dependenteId?: number;
  statusValidacao?: StatusValidacaoEndereco | null;
  ativo?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
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
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA' | 'INTERROMPIDA';
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
  /** Necessário para reordenar a rota (PUT /Viagem/ReordenarParadasViagemDia). */
  id?: number | null;
  ordem: number;
  tipoParada: 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA';
  nomeLocal: string;
  endereco: string;
  listaDependentes: DependenteParadaDTO[];
}

// Keep some legacy types if they are used and not yet migrated, but ideally we should migrate everything.
// For now, let's keep it clean and only have DTOs.

// ---------------------------------------------------------------------------
// Implementação 1111 — contratos das fases 2, 4, 5, 6, 8, 9 e 11 do backend
// ---------------------------------------------------------------------------

export type StatusViagemDia = 'PLANEJADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA' | 'INTERROMPIDA';
export type StatusViagemPresenca = 'ESPERANDO' | 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU';

/** Página do Spring Data (endpoints /Admin e histórico de localização). */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last?: boolean;
  first?: boolean;
}

// Documentos do motorista (CNH, vistoria, licenciamento) — só metadados, sem upload.
export type TipoDocumento = 'CNH' | 'VISTORIA' | 'LICENCIAMENTO';
export type StatusDocumento = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'VENCIDO';

export interface DocumentoMotoristaDTO {
  id: number;
  tipo: TipoDocumento;
  numero: string;
  categoria?: string | null;
  /** yyyy-MM-dd */
  dataRealizacao?: string | null;
  /** yyyy-MM-dd */
  dataValidade: string;
  status: StatusDocumento;
  submetidoEm: string;
  substituidoEm?: string | null;
  revisadoEm?: string | null;
  revisadoPorId?: number | null;
  motivoRecusa?: string | null;
}

export interface SubmeterDocumentoDTO {
  tipo: TipoDocumento;
  numero: string;
  categoria?: string | null;
  dataRealizacao?: string | null;
  dataValidade: string;
}

// Vínculo motorista–escola
export type StatusVinculoEscola =
  | 'PENDENTE_ESCOLA'
  | 'PENDENTE_MOTORISTA'
  | 'ATIVO'
  | 'RECUSADO'
  | 'SUSPENSO'
  | 'ENCERRADO';

export interface VinculoEscolaDTO {
  id: number;
  escolaId: number;
  escolaNome: string;
  escolaCnpj: string;
  motoristaId: number;
  motoristaNome: string;
  status: StatusVinculoEscola;
  criadoEm: string;
  atualizadoEm: string;
}

export interface HistoricoVinculoEscolaDTO {
  id: number;
  vinculoId: number;
  statusAnterior: StatusVinculoEscola | null;
  statusNovo: StatusVinculoEscola;
  atorUsuarioId: number;
  perfilAtor: string;
  motivo?: string | null;
  ocorridoEm: string;
}

export interface MotoristaBuscaDTO {
  id: number;
  nome: string;
}

// Rede de responsáveis do dependente
export type CategoriaVinculoResponsavel = 'PAI' | 'MAE' | 'RESPONSAVEL_LEGAL' | 'OUTRO';
export type StatusConviteResponsavel = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'EXPIRADO' | 'REVOGADO';

export interface ConviteResponsavelDTO {
  id: number;
  dependenteId: number;
  dependenteNome: string;
  convidadoId: number;
  convidadoNome: string;
  convidadoEmail: string;
  convidadorId?: number | null;
  convidadorNome?: string | null;
  categoria: CategoriaVinculoResponsavel | null;
  status: StatusConviteResponsavel;
  criadoEm: string;
  expiraEm: string;
  respondidoEm?: string | null;
  revogadoEm?: string | null;
}

export interface VinculoResponsavelDTO {
  responsavelId: number;
  nome: string;
  email?: string | null;
  categoria?: CategoriaVinculoResponsavel | null;
  responsavelCriador: boolean;
  vinculadoEm?: string | null;
}

// Planejamento e execução
export interface AgendaViagemDTO {
  idViagem: number;
  periodo: string;
  /** yyyy-MM-dd */
  data: string;
  idViagemDia: number | null;
  status: StatusViagemDia | null;
  materializada: boolean;
}

export interface ProntidaoViagemDTO {
  idViagem: number;
  pronta: boolean;
  bloqueios: string[];
}

export interface HistoricoViagemDiaDTO {
  id: number;
  statusAnterior: StatusViagemDia | null;
  statusNovo: StatusViagemDia;
  atorUsuarioId: number;
  ocorridoEm: string;
  motivo?: string | null;
}

export interface HistoricoOrdemParadaDTO {
  id: number;
  idParada: number;
  ordemAnterior: number;
  ordemNova: number;
  atorUsuarioId: number;
  ocorridoEm: string;
}

export interface HistoricoViagemPresencaDTO {
  id: number;
  idPresenca: number;
  idDependente: number;
  statusAnterior: StatusViagemPresenca;
  statusNovo: StatusViagemPresenca;
  atorUsuarioId: number;
  ocorridoEm: string;
  eventoClienteId?: string | null;
  instanteDispositivo?: string | null;
  recebidoEm?: string | null;
}

// Localização (GPS) e consentimento
export interface ConsentimentoLocalizacaoDTO {
  aceito: boolean;
  versaoPolitica: string | null;
  ocorridoEm: string | null;
}

export interface EstadoConsentimentoLocalizacaoDTO {
  idViagemDia: number;
  versaoPolitica: string | null;
  motoristaConsentiu: boolean;
  dependentesPendentes: number[];
  gpsSuspenso: boolean;
  podeAtualizar: boolean;
}

export interface LocalizacaoViagemDTO {
  idViagemDia: number;
  latitude: number;
  longitude: number;
  instanteDispositivo: string;
  recebidoEm: string;
  desatualizada: boolean;
}

export interface AtualizarLocalizacaoDTO {
  idViagemDia: number;
  latitude: number;
  longitude: number;
  /** ISO-8601 UTC */
  instanteDispositivo: string;
}

// Sincronização offline de presença
export type StatusEventoSincronizacao = 'APLICADO' | 'DUPLICADO' | 'CONFLITO' | 'REJEITADO';

export interface EventoPresencaOfflineDTO {
  /** UUID v4 gerado no aparelho */
  idEvento: string;
  idViagemDia: number;
  idDependente: number;
  statusEsperado: StatusViagemPresenca;
  statusNovo: StatusViagemPresenca;
  /** ISO-8601 UTC */
  ocorridoEm: string;
}

export interface ResultadoEventoPresencaDTO {
  idEvento: string;
  idViagemDia: number;
  idDependente: number;
  resultado: StatusEventoSincronizacao;
  statusAtual: StatusViagemPresenca | null;
  mensagem?: string | null;
}

// Administração
export interface AdminUsuarioResumoDTO {
  id: number;
  tipoPerfil: TipoPerfil;
  suspensa: boolean;
  emailMascarado: string;
}

export interface AdminEscolaResumoDTO {
  id: number;
  nome: string;
  cnpj: string;
  usuarioId: number;
  contaSuspensa: boolean;
}

export interface AdminVinculoMotoristaEscolaDTO {
  id: number;
  escolaId: number;
  motoristaId: number;
  status: StatusVinculoEscola;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AdminVinculoResponsavelDTO {
  dependenteId: number;
  responsavelId: number;
  status: string;
  categoria: string | null;
  responsavelCriador: boolean;
  vinculadoEm: string | null;
}

export interface AdminAuditoriaDTO {
  id: number;
  atorUsuarioId: number;
  acao: string;
  tipoAlvo: string;
  alvoId: number | null;
  resultado: string;
  motivo?: string | null;
  ocorridoEm: string;
}

export interface DependenteResponsavelCriadorPendenteDTO {
  dependenteId: number;
  dependenteNome: string;
  responsaveis: { id: number; nome: string; telefone?: string | null }[];
}
