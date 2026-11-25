import type { Ponto, Traco } from "./desenho";

/** Raio da borracha, em pixels do quadro (spec `ferramentas-de-desenho`). */
export const RAIO_DA_BORRACHA = 18;

/**
 * Traços que sobram depois de a borracha passar pelo ponto: cada traço que chega a até `raio` do ponto
 * sai inteiro. Apagar traços inteiros (e não pixels) mantém a imagem da CNN e a sequência da LSTM como
 * o mesmo desenho (D3 do design). A ordem dos traços restantes é a original.
 *
 * @example
 * tracosForaDaBorracha([[[0, 0], [100, 0]], [[0, 50], [100, 50]]], [50, 5]); // [[[0, 50], [100, 50]]]
 */
export function tracosForaDaBorracha(
  tracos: readonly Traco[],
  ponto: Ponto,
  raio: number = RAIO_DA_BORRACHA,
): Traco[] {
  return tracos.filter((traco) => distanciaAoTraco(traco, ponto) > raio);
}

function distanciaAoTraco(traco: Traco, ponto: Ponto): number {
  const primeiro = traco[0];
  if (primeiro === undefined) return Number.POSITIVE_INFINITY;
  let menor = distanciaAoSegmento(primeiro, primeiro, ponto);
  for (let indice = 1; indice < traco.length; indice++) {
    const inicio = traco[indice - 1];
    const fim = traco[indice];
    if (inicio !== undefined && fim !== undefined)
      menor = Math.min(menor, distanciaAoSegmento(inicio, fim, ponto));
  }
  return menor;
}

/** Distância do ponto ao segmento [inicio, fim] (projeção limitada às pontas). */
function distanciaAoSegmento(inicio: Ponto, fim: Ponto, ponto: Ponto): number {
  const [ax, ay] = inicio;
  const [bx, by] = fim;
  const [px, py] = ponto;
  const dx = bx - ax;
  const dy = by - ay;
  const comprimento2 = dx * dx + dy * dy;
  const t =
    comprimento2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / comprimento2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
