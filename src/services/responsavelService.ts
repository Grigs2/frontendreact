import { api, API_ENDPOINTS } from './api';
import { ResponsavelDTO, DependenteDTO, EscolaDTO, SolicitacaoDTO, MonitoramentoDTO } from '../types';

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

  responderSolicitacao: async (idSolicitacao: number, aceito: boolean): Promise<SolicitacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.responderSolicitacao(idSolicitacao), {
      respondido: true,
      aceito,
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
};
