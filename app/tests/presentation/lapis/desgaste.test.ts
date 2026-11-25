import { describe, expect, it } from "vitest";
import { DesgasteDoLapis, LAPIS_INTEIRO, LAPIS_MINIMO } from "../../../src/presentation/lapis/desgaste";

describe("Requisito: Desgaste do lápis e da borracha (spec lapis-no-quadro)", () => {
  it("test_lapis_encurta_e_a_ponta_fica_rombuda_com_a_distancia", () => {
    const desgaste = new DesgasteDoLapis();
    desgaste.gastar("lapis", 1000);
    expect(desgaste.corpo).toBeLessThan(LAPIS_INTEIRO.corpo);
    expect(desgaste.ponta).toBeLessThan(1);
    expect(desgaste.borracha).toBe(LAPIS_INTEIRO.borracha);
  });

  it("test_borracha_encolhe_ao_apagar", () => {
    const desgaste = new DesgasteDoLapis();
    desgaste.gastar("borracha", 500);
    expect(desgaste.borracha).toBeLessThan(LAPIS_INTEIRO.borracha);
    expect(desgaste.corpo).toBe(LAPIS_INTEIRO.corpo);
  });

  it("test_para_no_minimo_e_continua_funcionando", () => {
    const desgaste = new DesgasteDoLapis();
    desgaste.gastar("lapis", 1_000_000);
    desgaste.gastar("borracha", 1_000_000);
    expect(desgaste.corpo).toBe(LAPIS_MINIMO.corpo);
    expect(desgaste.borracha).toBe(LAPIS_MINIMO.borracha);
    expect(desgaste.ponta).toBe(0);
    desgaste.gastar("lapis", 50);
    expect(desgaste.corpo).toBe(LAPIS_MINIMO.corpo);
  });

  it("test_lapis_novo_volta_inteiro", () => {
    const desgaste = new DesgasteDoLapis();
    desgaste.gastar("lapis", 5000);
    desgaste.renovar();
    expect([desgaste.corpo, desgaste.borracha, desgaste.ponta]).toEqual([
      LAPIS_INTEIRO.corpo,
      LAPIS_INTEIRO.borracha,
      1,
    ]);
  });
});
