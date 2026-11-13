import { api, API_ENDPOINTS } from './api';
import {
  ContraparteDTO,
  ResponsavelDTO,
  DependenteDTO,
  EscolaDTO,
  SolicitacaoDTO,
  MonitoramentoDTO,
  MotoristaDisponivelDTO,
  EnderecoDependenteDTO,
  HistoricoAlunoDTO,
  AusenciaDTO,
} from '../types';

export const responsavelService = {
  cadastrar: async (data: ResponsavelDTO): Promise<ResponsavelDTO> => {
    const response = await api.post(API_ENDPOINTS.cadastrarResponsavel, data);
    return response.data;
  },

  cadastrarDependente: async (idResponsavel: number, data: DependenteDTO): Promise<ResponsavelDTO> => {
    const response = await api.post(API_ENDPOINTS.cadastrarDependente(idResponsavel), data);
    return response.data;
  },

  listarEscolas: async (): Promise<EscolaDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarEscolas);
    return response.data;
  },

  vincularEscola: async (idResponsavel: number, idEscola: number, idDependente: number): Promise<ResponsavelDTO> => {
    const response = await api.post(API_ENDPOINTS.vincularEscola(idResponsavel, idEscola, idDependente));
    return response.data;
  },

  monitorar: async (idDependente: number): Promise<MonitoramentoDTO> => {
    const response = await api.get(API_ENDPOINTS.monitorarDependente(idDependente));
    return response.data;
  },

  /** Motorista de um convite ou pedido (pop-up antes de aceitar). CPF, e-mail e placa vêm mascarados. */
  contraparte: async (idSolicitacao: number): Promise<ContraparteDTO> => {
    const response = await api.get(API_ENDPOINTS.contraparteResponsavel(idSolicitacao));
    return response.data;
  },

  responderSolicitacao: async (
    idSolicitacao: number,
    aceito: boolean,
    compartilhamentoAutorizado = false,
  ): Promise<SolicitacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.responderSolicitacao(idSolicitacao), {
      respondido: true,
      aceito,
      compartilhamentoAutorizado: aceito ? compartilhamentoAutorizado : undefined,
    });
    return response.data;
  },

  listarSolicitacoes: async (idResponsavel: number): Promise<SolicitacaoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarSolicitacoesResponsavel(idResponsavel));
    return response.data;
  },

  encerrarVinculo: async (idSolicitacao: number): Promise<SolicitacaoDTO> => {
    const response = await api.put(API_ENDPOINTS.encerrarVinculoViagem(idSolicitacao));
    return response.data;
  },

  alterarInfos: async (data: ResponsavelDTO): Promise<ResponsavelDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarInfosResponsavel, data);
    return response.data;
  },

  /** Motoristas por nome e/ou proximidade do aluno (mesmo bairro ou cidade). */
  buscarMotoristas: async (
    idResponsavel: number,
    filtros: { nome?: string; idDependente?: number; somenteProximos?: boolean },
  ): Promise<MotoristaDisponivelDTO[]> => {
    const response = await api.get(API_ENDPOINTS.buscarMotoristas(idResponsavel), {
      params: {
        nome: filtros.nome?.trim() || undefined,
        idDependente: filtros.idDependente,
        somenteProximos: filtros.somenteProximos || undefined,
      },
    });
    return response.data;
  },

  /** Pede vaga para o aluno em uma viagem; o motorista aceita ou recusa. */
  /** Exige a confirmação de que os dados do aluno serão compartilhados se o motorista aceitar. */
  solicitarTransporte: async (idViagem: number, idDependente: number): Promise<SolicitacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.solicitarTransporte(idViagem, idDependente), {
      compartilhamentoAutorizado: true,
    });
    return response.data;
  },

  listarEnderecosDependente: async (idDependente: number): Promise<EnderecoDependenteDTO[]> => {
    const response = await api.get(API_ENDPOINTS.enderecosDependente(idDependente));
    return response.data;
  },

  /** Cria ou atualiza o endereço estruturado (CEP) usado como parada do aluno. */
  salvarEnderecoDependente: async (idDependente: number, endereco: EnderecoDependenteDTO): Promise<EnderecoDependenteDTO> => {
    const { id } = endereco;
    // Só os campos do EnderecoDependenteRequestDTO (os demais são de resposta).
    const body = {
      cep: endereco.cep,
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento || null,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      uf: endereco.uf,
      finalidade: endereco.finalidade,
    };
    const response = id
      ? await api.put(API_ENDPOINTS.enderecoDependente(idDependente, id), body)
      : await api.post(API_ENDPOINTS.enderecosDependente(idDependente), body);
    return response.data;
  },

  /** Edita nome, CPF, nascimento e endereço do aluno (exige a senha do responsável). */
  alterarDependente: async (data: DependenteDTO & { senha: string }): Promise<DependenteDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarInfosDependente, data);
    return response.data;
  },

  /** Histórico do aluno (padrão: últimos 30 dias). Datas em yyyy-MM-dd. */
  historicoDependente: async (idDependente: number, de?: string, ate?: string): Promise<HistoricoAlunoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.historicoDependente(idDependente), { params: { de, ate } });
    return response.data;
  },

  /** Ausências avisadas de hoje em diante. */
  listarAusencias: async (idDependente: number): Promise<AusenciaDTO[]> => {
    const response = await api.get(API_ENDPOINTS.ausencias(idDependente));
    return response.data;
  },

  avisarAusencia: async (idDependente: number, ausencia: AusenciaDTO): Promise<AusenciaDTO> => {
    const response = await api.post(API_ENDPOINTS.ausencias(idDependente), ausencia);
    return response.data;
  },

  cancelarAusencia: async (idDependente: number, idAusencia: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.cancelarAusencia(idDependente, idAusencia));
  },
/** Desativa o endereço (o histórico das viagens passadas mantém o endereço usado na data). */
  desativarEnderecoDependente: async (idDependente: number, idEndereco: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.enderecoDependente(idDependente, idEndereco));
  },
};

