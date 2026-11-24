import { api, API_ENDPOINTS, fonteAutenticada } from './api';
import {
  DocumentoMotoristaDTO,
  ImagemDocumentoDTO,
  LadoDocumento,
  SubmeterDocumentoDTO,
  TipoDocumento,
} from '../types';

export const TIPOS_DOCUMENTO: TipoDocumento[] = ['CNH', 'VISTORIA', 'LICENCIAMENTO'];

/** Lados exigidos para aprovar cada tipo (contrato de imagens: R2). */
export const LADOS_DOCUMENTO: Record<TipoDocumento, LadoDocumento[]> = {
  CNH: ['FRENTE', 'VERSO'],
  LICENCIAMENTO: ['FRENTE', 'VERSO'],
  VISTORIA: ['UNICA'],
};

export const LADO_LABEL: Record<LadoDocumento, string> = {
  FRENTE: 'Frente',
  VERSO: 'Verso',
  UNICA: 'Foto do veículo',
};

/** Limite por arquivo, validado no app antes do envio e também no back (413). */
export const LIMITE_IMAGEM_BYTES = 1024 * 1024;
export const TIPOS_IMAGEM_ACEITOS = ['image/jpeg', 'image/png'];

/** Status em que o motorista ainda pode enviar ou trocar imagens (o back retorna 409 nos demais). */
export const podeEnviarImagens = (doc: DocumentoMotoristaDTO) => doc.status === 'PENDENTE' || doc.status === 'RECUSADO';

export interface ArquivoImagem {
  uri: string;
  name: string;
  type: string;
}

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

  /** Imagens já enviadas de um documento (metadados, sem o conteúdo). */
  listarImagens: async (idMotorista: number, idDocumento: number): Promise<ImagemDocumentoDTO[]> => {
    const response = await api.get(API_ENDPOINTS.imagensDocumentoMotorista(idMotorista, idDocumento));
    return response.data ?? [];
  },

  /** Envia (ou substitui) a imagem de um lado do documento. */
  enviarImagem: async (
    idMotorista: number,
    idDocumento: number,
    lado: LadoDocumento,
    arquivo: ArquivoImagem,
  ): Promise<ImagemDocumentoDTO> => {
    const form = new FormData();
    form.append('arquivo', { uri: arquivo.uri, name: arquivo.name, type: arquivo.type } as unknown as Blob);
    // 'Content-Type: false' remove o JSON padrão da instância; o boundary do multipart é definido pelo cliente HTTP.
    const response = await api.post(API_ENDPOINTS.imagemDocumentoMotorista(idMotorista, idDocumento, lado), form, {
      headers: { 'Content-Type': false },
      timeout: 30000,
    });
    return response.data;
  },

  /** Fonte autenticada para exibir a imagem de um lado (com o token no header). */
  fonteImagem: (idMotorista: number, idDocumento: number, lado: LadoDocumento) =>
    fonteAutenticada(API_ENDPOINTS.imagemDocumentoMotorista(idMotorista, idDocumento, lado)),
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
