import { api, API_ENDPOINTS } from './api';
import { DocumentoMotoristaDTO, SubmeterDocumentoDTO, TipoDocumento } from '../types';

export const TIPOS_DOCUMENTO: TipoDocumento[] = ['CNH', 'VISTORIA', 'LICENCIAMENTO'];

export const documentoService = {
  /** Histórico de submissões do motorista (todas as versões de cada documento). */
  listar: async (idMotorista: number): Promise<DocumentoMotoristaDTO[]> => {
    const response = await api.get(API_ENDPOINTS.documentosMotorista(idMotorista));
    return response.data ?? [];
  },

  /** Envia uma nova versão; ela substitui a anterior do mesmo tipo e volta para análise. */
  submeter: async (idMotorista: number, dto: SubmeterDocumentoDTO): Promise<DocumentoMotoristaDTO> => {
    const response = await api.post(API_ENDPOINTS.documentosMotorista(idMotorista), {
      ...dto,
      numero: dto.numero.trim(),
      categoria: dto.categoria?.trim() || null,
      dataRealizacao: dto.dataRealizacao || null,
    });
    return response.data;
  },
};

/** Documento vigente de cada tipo: o mais recente que ainda não foi substituído. */
export const documentosVigentes = (documentos: DocumentoMotoristaDTO[]) => {
  const vigentes: Partial<Record<TipoDocumento, DocumentoMotoristaDTO>> = {};
  for (const doc of documentos) {
    if (doc.substituidoEm) continue;
    const atual = vigentes[doc.tipo];
    if (!atual || new Date(doc.submetidoEm).getTime() > new Date(atual.submetidoEm).getTime()) {
      vigentes[doc.tipo] = doc;
    }
  }
  return vigentes;
};

/** Documentos ausentes, recusados ou vencidos (aviso; não impedem iniciar viagens). */
export const pendenciasDocumentais = (documentos: DocumentoMotoristaDTO[]) => {
  const vigentes = documentosVigentes(documentos);
  return TIPOS_DOCUMENTO.filter((tipo) => {
    const doc = vigentes[tipo];
    return !doc || doc.status === 'RECUSADO' || doc.status === 'VENCIDO';
  });
};
