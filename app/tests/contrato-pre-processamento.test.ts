import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { criarDesenho, type Ponto } from "../src/domain/desenho/desenho";
import { normalizar } from "../src/domain/desenho/normalizacao";
import { prefixo } from "../src/domain/desenho/prefixo";
import { rasterizar } from "../src/domain/desenho/rasterizacao";
import { sequenciar } from "../src/domain/desenho/sequencia";
import { prepararDesenhoCapturado } from "../src/domain/desenho/simplificacao";

// Requisito "Contrato entre Python e TypeScript" — o Python (desenha_ml.contratos) é a referência.
type PontosDoContrato = Ponto[][];

interface CasoDoContrato {
  nome: string;
  tracos: PontosDoContrato;
  normalizado: PontosDoContrato;
  capturado: PontosDoContrato;
  prefixo: { fracao: number; tracos: PontosDoContrato };
  imagem: number[];
  sequencia: [number, number, number][];
}

const TOLERANCIA_DE_COORDENADAS = 1e-9;
const TOLERANCIA_DA_SEQUENCIA = 1e-5;
const MAXIMO_DE_PIXELS_DIFERENTES = 2;
const DIFERENCA_MAXIMA_POR_PIXEL = 1 / 16;

const contrato = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "..", "contratos", "pre_processamento.json"), "utf8"),
) as { casos: CasoDoContrato[] };

const vitrine = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "..", "contratos", "vitrine.json"), "utf8"),
) as { casos: CasoDoContrato[] };

function esperarPontosProximos(obtido: readonly (readonly Ponto[])[], esperado: PontosDoContrato): void {
  expect(obtido.map((t) => t.length)).toEqual(esperado.map((t) => t.length));
  obtido.forEach((traco, i) => {
    traco.forEach(([x, y], j) => {
      const [ex, ey] = esperado[i]?.[j] ?? [Number.NaN, Number.NaN];
      expect(Math.abs(x - ex)).toBeLessThanOrEqual(TOLERANCIA_DE_COORDENADAS);
      expect(Math.abs(y - ey)).toBeLessThanOrEqual(TOLERANCIA_DE_COORDENADAS);
    });
  });
}

describe("contrato de pré-processamento (Python → TypeScript)", () => {
  it("tem os casos exigidos pela spec", () => {
    const nomes = contrato.casos.map((c) => c.nome);
    for (const obrigatorio of [
      "ponto_unico",
      "traco_unico",
      "mais_de_130_pontos",
      "linha_vertical",
      "denso_capturado",
    ]) {
      expect(nomes).toContain(obrigatorio);
    }
    expect(nomes.some((n) => n.startsWith("quickdraw_"))).toBe(true);
  });

  it("os desenhos reais da vitrine também estão no contrato (change vitrine-viva)", () => {
    expect(vitrine.casos.length).toBeGreaterThanOrEqual(1);
    expect(vitrine.casos.every((c) => c.nome.startsWith("vitrine_"))).toBe(true);
  });

  // Os desenhos da vitrine passam pelas mesmas verificações: a grade 28×28 e a sequência que a vitrine mostra
  // são as entradas que as redes recebem (spec vitrine-da-abertura, "Grade 28×28 é a entrada da CNN").
  const todos = [...contrato.casos, ...vitrine.casos];
  describe.each(todos.map((caso) => [caso.nome, caso] as const))("caso %s", (_, caso) => {
    const desenho = criarDesenho(caso.tracos);

    it("normalização e simplificação batem", () => {
      esperarPontosProximos(normalizar(desenho).tracos, caso.normalizado);
      esperarPontosProximos(prepararDesenhoCapturado(desenho).tracos, caso.capturado);
    });

    it("prefixo bate", () => {
      const resultado = prefixo(desenho, caso.prefixo.fracao);
      if (!resultado.ok) throw new Error(resultado.erro.detalhe);
      esperarPontosProximos(resultado.valor.tracos, caso.prefixo.tracos);
    });

    it("imagem 28×28 dentro da tolerância", () => {
      const diferencas = [...rasterizar(desenho)].map((v, i) => Math.abs(v - (caso.imagem[i] ?? Number.NaN)));
      expect(diferencas.filter((d) => d > 0).length).toBeLessThanOrEqual(MAXIMO_DE_PIXELS_DIFERENTES);
      expect(Math.max(...diferencas)).toBeLessThanOrEqual(DIFERENCA_MAXIMA_POR_PIXEL);
    });

    it("sequência stroke-3 dentro da tolerância", () => {
      const { pontos, valores } = sequenciar(desenho);
      const esperado = caso.sequencia.flat();
      expect(pontos).toBe(caso.sequencia.length);
      valores.forEach((v, i) => {
        expect(Math.abs(v - (esperado[i] ?? Number.NaN))).toBeLessThanOrEqual(TOLERANCIA_DA_SEQUENCIA);
      });
    });
  });
});
