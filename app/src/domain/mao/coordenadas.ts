import type { Ponto } from "../desenho/desenho";
import type { PontoDaMao, PontosDaMao } from "./pontos";

/** Borda da imagem da câmera que fica fora do quadro: o dedo alcança os cantos sem sair do vídeo (D4). */
export const MARGEM_DA_CAMERA = 0.15;
/** Peso do ponto novo na suavização exponencial contra o tremor do dedo. */
export const ALFA_DA_SUAVIZACAO = 0.5;
/** Punho e bases dos quatro dedos: a média deles é o centro da palma. */
const PONTOS_DA_PALMA = [0, 5, 9, 13, 17] as const;

/**
 * Converte um ponto da câmera para o quadro de desenho: espelha o X (o visitante se vê como num espelho) e
 * estica a área central da câmera para o quadro inteiro, prendendo nas bordas.
 *
 * @example
 * noQuadro({ x: 0.5, y: 0.5 }, 560); // [280, 280]
 */
export function noQuadro(ponto: PontoDaMao, lado: number): Ponto {
  const util = 1 - 2 * MARGEM_DA_CAMERA;
  const converter = (valor: number): number => {
    const fracao = Math.min(1, Math.max(0, (valor - MARGEM_DA_CAMERA) / util));
    return Math.round(fracao * lado * 100) / 100;
  };
  return [converter(1 - ponto.x), converter(ponto.y)];
}

export function centroDaPalma(pontos: PontosDaMao): PontoDaMao | undefined {
  let x = 0;
  let y = 0;
  for (const indice of PONTOS_DA_PALMA) {
    const ponto = pontos[indice];
    if (ponto === undefined) return undefined;
    x += ponto.x;
    y += ponto.y;
  }
  return { x: x / PONTOS_DA_PALMA.length, y: y / PONTOS_DA_PALMA.length };
}

/** Suavização exponencial do ponto do dedo (α = 0,5); reinicia quando o traço termina. */
export class Suavizador {
  private anterior: Ponto | undefined;

  suavizar(ponto: Ponto): Ponto {
    const anterior = this.anterior;
    const novo: Ponto =
      anterior === undefined
        ? ponto
        : [
            anterior[0] + ALFA_DA_SUAVIZACAO * (ponto[0] - anterior[0]),
            anterior[1] + ALFA_DA_SUAVIZACAO * (ponto[1] - anterior[1]),
          ];
    this.anterior = novo;
    return novo;
  }

  reiniciar(): void {
    this.anterior = undefined;
  }
}
