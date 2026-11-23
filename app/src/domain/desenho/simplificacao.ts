import { criarDesenho, type Desenho, type Ponto, type Traco } from "./desenho";
import { distanciaAoSegmento } from "./geometria";
import { normalizar } from "./normalizacao";

export const EPSILON_PADRAO = 2;

/**
 * Normaliza e simplifica (RDP, ε = 2) um desenho capturado no jogo, para ele ficar parecido com os do
 * Quick, Draw! simplified usados no treino. Espelha `desenha_ml.simplificacao`.
 *
 * @example
 * prepararDesenhoCapturado(criarDesenho([[[0, 0], [50, 0.5], [255, 0]]])).tracos[0]; // [[0, 0], [255, 0]]
 */
export function prepararDesenhoCapturado(desenho: Desenho, epsilon = EPSILON_PADRAO): Desenho {
  return criarDesenho(normalizar(desenho).tracos.map((traco) => simplificarTraco(traco, epsilon)));
}

/** RDP iterativo (pilha explícita), com distância até o segmento. Mantém sempre o 1º e o último ponto. */
export function simplificarTraco(traco: Traco, epsilon: number): Ponto[] {
  if (traco.length < 3) return [...traco];
  const manter = new Uint8Array(traco.length);
  manter[0] = 1;
  manter[traco.length - 1] = 1;
  const pilha: [number, number][] = [[0, traco.length - 1]];
  for (let intervalo = pilha.pop(); intervalo !== undefined; intervalo = pilha.pop()) {
    const [inicio, fim] = intervalo;
    const [indice, distancia] = pontoMaisDistante(traco, inicio, fim);
    if (distancia > epsilon) {
      manter[indice] = 1;
      pilha.push([inicio, indice], [indice, fim]);
    }
  }
  return traco.filter((_, i) => manter[i] === 1);
}

function pontoMaisDistante(traco: Traco, inicio: number, fim: number): [number, number] {
  const a = pontoEm(traco, inicio);
  const b = pontoEm(traco, fim);
  let melhor: [number, number] = [inicio, 0];
  for (let i = inicio + 1; i < fim; i++) {
    const distancia = distanciaAoSegmento(pontoEm(traco, i), a, b);
    if (distancia > melhor[1]) melhor = [i, distancia]; // estrito: primeiro máximo, como o argmax do numpy
  }
  return melhor;
}

function pontoEm(traco: Traco, indice: number): Ponto {
  const ponto = traco[indice];
  if (ponto === undefined) throw new RangeError(`índice ${indice} fora do traço de ${traco.length} pontos`);
  return ponto;
}
