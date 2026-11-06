import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { authSession } from './authSession';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Rotas públicas do backend (SecurityConfig): não recebem Bearer nem disparam renovação de sessão.
const PUBLIC_ROUTES = [
  '/Autenticacao/Entrar',
  '/Autenticacao/Renovar',
  '/Autenticacao/SolicitarRedefinicaoSenha',
  '/Autenticacao/RedefinirSenha',
  '/Motorista/Cadastrar',
  '/Responsavel/Cadastrar',
  '/Escola/Cadastrar',
  '/Termos/vigente',
];

// Comparação exata do caminho: "/Responsavel/CadastrarDependente/2" NÃO é pública só por começar com "/Responsavel/Cadastrar".
const isPublic = (url?: string) => {
  if (!url) return false;
  const path = url.split('?')[0].replace(/\/+$/, '');
  return PUBLIC_ROUTES.includes(path);
};

// Mensagem do SecurityJsonExceptionHandler do backend quando o token é ausente/inválido/expirado.
// Outros 401 (ex.: "senha atual incorreta" em AlterarInfos/AlterarSenha) são regra de negócio e não renovam a sessão.
const TOKEN_REJECTED_MESSAGE = 'Credenciais ausentes, inválidas ou expiradas';

const isTokenRejection = (error: AxiosError) => {
  const message = (error.response?.data as any)?.message;
  return !message || message === TOKEN_REJECTED_MESSAGE;
};

api.interceptors.request.use(async (config) => {
  if (isPublic(config.url)) return config;
  // Renovação proativa: evita um 401 previsível quando o access token (15 min) já venceu.
  if (authSession.isAccessTokenExpiring()) {
    try {
      await authSession.refresh();
    } catch {
      // segue com o token atual; o tratamento de 401 abaixo decide se a sessão expirou
    }
  }
  const token = authSession.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 de token em rota protegida: renova a sessão uma vez e repete a requisição.
// Se a renovação for recusada, a sessão expirou e o app volta para o login.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isPublic(original.url) ||
      !isTokenRejection(error)
    ) {
      throw error;
    }
    original._retry = true;
    try {
      const session = await authSession.refresh();
      original.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(original);
    } catch (refreshError: any) {
      if (refreshError?.response || !(await authSession.getRefreshToken())) {
        authSession.notifySessionExpired();
      }
      throw error;
    }
  },
);

