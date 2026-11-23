import { describe, expect, it } from "vitest";
import { combinar, topK } from "../../../src/domain/rodada/ensemble";
import { deveEncerrarAntes, veredito } from "../../../src/domain/rodada/veredito";
import type { Resultado } from "../../../src/domain/resultado";
import type { ErroDeRegra } from "../../../src/domain/rodada/erros";

function codigo<T>(resultado: Resultado<T, ErroDeRegra>): string {
  return resultado.ok ? "ok" : resultado.erro.codigo;
}

describe("Requisito: Combinação no ensemble", () => {
  it("média ponderada", () => {
    const resultado = combinar([0.6, 0.4], [0.2, 0.8], 0.75);
    if (!resultado.ok) throw new Error(resultado.erro.detalhe);
    for (const p of resultado.valor) expect(p).toBeCloseTo(0.5, 12);
  });

  it("tamanhos diferentes", () => {
    const resultado = combinar(Array<number>(30).fill(1 / 30), Array<number>(29).fill(1 / 29), 0.5);
    expect(codigo(resultado)).toBe("probabilidades_invalidas");
  });

  it.each([[[0.5, 0.4]], [[0.7, 0.4]], [[1.2, -0.2]], [[]]])("recusa a distribuição %j", (p) => {
    expect(codigo(combinar(p, p, 0.5))).toBe("probabilidades_invalidas");
  });

  it.each([1.2, -0.1, Number.NaN])("recusa o peso %s", (peso) => {
    expect(codigo(combinar([0.5, 0.5], [0.5, 0.5], peso))).toBe("peso_invalido");
  });
});

describe("Requisito: Palpites ordenados (top-k)", () => {
  it("empate decidido pelo índice", () => {
    expect(topK([0.1, 0.45, 0.45], 3)).toEqual({
      ok: true,
      valor: [
        [1, 0.45],
        [2, 0.45],
        [0, 0.1],
      ],
    });
  });

  it.each([0, 4])("k = %s é inválido", (k) => {
    expect(codigo(topK([0.2, 0.5, 0.3], k))).toBe("k_invalido");
  });
});

describe("Requisito: Veredito", () => {
  it.each([
    [2, [0.1, 0.3, 0.6], "ACERTOU"],
    [0, [0.25, 0.45, 0.3], "QUASE"],
    [0, [0.05, 0.5, 0.3, 0.15], "ERROU"],
    [2, [0.1, 0.45, 0.45], "QUASE"],
  ] as const)("alvo %s em %j dá %s", (alvo, probabilidades, esperado) => {
    expect(veredito(alvo, probabilidades)).toEqual({ ok: true, valor: esperado });
  });

  it.each([-1, 3])("alvo %s é inválido", (alvo) => {
    expect(codigo(veredito(alvo, [0.2, 0.5, 0.3]))).toBe("alvo_invalido");
  });
});

describe("Requisito: Vitória antecipada", () => {
  it.each([
    [0, [0.85, 0.15], 6, true],
    [0, [0.79, 0.21], 10, false],
    [0, [0.95, 0.05], 1.5, false],
    [1, [0.2, 0.8], 2, true],
    [1, [0.9, 0.1], 8, false],
  ] as const)("alvo %s, %j, %s s → %s", (alvo, probabilidades, segundos, esperado) => {
    expect(deveEncerrarAntes(alvo, probabilidades, segundos)).toEqual({ ok: true, valor: esperado });
  });
});
