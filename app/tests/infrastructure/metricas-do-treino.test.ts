import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lerMetricasDasRedes, lerMetricasDoSlm } from "../../src/infrastructure/arquivos/metricas-do-treino";

// Spec `painel-tecnico`, requisito "Métricas do treino".
const METRICAS_DO_ENSAIO = resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "saida",
  "ensaio",
  "metricas_redes.json",
);

const REDES = {
  teste: {
    CNN: { acuracia: 0.91, f1_macro: 0.9, top3: 0.98 },
    LSTM: { acuracia: 0.85, f1_macro: 0.84, top3: 0.95 },
    Ensemble: { acuracia: 0.93, f1_macro: 0.92, top3: 0.99 },
  },
  w_cnn: 0.6,
};

/** Formato gravado pela célula 7 do notebook 3 (`metricas_slm.json`). */
const SLM = {
  ensaio: false,
  teste: {
    base: { formato: 0.12, por_tarefa: { CHARADA: 0.05, VEREDITO: 0.1, PERGUNTA: 0.3 }, tokens_medios: 210 },
    destilado: {
      formato: 0.97,
      por_tarefa: { CHARADA: 0.9, VEREDITO: 0.88, PERGUNTA: 0.92 },
      tokens_medios: 140,
    },
  },
  quantizacao: [
    {
      formato: "FP16",
      bytes_por_parametro: 2,
      teorico_gb: 4.06,
      cabe: false,
      margem_gb: -1.26,
      real_gb: null,
    },
    {
      formato: "INT4",
      bytes_por_parametro: 0.5,
      teorico_gb: 1.02,
      cabe: true,
      margem_gb: 1.78,
      real_gb: 1.11,
    },
  ],
};

describe("métricas das redes", () => {
  it("lê acurácia e top-3 de teste da CNN, da LSTM e do ensemble e o w_cnn", () => {
    expect(lerMetricasDasRedes(REDES)).toEqual({
      redes: [
        { nome: "CNN", acuracia: 0.91, top3: 0.98 },
        { nome: "LSTM", acuracia: 0.85, top3: 0.95 },
        { nome: "Ensemble", acuracia: 0.93, top3: 0.99 },
      ],
      pesoDaCnn: 0.6,
    });
  });

  it.each([
    ["ausente", undefined],
    ["sem a seção de teste", { w_cnn: 0.6 }],
    [
      "acurácia que não é número",
      { ...REDES, teste: { ...REDES.teste, CNN: { acuracia: "alta", top3: 1 } } },
    ],
  ])("arquivo %s vira ausente, sem erro", (_, conteudo) => {
    expect(lerMetricasDasRedes(conteudo)).toBeUndefined();
  });

  it.skipIf(!existsSync(METRICAS_DO_ENSAIO))("lê o metricas_redes.json do ensaio local", () => {
    expect(lerMetricasDasRedes(JSON.parse(readFileSync(METRICAS_DO_ENSAIO, "utf8")))?.redes).toHaveLength(3);
  });
});

describe("métricas do SLM", () => {
  it("lê formato e acerto por tarefa do base e do destilado e os tamanhos dos GGUF", () => {
    expect(lerMetricasDoSlm(SLM)).toEqual({
      ensaio: false,
      modelos: {
        base: { formato: 0.12, porTarefa: { CHARADA: 0.05, VEREDITO: 0.1, PERGUNTA: 0.3 } },
        destilado: { formato: 0.97, porTarefa: { CHARADA: 0.9, VEREDITO: 0.88, PERGUNTA: 0.92 } },
      },
      quantizacao: [
        { formato: "FP16", teoricoGb: 4.06, realGb: undefined },
        { formato: "INT4", teoricoGb: 1.02, realGb: 1.11 },
      ],
    });
  });

  it.each([
    ["ausente", undefined],
    ["sem o modelo base", { ...SLM, teste: { destilado: SLM.teste.destilado } }],
    ["quantização que não é lista", { ...SLM, quantizacao: {} }],
  ])("sem métricas do SLM (%s): vira ausente, sem erro", (_, conteudo) => {
    expect(lerMetricasDoSlm(conteudo)).toBeUndefined();
  });
});
