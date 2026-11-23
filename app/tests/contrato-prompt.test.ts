import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PARADA, promptDeInferencia } from "../src/domain/ze/prompt";

// Requisito "Contrato do prompt" (spec modelo-do-ze): o jogo envia ao llama-server o mesmo texto do treino.
interface ContratoDoPrompt {
  parada: string;
  casos: { entrada: string; prompt: string }[];
}

const contrato = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "..", "contratos", "prompt_qwen.json"), "utf8"),
) as ContratoDoPrompt;

describe("contrato do prompt do Qwen3 (Python → TypeScript)", () => {
  it("mesma parada", () => {
    expect(PARADA).toBe(contrato.parada);
  });

  it("prompts idênticos caractere por caractere", () => {
    expect(contrato.casos).toHaveLength(4);
    for (const caso of contrato.casos) expect(promptDeInferencia(caso.entrada)).toBe(caso.prompt);
  });

  it("thinking nativo desligado no fim do prompt", () => {
    expect(promptDeInferencia("x").endsWith("<|im_start|>assistant\n<think>\n\n</think>\n\n")).toBe(true);
  });
});
