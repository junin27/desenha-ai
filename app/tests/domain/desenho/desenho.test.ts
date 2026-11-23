import { describe, expect, it } from "vitest";
import { criarDesenho, desenhoDePontos, totalDePontos } from "../../../src/domain/desenho/desenho";
import { normalizar } from "../../../src/domain/desenho/normalizacao";
import { prefixo } from "../../../src/domain/desenho/prefixo";
import { prepararDesenhoCapturado, simplificarTraco } from "../../../src/domain/desenho/simplificacao";
import type { Desenho } from "../../../src/domain/desenho/desenho";

function valorDe(resultado: ReturnType<typeof desenhoDePontos>): Desenho {
  if (!resultado.ok) throw new Error(`esperado ok, veio ${resultado.erro.codigo}`);
  return resultado.valor;
}

describe("Requisito: Formato do desenho", () => {
  it("recusa desenho sem traços com desenho_vazio", () => {
    expect(desenhoDePontos([])).toEqual({
      ok: false,
      erro: { codigo: "desenho_vazio", detalhe: "o desenho não tem pontos; esperado ao menos 1" },
    });
  });

  it("recusa desenho só com traços vazios", () => {
    const resultado = desenhoDePontos([[], []]);
    expect(resultado.ok).toBe(false);
  });

  it("ignora traços vazios", () => {
    const comVazio = valorDe(
      desenhoDePontos([
        [
          [1, 2],
          [3, 4],
        ],
        [],
      ]),
    );
    const semVazio = valorDe(
      desenhoDePontos([
        [
          [1, 2],
          [3, 4],
        ],
      ]),
    );
    expect(comVazio).toEqual(semVazio);
  });
});

describe("Requisito: Normalização", () => {
  it("desenho mais largo que alto escala a largura para 255", () => {
    const desenho = criarDesenho([
      [
        [10, 20],
        [110, 20],
        [60, 70],
      ],
    ]);
    expect(normalizar(desenho).tracos[0]).toEqual([
      [0, 0],
      [255, 0],
      [127.5, 127.5],
    ]);
  });

  it("desenho de um único ponto vai para a origem", () => {
    expect(normalizar(criarDesenho([[[40, 40]]])).tracos[0]).toEqual([[0, 0]]);
  });

  it("maior dimensão vai exatamente para 255 (multiplica antes de dividir)", () => {
    const normalizado = normalizar(
      criarDesenho([
        [
          [10, 20],
          [110, 20],
        ],
      ]),
    );
    expect(normalizado.tracos[0]?.[1]?.[0]).toBe(255);
  });
});

describe("Requisito: Simplificação de traços capturados", () => {
  it("remove pontos colineares", () => {
    const desenho = criarDesenho([
      [
        [0, 0],
        [50, 0.5],
        [100, 0],
        [255, 0],
      ],
    ]);
    expect(prepararDesenhoCapturado(desenho).tracos[0]).toEqual([
      [0, 0],
      [255, 0],
    ]);
  });

  it("preserva o canto do traço", () => {
    const canto = [
      [0, 0],
      [255, 0],
      [255, 255],
    ] as const;
    expect(prepararDesenhoCapturado(criarDesenho([canto])).tracos[0]).toEqual(canto);
  });

  it("não estoura a pilha em traços longos", () => {
    const longo = Array.from({ length: 20_000 }, (_, i) => [i / 100, Math.sin(i / 100) * 50] as const);
    const simplificado = simplificarTraco(longo, 2);
    expect(simplificado.length).toBeGreaterThan(2);
    expect(simplificado.length).toBeLessThan(longo.length);
  });
});

describe("Desempate do RDP (D8 do design)", () => {
  it("distâncias empatadas até 1e-9 escolhem o menor índice", () => {
    const traco = [
      [0, 0],
      [50, 30],
      [150, 30 + 1e-12],
      [200, 0],
    ] as const;
    // O ponto 2 é 1e-12 mais distante, mas o empate fica com o ponto 1 (a escolha errada daria p0, p2, p3).
    expect(simplificarTraco(traco, 25)).toEqual([traco[0], traco[1], traco[3]]);
    expect(simplificarTraco(traco, 40)).toEqual([traco[0], traco[3]]);
  });
});

describe("Requisito: Prefixo do desenho", () => {
  const quatroMaisSeis = criarDesenho([
    Array.from({ length: 4 }, (_, i) => [2 * i, 2 * i + 1] as const),
    Array.from({ length: 6 }, (_, i) => [100 + 2 * i, 101 + 2 * i] as const),
  ]);

  function pontosDoPrefixo(fracao: number): number[] {
    const resultado = prefixo(quatroMaisSeis, fracao);
    if (!resultado.ok) throw new Error(resultado.erro.detalhe);
    return resultado.valor.tracos.map((traco) => traco.length);
  }

  it("corta no meio do segundo traço", () => {
    expect(pontosDoPrefixo(0.5)).toEqual([4, 1]);
  });

  it("mantém no mínimo 2 pontos", () => {
    expect(pontosDoPrefixo(0.05).reduce((a, b) => a + b)).toBe(2);
  });

  it("não sobe o teto por erro de ponto flutuante (0,3 x 10 = 3)", () => {
    expect(pontosDoPrefixo(0.3).reduce((a, b) => a + b)).toBe(3);
  });

  it.each([0, -0.1, 1.2, Number.NaN])("recusa a fração %s", (fracao) => {
    const resultado = prefixo(quatroMaisSeis, fracao);
    expect(resultado.ok ? null : resultado.erro.codigo).toBe("fracao_invalida");
  });

  it("renormaliza o prefixo", () => {
    const resultado = prefixo(quatroMaisSeis, 0.3);
    if (!resultado.ok) throw new Error(resultado.erro.detalhe);
    expect(totalDePontos(resultado.valor)).toBe(3);
    expect(Math.max(...resultado.valor.tracos.flat().flat())).toBe(255);
  });
});