// API Endpoint Map (Legacy or utility)
export const API_ENDPOINTS = {
  entrar: '/Autenticacao/Entrar',
  sair: '/Autenticacao/Sair',
  alterarSenha: '/Autenticacao/AlterarSenha',
  solicitarRedefinicaoSenha: '/Autenticacao/SolicitarRedefinicaoSenha',
  redefinirSenha: '/Autenticacao/RedefinirSenha',

  perfilMotorista: '/Motorista/Perfil',
  perfilResponsavel: '/Responsavel/Perfil',
  perfilEscola: '/Escola/Perfil',


  cadastrarMotorista: '/Motorista/Cadastrar',
  cadastrarResponsavel: '/Responsavel/Cadastrar',
  cadastrarEscola: '/Escola/Cadastrar',
  
  cadastrarVeiculo: (idMotorista: number) => `/Motorista/CadastrarVeiculo/${idMotorista}`,
  cadastrarDependente: (idResponsavel: number) => `/Responsavel/CadastrarDependente/${idResponsavel}`,
  
  listarEscolas: '/Responsavel/ListarEscolas',
  vincularEscola: (idR: number, idE: number, idD: number) => `/Responsavel/VincularEscola/${idR}/${idE}/${idD}`,
  
  monitorarDependente: (idDependente: number) => `/Responsavel/Monitorar/${idDependente}`,
  responderSolicitacao: (idSolicitacao: number) => `/Responsavel/ResponderSolicitacao/${idSolicitacao}`,
  listarSolicitacoesResponsavel: (idResponsavel: number) => `/Responsavel/ListarSolicitacoes/${idResponsavel}`,
  encerrarVinculoViagem: (idSolicitacao: number) => `/Responsavel/EncerrarVinculoViagem/${idSolicitacao}`,
  alterarInfosResponsavel: '/Responsavel/AlterarInfos',
  alterarInfosDependente: '/Responsavel/Dependente/AlterarInfos',
  alterarInfosMotorista: '/Motorista/AlterarInfos',
  alterarInfosEscola: '/Escola/AlterarInfos',
  
  listarViagens: (idMotorista: number) => `/Viagem/ListarViagens/${idMotorista}`,
  desativarViagem: (idViagem: number) => `/Viagem/DesativarViagem/${idViagem}`,
  historicoViagens: (idMotorista: number) => `/Viagem/Historico/${idMotorista}`,
  consultarMotoristaViagem: (idViagemDia: number) => `/Viagem/ConsultarMotorista/${idViagemDia}`,
  
  criarViagem: (idMotorista: number) => `/Viagem/CriarViagem/${idMotorista}`,
  visualizarViagem: (idViagem: number) => `/Viagem/Visualizar/${idViagem}`,
  dependentesDisponiveis: (idViagem: number) => `/Viagem/DependentesDisponiveis/${idViagem}`,
  solicitarDependente: (idViagem: number, idDependente: number) => `/Viagem/SolicitarDependente/${idViagem}/${idDependente}`,

  // Busca e solicitações nos dois sentidos
  buscarEscolasMotorista: '/Motorista/Escolas',
  solicitacoesMotorista: (idMotorista: number) => `/Motorista/${idMotorista}/Solicitacoes`,
  responderSolicitacaoMotorista: (idSolicitacao: number) => `/Motorista/Solicitacoes/${idSolicitacao}/Responder`,
  buscarMotoristas: (idResponsavel: number) => `/Responsavel/${idResponsavel}/Motoristas/Buscar`,
  solicitarTransporte: (idViagem: number, idDependente: number) => `/Responsavel/SolicitarTransporte/${idViagem}/${idDependente}`,
  enderecosDependente: (idDependente: number) => `/Responsavel/Dependente/${idDependente}/Enderecos`,
  enderecoDependente: (idDependente: number, idEndereco: number) => `/Responsavel/Dependente/${idDependente}/Enderecos/${idEndereco}`,
  atualizarVeiculo: (idMotorista: number) => `/Motorista/${idMotorista}/Veiculo`,
  
  iniciarViagemDia: (idViagem: number) => `/Viagem/IniciarViagemDia/${idViagem}`,
  alterarStatusViagemDia: '/Viagem/AlterarStatusViagemDia',
  alterarStatusPresenca: '/Viagem/AlterarStatusPresenca',
  buscarParadasViagemDia: (idViagemDia: number) => `/Viagem/BuscarParadasViagemDia/${idViagemDia}`,
  visualizarViagemDia: (idViagemDia: number) => `/Viagem/VisualizarViagemDia/${idViagemDia}`,
  
  enviarNotificacao: '/Notificacao/Enviar',
  listarNotificacoes: (idUsuario: number) => `/Notificacao/Listar/${idUsuario}`,
  visualizarNotificacao: (idNotificacao: number) => `/Notificacao/VisualizarNotificacao/${idNotificacao}`,
  listarUsuariosNotificacao: '/Notificacao/ListarUsuarios',
  contarNaoLidas: '/Notificacao/NaoLidas/Contagem',
  marcarTodasLidas: '/Notificacao/MarcarTodasLidas',
  registrarDispositivo: '/Notificacao/Dispositivos',
  removerDispositivo: '/Notificacao/Dispositivos/Remover',

  historicoDependente: (idDependente: number) => `/Responsavel/Dependente/${idDependente}/Historico`,
  ausencias: (idDependente: number) => `/Responsavel/Dependente/${idDependente}/Ausencias`,
  cancelarAusencia: (idDependente: number, idAusencia: number) =>
    `/Responsavel/Dependente/${idDependente}/Ausencias/${idAusencia}`,
  avisarAtraso: (idViagemDia: number) => `/Viagem/ViagemDia/${idViagemDia}/Atraso`,
  historicoPresencaViagemDia: (idViagemDia: number) => `/Viagem/HistoricoPresenca/${idViagemDia}`,

  termosVigente: '/Termos/vigente',
  aceitarTermos: '/Autenticacao/AceitarTermos',
};
