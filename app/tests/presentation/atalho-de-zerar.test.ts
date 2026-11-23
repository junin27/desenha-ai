// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { instalarAtalhoDeZerarPlacar } from "../../src/presentation/atalho-de-zerar";

// Spec `placar-local`, requisito "Zerar o placar".
function montar(opcoes: { naInicio?: boolean; aceita?: boolean } = {}) {
  const registro = { perguntas: [] as string[], zerados: 0 };
  instalarAtalhoDeZerarPlacar(document, {
    podeZerar: () => opcoes.naInicio ?? true,
    confirmar: (pergunta) => {
      registro.perguntas.push(pergunta);
      return opcoes.aceita ?? true;
    },
    zerar: () => {
      registro.zerados += 1;
    },
  });
  return registro;
}

function apertar(teclas: { ctrlKey?: boolean; shiftKey?: boolean; key?: string } = {}): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Z", ...teclas }),
  );
}

describe("zerar o placar", () => {
  it("placar zerado: Ctrl+Shift+Z e confirmação aceita zeram o placar", () => {
    const registro = montar();
    apertar();
    expect(registro.perguntas).toHaveLength(1);
    expect(registro.zerados).toBe(1);
  });

  it("confirmação recusada não zera", () => {
    const registro = montar({ aceita: false });
    apertar();
    expect(registro.zerados).toBe(0);
  });

  it("fora da tela de início o atalho não faz nada", () => {
    const registro = montar({ naInicio: false });
    apertar();
    expect(registro.perguntas).toEqual([]);
  });

  it.each([
    ["sem Ctrl", { ctrlKey: false }],
    ["sem Shift", { shiftKey: false }],
    ["outra tecla", { key: "X" }],
  ])("outras combinações (%s) não pedem confirmação", (_, teclas) => {
    const registro = montar();
    apertar(teclas);
    expect(registro.perguntas).toEqual([]);
  });

  it("aceita o z minúsculo (Caps Lock ou teclado que não maiusculiza com Shift)", () => {
    const registro = montar();
    apertar({ key: "z" });
    expect(registro.zerados).toBe(1);
  });
});
