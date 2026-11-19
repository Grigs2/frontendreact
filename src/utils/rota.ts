import { RotaViagemDTO } from '../types';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

/** Decodifica o formato "encoded polyline" do Google (precisão de 5 casas). */
export function decodificarPolyline(codigo: string): Coordenada[] {
  const pontos: Coordenada[] = [];
  let indice = 0;
  let lat = 0;
  let lng = 0;
  while (indice < codigo.length) {
    for (const eixo of [0, 1]) {
      let resultado = 0;
      let deslocamento = 0;
      let byte: number;
      do {
        byte = codigo.charCodeAt(indice++) - 63;
        resultado |= (byte & 0x1f) << deslocamento;
        deslocamento += 5;
      } while (byte >= 0x20 && indice < codigo.length);
      const delta = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
      if (eixo === 0) lat += delta;
      else lng += delta;
    }
    pontos.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return pontos;
}

/** Todos os trechos da rota numa linha só. */
export const linhaDaRota = (rota?: RotaViagemDTO | null): Coordenada[] =>
  (rota?.polylines ?? []).flatMap((p) => decodificarPolyline(p));

/** "agora", "1 min", "12 min", "1 h 05 min". */
export function tempoAte(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

/** "350 m" ou "2,4 km". */
export function distancia(metros: number): string {
  if (metros < 1000) return `${Math.max(10, Math.round(metros / 10) * 10)} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Primeira linha da instrução do Google (as seguintes são pontos de referência). */
export const instrucaoCurta = (texto?: string | null) => (texto ?? '').split('\n')[0].trim();
