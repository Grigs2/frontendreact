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
}

export interface NotificacaoCreateDTO {
  titulo: string;
  mensagem: string;
  visto: false;
  remetenteId: number;
  destinatarioId: number;
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
  // Enriched fields
  motoristaNome?: string;
  motoristaTelefone?: string;
  dependenteNome?: string;
  escolaNome?: string;
  periodo?: string;
  status?: string;
}

export interface ViagemDTO {
  id?: number;
  motoristaId: number;
  periodo: string;
  motoristaNome?: string;
  dependentes?: DependenteDTO[];
  ativo: boolean;
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
