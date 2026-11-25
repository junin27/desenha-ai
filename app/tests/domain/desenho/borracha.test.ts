import { describe, expect, it } from "vitest";
import type { Traco } from "../../../src/domain/desenho/desenho";
import { RAIO_DA_BORRACHA, tracosForaDaBorracha } from "../../../src/domain/desenho/borracha";

// Casa de 4 traços (spec ferramentas-de-desenho, "Apagar a porta da casa").
const TELHADO: Traco = [
  [90, 280],
  [310, 90],
  [530, 280],
];
const PAREDES: Traco = [
  [120, 260],
  [120, 530],
  [500, 530],
  [500, 260],
];
const PORTA: Traco = [
  [270, 530],
  [270, 400],
  [350, 400],
  [350, 530],
];
const JANELA: Traco = [
  [160, 320],
  [220, 320],
  [220, 380],
  [160, 380],
];
const CASA = [TELHADO, PAREDES, PORTA, JANELA];

describe("borracha apaga traços inteiros (spec ferramentas-de-desenho)", () => {
  it("test_borracha_sobre_a_porta_mantem_os_outros_tracos_na_ordem", () => {
    expect(tracosForaDaBorracha(CASA, [310, 405])).toEqual([TELHADO, PAREDES, JANELA]);
  });

  it("test_borracha_a_40px_nao_remove_nada", () => {
    expect(tracosForaDaBorracha(CASA, [430, 400])).toEqual(CASA);
  });

  it("test_borracha_usa_a_distancia_ao_segmento_e_nao_so_aos_pontos", () => {
    // Meio do lado esquerdo das paredes: longe dos pontos (120,260) e (120,530), mas sobre a linha.
    const restantes = tracosForaDaBorracha([PAREDES], [120 + RAIO_DA_BORRACHA - 1, 395]);
    expect(restantes).toEqual([]);
  });

  it("test_borracha_apaga_traco_de_um_ponto_so", () => {
    expect(tracosForaDaBorracha([[[50, 50]]], [55, 55])).toEqual([]);
  });

  it("test_raio_da_borracha_e_18px", () => {
    expect(RAIO_DA_BORRACHA).toBe(18);
  });
});
