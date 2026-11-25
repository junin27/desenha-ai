import { describe, expect, it } from "vitest";
import { preencherArea, type Cor } from "../../../src/domain/desenho/balde";

// Imagem pequena em RGBA: cada célula vira 4 bytes. "#" = traço preto, "." = branco, "~" = borda cinza suavizada.
const PRETO: Cor = [43, 26, 10];
const BRANCO: Cor = [255, 255, 255];
const CINZA: Cor = [200, 200, 200];
const AZUL: Cor = [91, 192, 235];

function imagem(linhas: string[]): { pixels: Uint8ClampedArray; largura: number; altura: number } {
  const largura = linhas[0]?.length ?? 0;
  const pixels = new Uint8ClampedArray(largura * linhas.length * 4);
  linhas.forEach((linha, y) => {
    for (let x = 0; x < linha.length; x++) {
      const celula = linha.charAt(x);
      const cor = celula === "#" ? PRETO : celula === "~" ? CINZA : BRANCO;
      pixels.set([...cor, 255], (y * largura + x) * 4);
    }
  });
  return { pixels, largura, altura: linhas.length };
}

function corEm(pixels: Uint8ClampedArray, largura: number, x: number, y: number): number[] {
  const i = (y * largura + x) * 4;
  return [...pixels.slice(i, i + 3)];
}

describe("Requisito: Balde (spec paleta-de-desenho)", () => {
  const CASA = ["........", ".######.", ".#....#.", ".#....#.", ".######.", "........"];

  it("test_pinta_o_interior_fechado_e_nao_vaza", () => {
    const { pixels, largura, altura } = imagem(CASA);
    const pintados = preencherArea(pixels, largura, altura, 3, 2, AZUL);
    expect(pintados).toBe(8);
    expect(corEm(pixels, largura, 3, 2)).toEqual(AZUL);
    expect(corEm(pixels, largura, 0, 0)).toEqual(BRANCO);
    expect(corEm(pixels, largura, 1, 1)).toEqual(PRETO);
  });

  it("test_tolera_a_borda_suavizada_do_traco", () => {
    const { pixels, largura, altura } = imagem(["~~~~~", "~...~", "~~~~~"]);
    expect(preencherArea(pixels, largura, altura, 2, 1, AZUL)).toBe(3);
    expect(corEm(pixels, largura, 0, 0)).toEqual(CINZA);
  });

  it("test_mesma_cor_nao_faz_nada", () => {
    const { pixels, largura, altura } = imagem(CASA);
    expect(preencherArea(pixels, largura, altura, 3, 2, BRANCO)).toBe(0);
  });

  it("test_ponto_fora_da_imagem_nao_pinta", () => {
    const { pixels, largura, altura } = imagem(CASA);
    expect(preencherArea(pixels, largura, altura, -1, 2, AZUL)).toBe(0);
  });
});
