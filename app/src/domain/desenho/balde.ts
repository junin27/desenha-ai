/** Cor em RGB (0 a 255 cada canal). */
export type Cor = readonly [number, number, number];

/**
 * Soma das diferenças de canal até a qual um pixel ainda conta como "mesma cor" da área: tolera o
 * cinza suavizado da beira de um traço sem atravessá-lo (spec `paleta-de-desenho`, "Balde").
 */
export const TOLERANCIA_DO_BALDE = 90;
const CANAIS = 4;

/**
 * Pinta, com `cor`, a área contínua de pixels parecidos com o do ponto (x, y), em quatro direções, e
 * devolve quantos pixels foram pintados. Muda `pixels` (RGBA) no lugar; a mesma cor não pinta nada.
 *
 * @example
 * const imagem = contexto.getImageData(0, 0, 560, 560);
 * preencherArea(imagem.data, 560, 560, 120, 300, [91, 192, 235]);
 */
export function preencherArea(
  pixels: Uint8ClampedArray,
  largura: number,
  altura: number,
  x: number,
  y: number,
  cor: Cor,
): number {
  if (!dentro(x, y, largura, altura)) return 0;
  const referencia = corNoIndice(pixels, (y * largura + x) * CANAIS);
  if (distancia(referencia, cor) === 0) return 0;
  const visitados = new Uint8Array(largura * altura);
  const pilha: number[] = [y * largura + x];
  let pintados = 0;
  while (pilha.length > 0) {
    const posicao = pilha.pop() ?? 0;
    if (visitados[posicao] === 1) continue;
    visitados[posicao] = 1;
    if (distancia(corNoIndice(pixels, posicao * CANAIS), referencia) >= TOLERANCIA_DO_BALDE) continue;
    pixels.set([...cor, 255], posicao * CANAIS);
    pintados += 1;
    empilharVizinhos(pilha, posicao, largura, altura);
  }
  return pintados;
}

function empilharVizinhos(pilha: number[], posicao: number, largura: number, altura: number): void {
  const x = posicao % largura;
  const y = Math.floor(posicao / largura);
  if (x > 0) pilha.push(posicao - 1);
  if (x < largura - 1) pilha.push(posicao + 1);
  if (y > 0) pilha.push(posicao - largura);
  if (y < altura - 1) pilha.push(posicao + largura);
}

function corNoIndice(pixels: Uint8ClampedArray, indice: number): Cor {
  return [pixels[indice] ?? 0, pixels[indice + 1] ?? 0, pixels[indice + 2] ?? 0];
}

function distancia(a: Cor, b: Cor): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function dentro(x: number, y: number, largura: number, altura: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < largura && y < altura;
}
