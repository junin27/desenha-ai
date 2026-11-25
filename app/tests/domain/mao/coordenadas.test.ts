import { describe, expect, it } from "vitest";
import {
  ALFA_DA_SUAVIZACAO,
  centroDaPalma,
  MARGEM_DA_CAMERA,
  noQuadro,
  Suavizador,
} from "../../../src/domain/mao/coordenadas";
import { maoSintetica } from "./mao-sintetica";

const LADO = 560;

describe("Requisito: Lápis pelo dedo — coordenadas (spec desenho-com-a-mao)", () => {
  it("test_x_espelhado_dedo_para_a_direita_desenha_para_a_direita", () => {
    // Na imagem crua da câmera, mover a mão para a direita do visitante diminui o x.
    const esquerda = noQuadro({ x: 0.7, y: 0.5 }, LADO);
    const direita = noQuadro({ x: 0.3, y: 0.5 }, LADO);
    expect(direita[0]).toBeGreaterThan(esquerda[0]);
  });

  it("test_margem_de_15_porcento_mapeia_para_as_bordas", () => {
    expect(MARGEM_DA_CAMERA).toBe(0.15);
    expect(noQuadro({ x: 0.85, y: 0.15 }, LADO)).toEqual([0, 0]);
    expect(noQuadro({ x: 0.15, y: 0.85 }, LADO)).toEqual([LADO, LADO]);
    expect(noQuadro({ x: 0.5, y: 0.5 }, LADO)).toEqual([LADO / 2, LADO / 2]);
  });

  it("test_fora_da_area_fica_preso_na_borda", () => {
    expect(noQuadro({ x: 0.99, y: 0.01 }, LADO)).toEqual([0, 0]);
  });

  it("test_suavizacao_alfa_meio", () => {
    expect(ALFA_DA_SUAVIZACAO).toBe(0.5);
    const suavizador = new Suavizador();
    expect(suavizador.suavizar([100, 100])).toEqual([100, 100]);
    expect(suavizador.suavizar([200, 100])).toEqual([150, 100]);
    suavizador.reiniciar();
    expect(suavizador.suavizar([10, 10])).toEqual([10, 10]);
  });

  it("test_centro_da_palma_e_a_media_de_punho_e_bases", () => {
    const mao = maoSintetica([]);
    const centro = centroDaPalma(mao);
    expect(centro?.x).toBeCloseTo(0.52, 2);
    expect(centroDaPalma([])).toBeUndefined();
  });
});
