import { describe, expect, it } from "vitest";
import { linhasDasMetricasDoSlm, porcento, textoDaParidade } from "../../src/presentation/formato-do-painel";

// Spec `painel-tecnico`, requisito "Métricas do treino" (formatação para a banca).
describe("formatação do painel", () => {
  it("porcentagem com vírgula decimal", () => {
    expect(porcento(0.9125)).toBe("91,3%");
  });

  it("compara base × destilado no formato, por tarefa e nos tamanhos dos GGUF", () => {
    const linhas = linhasDasMetricasDoSlm({
      ensaio: true,
      modelos: {
        base: { formato: 0.12, porTarefa: { CHARADA: 0.05 } },
        destilado: { formato: 0.97, porTarefa: { CHARADA: 0.9 } },
      },
      quantizacao: [{ formato: "INT4", teoricoGb: 1.02, realGb: 1.11 }],
    });
    expect(linhas).toEqual([
      "Formato: base 12,0% × destilado 97,0%",
      "CHARADA: base 5,0% × destilado 90,0%",
      "INT4: teórico 1,02 GB, real 1,11 GB",
      "(modo ensaio: números sem valor estatístico)",
    ]);
  });

  it("paridade divergente aparece em destaque", () => {
    expect(textoDaParidade({ passou: false, casos: 8, maiorDiferenca: 0.05 })).toMatch(/^DIVERGENTE/);
  });
});
