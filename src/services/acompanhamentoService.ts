import { responsavelService } from './responsavelService';
import { viagemService } from './viagemService';
import { MonitoramentoDTO, ParadaViagemDTO, ViagemDiaDTO } from '../types';
import { todayIso } from '../utils/format';

/** Dados da viagem de hoje de um aluno, usados no Início e no Acompanhar do Responsável. */
export interface ViagemDoAluno {
  monitor: MonitoramentoDTO | null;
  /** Execução de hoje (ou a que está com o aluno embarcado), se houver. */
  execucao: ViagemDiaDTO | null;
  paradas: ParadaViagemDTO[];
}

/** A execução do monitoramento conta como "de hoje" se a data é hoje ou se o aluno ainda está embarcado. */
export const execucaoDeHoje = (m: MonitoramentoDTO | null) => {
  const atual = m?.statusAtual ?? null;
  return atual && (atual.data === todayIso() || atual.status === 'EMBARCADO') ? atual : null;
};

export const acompanhamentoService = {
  /**
   * Monitoramento + execução + paradas. Falhas na execução ou nas paradas não impedem o resto:
   * o card mostra o que estiver disponível.
   */
  carregar: async (dependenteId: number): Promise<ViagemDoAluno> => {
    const monitor = await responsavelService.monitorar(dependenteId).catch(() => null);
    const atual = execucaoDeHoje(monitor);
    if (!atual?.viagemDiaId) return { monitor, execucao: null, paradas: [] };
    const [execucao, paradas] = await Promise.all([
      viagemService.visualizarViagemDia(atual.viagemDiaId).catch(() => null),
      viagemService.buscarParadasViagemDia(atual.viagemDiaId).catch(() => [] as ParadaViagemDTO[]),
    ]);
    return { monitor, execucao, paradas: Array.isArray(paradas) ? paradas : [] };
  },
};
