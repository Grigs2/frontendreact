import axios from 'axios';

// Troque pelo IP da sua máquina na rede local (não use localhost no celular físico!)
const BASE_URL = 'http://localhost:8080/TioDaPerua/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Endpoint Map (Legacy or utility)
export const API_ENDPOINTS = {
  autenticarMotorista: '/Motorista/Autenticar',
  autenticarResponsavel: '/Responsavel/Autenticar',
  autenticarEscola: '/Escola/Autenticar',
  
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
  
  iniciarViagemDia: (idViagem: number) => `/Viagem/IniciarViagemDia/${idViagem}`,
  alterarStatusViagemDia: '/Viagem/AlterarStatusViagemDia',
  alterarStatusPresenca: '/Viagem/AlterarStatusPresenca',
  buscarParadasViagemDia: (idViagemDia: number) => `/Viagem/BuscarParadasViagemDia/${idViagemDia}`,
  visualizarViagemDia: (idViagemDia: number) => `/Viagem/VisualizarViagemDia/${idViagemDia}`,
  
  enviarNotificacao: '/Notificacao/Enviar',
  listarNotificacoes: (idUsuario: number) => `/Notificacao/Listar/${idUsuario}`,
};
