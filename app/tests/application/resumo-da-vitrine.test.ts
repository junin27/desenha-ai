import { describe, expect, it } from "vitest";
import { formatarPorcentagem, montarResumoDaVitrine } from "../../src/application/resumo-da-vitrine";

const REDES = {
  teste: {
    CNN: { acuracia: 0.9241, top3: 0.9876 },
    LSTM: { acuracia: 0.9278, top3: 0.9893 },
    Ensemble: { acuracia: 0.947, top3: 0.9931 },
  },
  curva_antecipada: { Ensemble: { "0.5": 0.7857 } },
};
const SLM = {
  lora: { r: 16, percentual: 1.0132 },
  dados: { treino: 363, validacao: 46, teste: 46 },
  teste: { base: { formato: 0.7826 }, destilado: { formato: 1 } },
  quantizacao: [
    { formato: "FP16/BF16", teorico_gb: 3.441, real_gb: null },
    { formato: "INT8", teorico_gb: 1.72, real_gb: 1.834 },
  ],
};
const FICHA = { testes: { python: 483, typescript: 664 } };

describe("Requisito: Números lidos das métricas (spec vitrine-da-abertura)", () => {
  it("test_metricas_das_redes_formatadas_com_uma_casa_e_virgula", () => {
    const resumo = montarResumoDaVitrine({ redes: REDES, slm: SLM, ficha: FICHA });
    expect(resumo.cnn && formatarPorcentagem(resumo.cnn.acuracia)).toBe("92,4%");
    expect(resumo.ensemble && formatarPorcentagem(resumo.ensemble.acuracia)).toBe("94,7%");
    expect(resumo.cnn && formatarPorcentagem(resumo.cnn.top3)).toBe("98,8%");
    expect(resumo.ensembleComMetade && formatarPorcentagem(resumo.ensembleComMetade)).toBe("78,6%");
  });

  it("test_numeros_do_slm_e_da_ficha", () => {
    const resumo = montarResumoDaVitrine({ redes: REDES, slm: SLM, ficha: FICHA });
    expect(resumo.lora).toEqual({ rank: 16, percentualTreinavel: 1.0132 });
    expect(resumo.exemplosDoZe).toBe(455);
    expect(resumo.formato).toEqual({ base: 0.7826, destilado: 1 });
    expect(resumo.quantizacao).toEqual({ gb16Bits: 3.441, gb8Bits: 1.834 });
    expect(resumo.testes).toEqual({ python: 483, typescript: 664 });
  });

  it("test_metrica_ausente_e_omitida_sem_valor_inventado", () => {
    const resumo = montarResumoDaVitrine({
      redes: REDES,
      slm: undefined,
      ficha: { testes: { python: "x" } },
    });
    expect(resumo.exemplosDoZe).toBeUndefined();
    expect(resumo.lora).toBeUndefined();
    expect(resumo.quantizacao).toBeUndefined();
    expect(resumo.testes).toBeUndefined();
    expect(resumo.cnn?.acuracia).toBe(0.9241);
  });

  it("test_arquivo_malformado_nao_quebra_e_nao_inventa", () => {
    const resumo = montarResumoDaVitrine({ redes: "lixo", slm: { dados: { treino: -1 } }, ficha: null });
    expect(resumo).toEqual({});
  });
});
