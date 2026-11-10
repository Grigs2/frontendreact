import { api, API_ENDPOINTS } from './api';
import { ViagemDTO, DependenteAnonimoDTO, SolicitacaoDTO, ViagemDiaDTO, ParadaViagemDTO, ViagemDiaResumoDTO } from '../types';

/** Períodos aceitos pelo backend (enum Periodo). */
export const PERIODOS = ['MANHA_IDA', 'MANHA_VOLTA', 'TARDE_IDA', 'TARDE_VOLTA', 'NOITE_IDA', 'NOITE_VOLTA'] as const;

const PERIODO_LABEL: Record<string, string> = {
  MANHA_IDA: 'Manhã · ida',
  MANHA_VOLTA: 'Manhã · volta',
  TARDE_IDA: 'Tarde · ida',
  TARDE_VOLTA: 'Tarde · volta',
  NOITE_IDA: 'Noite · ida',
  NOITE_VOLTA: 'Noite · volta',
  // Período de aula do aluno
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
};

export const periodoLabel = (periodo?: string | null) => (periodo ? PERIODO_LABEL[periodo] ?? periodo.replace('_', ' ') : '');

/** Nome exibido da viagem: o editado, ou o padrão de ida/volta com as escolas atendidas. */
export const escolasNomes = (viagem?: Pick<ViagemDTO, 'escolas'> | null) =>
  (viagem?.escolas ?? []).map((e) => e.nome).join(', ');

export const viagemNome = (viagem?: Pick<ViagemDTO, 'nome' | 'escolas' | 'periodo'> | null) => {
  if (viagem?.nome) return viagem.nome;
  const nomes = escolasNomes(viagem);
  if (!nomes) return `Viagem ${periodoLabel(viagem?.periodo)}`;
  return viagem?.periodo?.endsWith('_VOLTA')
    ? `Viagem de volta das escola(s): ${nomes}`
    : `Viagem para escola(s): ${nomes}`;
};

export const viagemService = {
  criar: async (idMotorista: number, periodo: string, escolaIds: number[], nome?: string): Promise<ViagemDTO> => {
    const escolas = escolaIds.map((id) => ({ id, nome: '' }));
    const response = await api.post(API_ENDPOINTS.criarViagem(idMotorista), { periodo, escolas, nome: nome?.trim() || null });
    return response.data;
  },

  /** Nome vazio volta ao padrão de ida/volta. */
  atualizarNome: async (idViagem: number, nome: string): Promise<ViagemDTO> => {
    const response = await api.put(API_ENDPOINTS.atualizarNomeViagem(idViagem), { nome: nome.trim() || null });
    return response.data;
  },

  visualizar: async (idViagem: number): Promise<any> => {
    const response = await api.get(API_ENDPOINTS.visualizarViagem(idViagem));
    return response.data;
  },

  listarDependentesDisponiveis: async (idViagem: number): Promise<DependenteAnonimoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.dependentesDisponiveis(idViagem));
    return response.data;
  },

  solicitarDependente: async (idViagem: number, idDependente: number): Promise<SolicitacaoDTO> => {
    const response = await api.post(API_ENDPOINTS.solicitarDependente(idViagem, idDependente));
    return response.data;
  },

  iniciarViagemDia: async (idViagem: number): Promise<ViagemDiaDTO> => {
    const response = await api.post(API_ENDPOINTS.iniciarViagemDia(idViagem));
    return response.data;
  },

  /** Cancelar e interromper exigem motivo (regra da API). */
  alterarStatusViagemDia: async (idViagemDia: number, novoStatus: string, motivo?: string): Promise<ViagemDiaDTO> => {
    const response = await api.put(API_ENDPOINTS.alterarStatusViagemDia, { idViagemDia, novoStatus, motivo: motivo?.trim() || undefined });
    return response.data;
  },

  alterarStatusPresenca: async (idViagemDia: number, idDependente: number, novoStatus: string): Promise<ParadaViagemDTO[]> => {
    const response = await api.put(API_ENDPOINTS.alterarStatusPresenca, { idViagemDia, idDependente, novoStatus });
    return response.data;
  },

  buscarParadasViagemDia: async (idViagemDia: number): Promise<ParadaViagemDTO[]> => {
    const response = await api.get(API_ENDPOINTS.buscarParadasViagemDia(idViagemDia));
    return response.data;
  },

  visualizarViagemDia: async (idViagemDia: number): Promise<ViagemDiaDTO> => {
    const response = await api.get(API_ENDPOINTS.visualizarViagemDia(idViagemDia));
    return response.data;
  },

  listarViagens: async (idMotorista: number): Promise<ViagemDTO[]> => {
    const response = await api.get(API_ENDPOINTS.listarViagens(idMotorista));
    return response.data;
  },

  desativarViagem: async (idViagem: number): Promise<void> => {
    await api.put(API_ENDPOINTS.desativarViagem(idViagem));
  },

  /** Viagens do dia já realizadas, com contagens, início, fim e motivo (padrão: último ano). */
  historico: async (idMotorista: number, de?: string, ate?: string): Promise<ViagemDiaResumoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.historicoViagens(idMotorista), { params: { de, ate } });
    return response.data;
  },

  /** Avisa os responsáveis de que a viagem está atrasada (5 a 180 min; no máximo um aviso a cada 10 min). */
  avisarAtraso: async (idViagemDia: number, minutos: number, motivo?: string): Promise<void> => {
    await api.post(API_ENDPOINTS.avisarAtraso(idViagemDia), { minutos, motivo: motivo?.trim() || null });
  },

  consultarMotorista: async (idViagemDia: number): Promise<any> => {
    const response = await api.get(API_ENDPOINTS.consultarMotoristaViagem(idViagemDia));
    return response.data;
  },
};
