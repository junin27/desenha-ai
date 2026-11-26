import { describe, expect, it } from "vitest";
import { CAPITULOS, proximoDesenho } from "../../../src/domain/vitrine/capitulos";

describe("Requisito: Vitrine como primeira tela (spec vitrine-da-abertura)", () => {
  it("test_ordem_dos_capitulos_sao_11_na_ordem_da_spec", () => {
    expect(CAPITULOS.map((c) => c.nome)).toEqual([
      "Início",
      "O jogo",
      "O desenho",
      "A CNN",
      "A LSTM",
      "O Zé (SLM)",
      "Destilação",
      "QLoRA",
      "Quantização GGUF",
      "Engenharia",
      "Sua vez, sô!",
    ]);
    expect(new Set(CAPITULOS.map((c) => c.id)).size).toBe(11);
  });
});

describe("Requisito: Desenho real do dataset (spec vitrine-da-abertura)", () => {
  it("test_outro_desenho_na_volta_seguinte_nunca_repete_o_anterior", () => {
    for (const sorteio of [0, 0.2, 0.5, 0.99]) {
      for (let anterior = 0; anterior < 8; anterior++) {
        const proximo = proximoDesenho(8, anterior, sorteio);
        expect(proximo).not.toBe(anterior);
        expect(proximo).toBeGreaterThanOrEqual(0);
        expect(proximo).toBeLessThan(8);
      }
    }
  });

  it("test_primeira_volta_usa_o_sorteio_em_todos_os_desenhos", () => {
    expect(proximoDesenho(8, undefined, 0)).toBe(0);
    expect(proximoDesenho(8, undefined, 0.99)).toBe(7);
  });

  it("test_com_um_desenho_so_repete_porque_nao_ha_outro", () => {
    expect(proximoDesenho(1, 0, 0.5)).toBe(0);
  });
});
