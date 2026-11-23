import { criarDesenho, todosOsPontos, type Desenho } from "./desenho";

export const ESCALA_MAXIMA = 255;
const DIMENSAO_MINIMA = 1; // evita divisão por zero em ponto único ou linha degenerada

/**
 * Alinha ao canto superior esquerdo e escala a maior dimensão para 255 (espelha `desenha_ml.normalizacao`).
 *
 * @example
 * normalizar(criarDesenho([[[10, 20], [110, 20]]])).tracos[0]; // [[0, 0], [255, 0]]
 */
export function normalizar(desenho: Desenho): Desenho {
  const pontos = todosOsPontos(desenho);
  const xs = pontos.map(([x]) => x);
  const ys = pontos.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maior = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, DIMENSAO_MINIMA);
  // Multiplica antes de dividir, na mesma ordem do Python, para a maior dimensão dar 255 exato.
  return criarDesenho(
    desenho.tracos.map((traco) =>
      traco.map(
        ([x, y]) => [((x - minX) * ESCALA_MAXIMA) / maior, ((y - minY) * ESCALA_MAXIMA) / maior] as const,
      ),
    ),
  );
}
