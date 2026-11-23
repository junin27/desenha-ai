import type { Ponto } from "./desenho";

/**
 * Distância euclidiana do ponto P ao segmento AB; se A == B, distância até A.
 * Mesma ordem de operações de `desenha_ml.geometria.distancias_ao_segmento`.
 *
 * @example
 * distanciaAoSegmento([13, 4], [0, 0], [10, 0]); // 5
 */
export function distanciaAoSegmento(p: Ponto, a: Ponto, b: Ponto): number {
  const abX = b[0] - a[0];
  const abY = b[1] - a[1];
  const comprimento2 = abX * abX + abY * abY;
  if (comprimento2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = limitar(((p[0] - a[0]) * abX + (p[1] - a[1]) * abY) / comprimento2, 0, 1);
  return Math.hypot(p[0] - (a[0] + t * abX), p[1] - (a[1] + t * abY));
}

export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}
