import { api, API_ENDPOINTS } from './api';
import { ContraparteDTO, EscolaBuscaDTO, MotoristaDTO, SolicitacaoDTO, VeiculoDTO } from '../types';

export const motoristaService = {
  cadastrar: async (data: MotoristaDTO): Promise<MotoristaDTO> => {
    const response = await api.post(API_ENDPOINTS.cadastrarMotorista, data);
    return response.data;
  },

  cadastrarVeiculo: async (idMotorista: number, data: VeiculoDTO): Promise<MotoristaDTO> => {
    const response = await api.post(API_ENDPOINTS.cadastrarVeiculo(idMotorista), data);
    return response.data;
  },

  /** Atualiza o veículo já cadastrado (PUT /Motorista/{id}/Veiculo). */
  atualizarVeiculo: async (idMotorista: number, data: VeiculoDTO): Promise<MotoristaDTO> => {
    const response = await api.put(API_ENDPOINTS.atualizarVeiculo(idMotorista), data);
    return response.data;
  },

  alterarInfos: async (data: MotoristaDTO): Promise<MotoristaDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarInfosMotorista, data);
    return response.data;
  },

  /** Busca escolas por nome (mín. 2 letras) ou CNPJ, para criar "Viagem para <escola>". */
  buscarEscolas: async (termo: string): Promise<EscolaBuscaDTO[]> => {
    const response = await api.get(API_ENDPOINTS.buscarEscolasMotorista, { params: { termo } });
    return response.data;
  },

  /** Convites enviados e pedidos de vaga recebidos, ainda sem resposta. */
  listarSolicitacoes: async (idMotorista: number): Promise<SolicitacaoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.solicitacoesMotorista(idMotorista));
    return response.data;
  },

  /** Responsável e aluno de um pedido de vaga (pop-up antes de aceitar). CPF e e-mail vêm mascarados. */
  contraparte: async (idSolicitacao: number): Promise<ContraparteDTO> => {
    const response = await api.get(API_ENDPOINTS.contraparteMotorista(idSolicitacao));
    return response.data;
  },

  /** Aceita ou recusa um pedido. Ao aceitar, o motorista precisa confirmar o compartilhamento dos dados. */
  responderSolicitacao: async (
    idSolicitacao: number,
    aceito: boolean,
    compartilhamentoAutorizado = false,
  ): Promise<SolicitacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.responderSolicitacaoMotorista(idSolicitacao), {
      aceito,
      compartilhamentoAutorizado: aceito ? compartilhamentoAutorizado : undefined,
    });
    return response.data;
  },
};
