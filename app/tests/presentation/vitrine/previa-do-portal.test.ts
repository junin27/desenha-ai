// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  inicioDaSaidaDoCartao,
  opacidadeDoVeu,
  saidaDoCapitulo,
} from "../../../src/presentation/vitrine/animacao-da-vitrine";
import { PARADAS_DOS_CAPITULOS } from "../../../src/presentation/vitrine/controle-da-historia";

describe("Requisito: Transição por portal (spec vitrine-da-abertura)", () => {
  it("test_comeca_na_cor_do_objeto_veu_opaco_no_inicio_do_zoom", () => {
    expect(opacidadeDoVeu(0)).toBe(1);
    expect(opacidadeDoVeu(0.3)).toBe(1);
  });

  it("test_surge_de_dentro_do_objeto_sem_veu_aos_70_por_cento_do_zoom", () => {
    expect(opacidadeDoVeu(0.5)).toBeGreaterThan(0);
    expect(opacidadeDoVeu(0.5)).toBeLessThan(1);
    expect(opacidadeDoVeu(0.7)).toBe(0);
    expect(opacidadeDoVeu(1)).toBe(0);
  });
});

describe("Requisito: Avançar e voltar a história (spec vitrine-da-abertura)", () => {
  it("test_cartao_da_engenharia_sai_so_no_portal_para_o_convite", () => {
    expect(saidaDoCapitulo("engenharia")).toBe(67.6);
    expect(saidaDoCapitulo("quantizacao")).toBe(60.6);
    expect(saidaDoCapitulo("jogo")).toBe(11.3);
  });
});

describe("Requisito: História só anda com o visitante (spec vitrine-da-abertura)", () => {
  it("test_cartao_continua_visivel_na_parada_do_capitulo", () => {
    const ids = [
      "jogo",
      "desenho",
      "cnn",
      "lstm",
      "ze",
      "destilacao",
      "qlora",
      "quantizacao",
      "engenharia",
    ] as const;
    ids.forEach((id, i) => {
      expect(inicioDaSaidaDoCartao(id)).toBeGreaterThan(PARADAS_DOS_CAPITULOS[i + 1] ?? 0);
    });
  });
});
