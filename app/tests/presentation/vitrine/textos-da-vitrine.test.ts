import { describe, expect, it } from "vitest";
import type { ResumoDaVitrine } from "../../../src/application/resumo-da-vitrine";
import { CAPITULOS } from "../../../src/domain/vitrine/capitulos";
import {
  cartaoDoCapitulo,
  TEXTO_MAXIMO_DO_CARTAO,
} from "../../../src/presentation/vitrine/textos-da-vitrine";

const COMPLETO: ResumoDaVitrine = {
  cnn: { acuracia: 0.9241, top3: 0.9876 },
  lstm: { acuracia: 0.9278, top3: 0.9893 },
  ensemble: { acuracia: 0.947, top3: 0.9931 },
  ensembleComMetade: 0.7857,
  lora: { rank: 16, percentualTreinavel: 1.0132 },
  exemplosDoZe: 455,
  formato: { base: 0.7826, destilado: 1 },
  quantizacao: { gb16Bits: 3.441, gb8Bits: 1.834 },
  testes: { python: 483, typescript: 664 },
};
const COM_CARTAO = CAPITULOS.filter((c) => c.id !== "abertura" && c.id !== "convite").map((c) => c.id) as (
  "jogo" | "desenho" | "cnn" | "lstm" | "ze" | "destilacao" | "qlora" | "quantizacao" | "engenharia"
)[];

describe("Requisito: Números lidos das métricas (spec vitrine-da-abertura)", () => {
  it("test_metricas_das_redes_92_4_na_cnn_e_94_7_na_lstm", () => {
    expect(cartaoDoCapitulo("cnn", COMPLETO).texto).toContain("92,4%");
    expect(cartaoDoCapitulo("lstm", COMPLETO).texto).toContain("94,7%");
    expect(cartaoDoCapitulo("lstm", COMPLETO).texto).toContain("78,6%");
  });

  it("test_textos_cabem_em_320_caracteres_com_todos_os_numeros", () => {
    for (const id of COM_CARTAO) {
      expect(cartaoDoCapitulo(id, COMPLETO).texto.length, id).toBeLessThanOrEqual(TEXTO_MAXIMO_DO_CARTAO);
    }
  });

  it("test_metrica_ausente_some_da_frase_sem_numero_no_lugar", () => {
    const destilacao = cartaoDoCapitulo("destilacao", {}).texto;
    expect(destilacao).not.toMatch(/\d+ exemplos/);
    expect(cartaoDoCapitulo("cnn", {}).texto).not.toContain("%");
    expect(cartaoDoCapitulo("quantizacao", {}).texto).not.toContain("GB");
    expect(cartaoDoCapitulo("engenharia", {}).texto).not.toContain("testes em Python");
  });
});
