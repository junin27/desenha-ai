// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { opacidadeDaCenaNova } from "../../../src/presentation/vitrine/animacao-da-vitrine";

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
