// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { DesgasteDoLapis, LAPIS_INTEIRO } from "../../../src/presentation/lapis/desgaste";
import { LapisNoQuadro } from "../../../src/presentation/lapis/lapis-no-quadro";

function corpoDesenhado(lapis: LapisNoQuadro): number {
  return Number(lapis.raiz.querySelector(".modo-lapis rect.corpo-do-lapis")?.getAttribute("width"));
}

describe("Requisito: Lápis no lugar do cursor (spec lapis-no-quadro)", () => {
  it("test_ponta_do_lapis_fica_no_ponto_do_traco", () => {
    const lapis = new LapisNoQuadro(new DesgasteDoLapis());
    lapis.mover([200, 300]);
    expect(lapis.raiz.style.transform).toContain("translate(200px, 300px)");
    expect(lapis.raiz.classList.contains("visivel")).toBe(true);
  });

  it("test_fora_do_quadro_o_lapis_some", () => {
    const lapis = new LapisNoQuadro(new DesgasteDoLapis());
    lapis.mover([200, 300]);
    lapis.esconder();
    expect(lapis.raiz.classList.contains("visivel")).toBe(false);
  });

  it("test_desenho_proprio_sem_nada_de_fora", () => {
    const lapis = new LapisNoQuadro(new DesgasteDoLapis());
    expect(lapis.raiz.innerHTML).not.toMatch(/https?:\/\//u);
    expect(lapis.raiz.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Requisito: Lápis mostra a ferramenta", () => {
  it.each(["lapis", "borracha", "balde", "contagotas"] as const)(
    "test_ferramenta_%s_aparece_no_ponto",
    (ferramenta) => {
      const lapis = new LapisNoQuadro(new DesgasteDoLapis());
      lapis.usar(ferramenta);
      expect(lapis.raiz.dataset["ferramenta"]).toBe(ferramenta);
      expect(lapis.raiz.querySelector(`.modo-${ferramenta}`)).not.toBeNull();
    },
  );

  it("test_corpo_do_lapis_tem_a_cor_atual", () => {
    const lapis = new LapisNoQuadro(new DesgasteDoLapis());
    lapis.pintar("#b3261e");
    expect(lapis.raiz.innerHTML).toContain("#b3261e");
  });
});

describe("Requisito: Desgaste do lápis e da borracha", () => {
  it("test_lapis_gasto_aparece_mais_curto_e_o_novo_inteiro", () => {
    const desgaste = new DesgasteDoLapis();
    const lapis = new LapisNoQuadro(desgaste);
    expect(corpoDesenhado(lapis)).toBe(LAPIS_INTEIRO.corpo);
    desgaste.gastar("lapis", 2000);
    lapis.redesenhar();
    expect(corpoDesenhado(lapis)).toBeLessThan(LAPIS_INTEIRO.corpo);
  });
});
