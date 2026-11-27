// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  inicioDaSaidaDoCartao,
  opacidadeDaCenaNova,
  saidaDoCapitulo,
} from "../../../src/presentation/vitrine/animacao-da-vitrine";
import { PARADAS_DOS_CAPITULOS } from "../../../src/presentation/vitrine/controle-da-historia";

describe("Requisito: Transição por portal (spec vitrine-da-abertura)", () => {
  it("test_comeca_na_cor_do_objeto_cena_nova_invisivel_ate_o_objeto_cobrir_a_tela", () => {
    expect(opacidadeDaCenaNova(0)).toBe(0);
    expect(opacidadeDaCenaNova(0.85)).toBe(0);
  });

  it("test_surge_so_com_o_objeto_cobrindo_a_tela_sem_veu_no_fim", () => {
    expect(opacidadeDaCenaNova(0.93)).toBeGreaterThan(0);
    expect(opacidadeDaCenaNova(0.93)).toBeLessThan(1);
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
