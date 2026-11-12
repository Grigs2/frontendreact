import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { api, API_ENDPOINTS } from './api';
import { EventoPresencaOfflineDTO, ResultadoEventoPresencaDTO, StatusViagemPresenca } from '../types';

// Fila local de eventos de presença registrados sem conexão (decisão 11 do backend):
// - só ESPERANDO→EMBARCADO, ESPERANDO→FALTOU e EMBARCADO→DESEMBARCADO;
// - UUID v4 por evento, gerado no aparelho; lotes de até 100;
// - CONFLITO/REJEITADO nunca sobrescrevem o servidor: ficam visíveis até o motorista dispensar.
// A fila guarda só IDs e status (sem nomes ou dados pessoais) e é separada por usuário.

const KEY = (usuarioId: number) => `tioDaPerua.filaPresenca.${usuarioId}`;
const LOTE_MAX = 100;

export type SituacaoEvento = 'PENDENTE' | 'CONFLITO' | 'REJEITADO';

export interface EventoFila extends EventoPresencaOfflineDTO {
  situacao: SituacaoEvento;
  mensagem?: string | null;
  /** Estado atual informado pelo servidor quando houve conflito. */
  statusServidor?: StatusViagemPresenca | null;
}

const TRANSICOES_OFFLINE: Record<string, StatusViagemPresenca[]> = {
  ESPERANDO: ['EMBARCADO', 'FALTOU'],
  EMBARCADO: ['DESEMBARCADO'],
};

export const podeRegistrarOffline = (de: StatusViagemPresenca, para: StatusViagemPresenca) =>
  (TRANSICOES_OFFLINE[de] ?? []).includes(para);

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

const ler = async (usuarioId: number): Promise<EventoFila[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY(usuarioId));
    return raw ? (JSON.parse(raw) as EventoFila[]) : [];
  } catch {
    return [];
  }
};

const gravar = async (usuarioId: number, fila: EventoFila[]) => {
  await AsyncStorage.setItem(KEY(usuarioId), JSON.stringify(fila));
  notify();
};

let sincronizando: Promise<ResultadoEventoPresencaDTO[]> | null = null;

export const offlineQueue = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  listar: ler,

  async pendentes(usuarioId: number) {
    return (await ler(usuarioId)).filter((e) => e.situacao === 'PENDENTE');
  },

  /** Último status conhecido no aparelho para um aluno da execução (inclui eventos ainda não enviados). */
  async statusLocal(usuarioId: number, idViagemDia: number): Promise<Record<number, StatusViagemPresenca>> {
    const mapa: Record<number, StatusViagemPresenca> = {};
    for (const e of await ler(usuarioId)) {
      if (e.idViagemDia === idViagemDia && e.situacao === 'PENDENTE') mapa[e.idDependente] = e.statusNovo;
    }
    return mapa;
  },

  async enfileirar(
    usuarioId: number,
    idViagemDia: number,
    idDependente: number,
    statusEsperado: StatusViagemPresenca,
    statusNovo: StatusViagemPresenca,
  ): Promise<EventoFila> {
    if (!podeRegistrarOffline(statusEsperado, statusNovo)) {
      throw new Error('Esta alteração não pode ser registrada sem conexão.');
    }
    const fila = await ler(usuarioId);
    const evento: EventoFila = {
      idEvento: Crypto.randomUUID(),
      idViagemDia,
      idDependente,
      statusEsperado,
      statusNovo,
      ocorridoEm: new Date().toISOString(),
      situacao: 'PENDENTE',
    };
    fila.push(evento);
    await gravar(usuarioId, fila);
    return evento;
  },

  /**
   * Envia os pendentes em lotes. APLICADO/DUPLICADO saem da fila; CONFLITO/REJEITADO ficam para o motorista ver.
   * Falha de rede mantém tudo como PENDENTE (o erro é repassado para a tela oferecer nova tentativa).
   */
  sincronizar(usuarioId: number): Promise<ResultadoEventoPresencaDTO[]> {
    if (sincronizando) return sincronizando;
    sincronizando = (async () => {
      const pendentes = (await ler(usuarioId)).filter((e) => e.situacao === 'PENDENTE');
      const resultados: ResultadoEventoPresencaDTO[] = [];
      for (let i = 0; i < pendentes.length; i += LOTE_MAX) {
        const eventos = pendentes.slice(i, i + LOTE_MAX).map(({ situacao, mensagem, statusServidor, ...e }) => e);
        const { data } = await api.post<{ resultados: ResultadoEventoPresencaDTO[] }>(
          API_ENDPOINTS.sincronizarPresencasOffline,
          { eventos },
        );
        resultados.push(...(data?.resultados ?? []));
      }
      if (resultados.length) {
        const porId = new Map(resultados.map((r) => [r.idEvento, r]));
        // Relê a fila: eventos podem ter sido adicionados durante o envio.
        const atual = await ler(usuarioId);
        const nova = atual.flatMap((e): EventoFila[] => {
          const r = porId.get(e.idEvento);
          if (!r) return [e];
          if (r.resultado === 'APLICADO' || r.resultado === 'DUPLICADO') return [];
          return [{ ...e, situacao: r.resultado, mensagem: r.mensagem, statusServidor: r.statusAtual }];
        });
        await gravar(usuarioId, nova);
      }
      return resultados;
    })().finally(() => {
      sincronizando = null;
    });
    return sincronizando;
  },

  /** Remove um evento em CONFLITO/REJEITADO depois que o motorista viu o aviso. */
  async descartar(usuarioId: number, idEvento: string) {
    const fila = await ler(usuarioId);
    await gravar(usuarioId, fila.filter((e) => e.idEvento !== idEvento));
  },
};
