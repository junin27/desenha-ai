import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { criarDesenho, type Ponto } from "../../../src/domain/desenho/desenho";
import { rasterizar } from "../../../src/domain/desenho/rasterizacao";
import { sequenciar } from "../../../src/domain/desenho/sequencia";
import { prepararDesenhoCapturado } from "../../../src/domain/desenho/simplificacao";

// Requisito "Desempenho no navegador": palpites a cada traço exigem pré-processamento barato.
const EXECUCOES = 50;
const MEDIANA_MAXIMA_MS = 15;

function rabiscoDe130Pontos(): Ponto[][] {
  // Três traços em zigue-zague: o RDP mantém quase todos os pontos (pior caso para a rasterização).
  return [0, 1, 2].map((traco) =>
    Array.from({ length: traco === 2 ? 44 : 43 }, (_, i) => [i * 6, traco * 80 + (i % 2) * 40] as const),
  );
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)] ?? Number.NaN;
}

describe("Requisito: Desempenho no navegador", () => {
  it(`pré-processa um desenho de 130 pontos em até ${MEDIANA_MAXIMA_MS} ms (mediana de ${EXECUCOES})`, () => {
    const desenho = criarDesenho(rabiscoDe130Pontos());
    expect(desenho.tracos.flat()).toHaveLength(130);
    const tempos = Array.from({ length: EXECUCOES }, () => {
      const inicio = performance.now();
      const preparado = prepararDesenhoCapturado(desenho);
      rasterizar(preparado);
      sequenciar(preparado);
      return performance.now() - inicio;
    });
    console.info(`pré-processamento completo: mediana ${mediana(tempos).toFixed(2)} ms`);
    expect(mediana(tempos)).toBeLessThanOrEqual(MEDIANA_MAXIMA_MS);
  });
});
