import type { Desenho } from "./desenho";
import { ESCALA_MAXIMA, normalizar } from "./normalizacao";

export const MAXIMO_DE_PONTOS = 130;

/** Sequência stroke-3 achatada (pontos × 3), pronta para o tensor [1, pontos, 3] da LSTM. */
export interface SequenciaStroke3 {
  readonly pontos: number;
  readonly valores: Float32Array;
}

/**
 * (Δx/255, Δy/255, fim_do_traço) por ponto; o primeiro ponto usa a posição absoluta. Espelha
 * `desenha_ml.sequencia`.
 *
 * @example
 * sequenciar(criarDesenho([[[0, 0], [255, 0]]])).valores; // [0, 0, 0, 1, 0, 1]
 */
export function sequenciar(desenho: Desenho): SequenciaStroke3 {
  const linhas = normalizar(desenho).tracos.flatMap((traco) =>
    traco.map(([x, y], i) => [x, y, i === traco.length - 1 ? 1 : 0] as const),
  );
  const usadas = linhas.slice(0, MAXIMO_DE_PONTOS);
  const valores = new Float32Array(usadas.length * 3);
  let anteriorX = 0;
  let anteriorY = 0;
  usadas.forEach(([x, y, fim], i) => {
    valores.set([(x - anteriorX) / ESCALA_MAXIMA, (y - anteriorY) / ESCALA_MAXIMA, fim], i * 3);
    anteriorX = x;
    anteriorY = y;
  });
  return { pontos: usadas.length, valores };
}
