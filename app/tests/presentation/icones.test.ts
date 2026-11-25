// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { botaoComIcone, criarIcone, NOMES_DOS_ICONES } from "../../src/presentation/icones";

describe("Requisito: Ícones desenhados (spec identidade-visual)", () => {
  it("test_os_16_icones_existem", () => {
    expect([...NOMES_DOS_ICONES].sort()).toEqual(
      [
        "balao",
        "balde",
        "borracha",
        "casinha",
        "chapeu",
        "contagotas",
        "enviar",
        "estrela",
        "jogar",
        "lapis",
        "lixeira",
        "lupa",
        "ordem",
        "raio",
        "redes",
        "trofeu",
      ].sort(),
    );
  });

  it.each([...NOMES_DOS_ICONES])("test_icone_%s_e_svg_escondido_do_leitor_e_com_traco", (nome) => {
    const icone = criarIcone(nome);
    expect(icone.tagName.toLowerCase()).toBe("svg");
    expect(icone.getAttribute("aria-hidden")).toBe("true");
    expect(icone.classList.contains("icone")).toBe(true);
    expect(icone.querySelectorAll("path, circle").length).toBeGreaterThan(0);
    expect(icone.outerHTML).not.toMatch(/https?:\/\//u);
  });

  it("test_icone_nao_muda_o_nome_do_botao", () => {
    const botao = botaoComIcone("borracha", "Borracha", "ferramenta-borracha", () => undefined);
    expect(botao.textContent).toBe("Borracha");
    expect(botao.querySelector("svg.icone")).not.toBeNull();
    expect(botao.dataset["acao"]).toBe("ferramenta-borracha");
  });
});
