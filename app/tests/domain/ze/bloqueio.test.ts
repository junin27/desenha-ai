import { describe, expect, it } from "vitest";
import { perguntaBloqueada } from "../../../src/domain/ze/bloqueio";

// Spec `pergunte-ao-ze`, requisito "Bloqueio de perguntas ofensivas".
describe("bloqueio de perguntas ofensivas", () => {
  it.each(["Qual é a PÓRRA desse jogo?", "seu Zé, vc é um otário", "Que merda é essa?", "vai se foder"])(
    "palavra bloqueada com acento e maiúscula: %s",
    (pergunta) => {
      expect(perguntaBloqueada(pergunta)).toBe(true);
    },
  );

  it.each([
    "Como o computador reconhece o desenho?",
    "Cuscuz é comida de Goiás?",
    "O que é uma rede neural convolucional?",
    "Qual a capital de Massachusetts, Boston?",
    "O viaduto é desenhável?",
  ])("pergunta normal com palavra parecida não é bloqueada: %s", (pergunta) => {
    expect(perguntaBloqueada(pergunta)).toBe(false);
  });

  it("pergunta vazia não é bloqueada (o limite de tamanho cuida dela)", () => {
    expect(perguntaBloqueada("   ")).toBe(false);
  });
});
