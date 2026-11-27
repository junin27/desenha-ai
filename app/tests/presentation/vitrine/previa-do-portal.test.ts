// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  inicioDaSaidaDoCartao,
  opacidadeDaCenaNova,
  saidaDoCapitulo,
} from "../../../src/presentation/vitrine/animacao-da-vitrine";
import { PARADAS_DOS_CAPITULOS } from "../../../src/presentation/vitrine/controle-da-historia";

describe("Requisito: Transição por portal (spec vitrine-da-abertura)", () => {
  it("test_escondido_enquanto_parado_a_cena_nova_tem_opacidade_zero_antes_do_zoom", () => {
    expect(opacidadeDaCenaNova(0)).toBe(0);
  });

  it("test_surge_de_dentro_do_objeto_ja_inteira_na_metade_do_zoom", () => {
    expect(opacidadeDaCenaNova(0.25)).toBeGreaterThan(0);
    expect(opacidadeDaCenaNova(0.25)).toBeLessThan(1);
    expect(opacidadeDaCenaNova(0.5)).toBe(1);
    expect(opacidadeDaCenaNova(1)).toBe(1);
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
