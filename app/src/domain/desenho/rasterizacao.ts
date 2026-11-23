import { todosOsPontos, type Desenho, type Ponto } from "./desenho";
import { limitar } from "./geometria";
import { ESCALA_MAXIMA, normalizar } from "./normalizacao";

export const LADO_DA_IMAGEM = 28;
export const LADO_DA_CAIXA = 22; // o desenho ocupa 22 dos 28 pixels
export const SUBAMOSTRAS = 4; // subpontos por eixo em cada pixel
export const ESPESSURA_PADRAO = 1.6; // em pixels da imagem 28×28

const LADO_DA_MASCARA = LADO_DA_IMAGEM * SUBAMOSTRAS;
const SUBPONTOS_POR_PIXEL = SUBAMOSTRAS * SUBAMOSTRAS;

/**
 * Imagem 28×28 (linha a linha, valores k/16) por cobertura geométrica. Mesma conta de
 * `desenha_ml.rasterizacao`, garantida por `contratos/pre_processamento.json`.
 *
 * @example
 * rasterizar(criarDesenho([[[0, 0], [255, 0]]]))[13 * 28 + 10]; // 0.75
 */
export function rasterizar(desenho: Desenho, espessura = ESPESSURA_PADRAO): Float32Array {
  const mascara = new Uint8Array(LADO_DA_MASCARA * LADO_DA_MASCARA);
  const raio = espessura / 2;
  for (const traco of tracosEmPixels(desenho)) {
    for (const [inicio, fim] of segmentos(traco)) pintarSegmento(mascara, inicio, fim, raio);
  }
  return reduzirParaPixels(mascara);
}

function tracosEmPixels(desenho: Desenho): Ponto[][] {
  const normalizado = normalizar(desenho);
  const escala = LADO_DA_CAIXA / ESCALA_MAXIMA;
  const pontos = todosOsPontos(normalizado);
  const deslocamentoX = (LADO_DA_IMAGEM - Math.max(...pontos.map(([x]) => x)) * escala) / 2;
  const deslocamentoY = (LADO_DA_IMAGEM - Math.max(...pontos.map(([, y]) => y)) * escala) / 2;
  return normalizado.tracos.map((traco) =>
    traco.map(([x, y]) => [x * escala + deslocamentoX, y * escala + deslocamentoY] as const),
  );
}

function segmentos(traco: readonly Ponto[]): [Ponto, Ponto][] {
  const [primeiro] = traco;
  if (traco.length === 1 && primeiro !== undefined) return [[primeiro, primeiro]]; // ponto isolado: disco
  return traco.slice(1).map((fim, i) => [traco[i] ?? fim, fim]);
}

/** Marca os subpontos a até `raio` do segmento (distância ao quadrado, como no Python). */
function pintarSegmento(mascara: Uint8Array, [ax, ay]: Ponto, [bx, by]: Ponto, raio: number): void {
  const colunas = faixaDeIndices(Math.min(ax, bx) - raio, Math.max(ax, bx) + raio);
  const linhas = faixaDeIndices(Math.min(ay, by) - raio, Math.max(ay, by) + raio);
  if (colunas === undefined || linhas === undefined) return;
  const dx = bx - ax;
  const dy = by - ay;
  const comprimento2 = dx * dx + dy * dy;
  for (let v = linhas[0]; v <= linhas[1]; v++) {
    const ys = (v + 0.5) / SUBAMOSTRAS - ay;
    for (let u = colunas[0]; u <= colunas[1]; u++) {
      const xs = (u + 0.5) / SUBAMOSTRAS - ax;
      const t = comprimento2 > 0 ? limitar((xs * dx + ys * dy) / comprimento2, 0, 1) : 0;
      if ((xs - t * dx) ** 2 + (ys - t * dy) ** 2 <= raio * raio) mascara[v * LADO_DA_MASCARA + u] = 1;
    }
  }
}

function faixaDeIndices(minimo: number, maximo: number): [number, number] | undefined {
  const primeiro = Math.max(Math.ceil(minimo * SUBAMOSTRAS - 0.5), 0);
  const ultimo = Math.min(Math.floor(maximo * SUBAMOSTRAS - 0.5), LADO_DA_MASCARA - 1);
  return primeiro <= ultimo ? [primeiro, ultimo] : undefined;
}

function reduzirParaPixels(mascara: Uint8Array): Float32Array {
  const imagem = new Float32Array(LADO_DA_IMAGEM * LADO_DA_IMAGEM);
  for (let v = 0; v < LADO_DA_MASCARA; v++) {
    for (let u = 0; u < LADO_DA_MASCARA; u++) {
      const pixel = Math.floor(v / SUBAMOSTRAS) * LADO_DA_IMAGEM + Math.floor(u / SUBAMOSTRAS);
      imagem[pixel] = (imagem[pixel] ?? 0) + (mascara[v * LADO_DA_MASCARA + u] ?? 0) / SUBPONTOS_POR_PIXEL;
    }
  }
  return imagem;
}
