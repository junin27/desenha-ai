import { describe, expect, it } from "vitest";
import { criarDesenho } from "../../../src/domain/desenho/desenho";
import { ESPESSURA_PADRAO, LADO_DA_IMAGEM, rasterizar } from "../../../src/domain/desenho/rasterizacao";
import { MAXIMO_DE_PONTOS, sequenciar } from "../../../src/domain/desenho/sequencia";

const linhaHorizontal = criarDesenho([
  [
    [0, 0],
    [255, 0],
  ],
]);

function pixel(imagem: Float32Array, linha: number, coluna: number): number {
  return imagem[linha * LADO_DA_IMAGEM + coluna] ?? Number.NaN;
}

function somaDasLinhas(imagem: Float32Array, de: number, ate: number): number {
  return imagem.slice(de * LADO_DA_IMAGEM, ate * LADO_DA_IMAGEM).reduce((a, b) => a + b, 0);
}

describe("Requisito: Imagem 28×28 para a CNN", () => {
  it("tem 784 valores", () => {
    expect(rasterizar(linhaHorizontal)).toHaveLength(LADO_DA_IMAGEM * LADO_DA_IMAGEM);
  });

  it("todo pixel vale k/16", () => {
    const desenho = criarDesenho([
      [
        [3, 200],
        [90, 10],
        [250, 130],
      ],
      [[40, 40]],
    ]);
    for (const valor of rasterizar(desenho)) {
      expect(Number.isInteger(valor * 16)).toBe(true);
    }
  });

  it("linha horizontal: linhas 13 e 14 valem 12/16 nas colunas 3 a 24, resto das linhas zerado", () => {
    const imagem = rasterizar(linhaHorizontal);
    for (const linha of [13, 14]) {
      for (let coluna = 3; coluna <= 24; coluna++) expect(pixel(imagem, linha, coluna)).toBe(12 / 16);
    }
    expect(somaDasLinhas(imagem, 0, 13)).toBe(0);
    expect(somaDasLinhas(imagem, 15, 28)).toBe(0);
  });

  it("ponto isolado vira disco de 8/16 nos quatro pixels centrais", () => {
    const imagem = rasterizar(criarDesenho([[[100, 100]]]));
    for (const [linha, coluna] of [
      [13, 13],
      [13, 14],
      [14, 13],
      [14, 14],
    ] as const) {
      expect(pixel(imagem, linha, coluna)).toBe(8 / 16);
    }
    expect(imagem.reduce((a, b) => a + b, 0)).toBe(4 * (8 / 16));
  });

  it("espessura maior pinta mais", () => {
    const desenho = criarDesenho([
      [
        [0, 0],
        [255, 128],
        [30, 255],
      ],
    ]);
    const soma = (espessura: number) => rasterizar(desenho, espessura).reduce((a, b) => a + b, 0);
    expect(soma(2)).toBeGreaterThan(soma(1.2));
    expect(ESPESSURA_PADRAO).toBe(1.6);
  });
});

describe("Requisito: Sequência stroke-3 para a LSTM", () => {
  it("dois traços", () => {
    const desenho = criarDesenho([
      [
        [0, 0],
        [255, 0],
      ],
      [[255, 255]],
    ]);
    const sequencia = sequenciar(desenho);
    expect(sequencia.pontos).toBe(3);
    expect([...sequencia.valores]).toEqual([0, 0, 0, 1, 0, 1, 0, 1, 1]);
  });

  it("corta desenhos longos em 130 pontos", () => {
    const longo = criarDesenho([Array.from({ length: 200 }, (_, i) => [i, 0] as const)]);
    expect(MAXIMO_DE_PONTOS).toBe(130);
    expect(sequenciar(longo).pontos).toBe(130);
    expect(sequenciar(longo).valores).toHaveLength(130 * 3);
  });
});
