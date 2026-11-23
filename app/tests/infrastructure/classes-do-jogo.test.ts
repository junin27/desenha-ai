import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lerClassesDoJogo } from "../../src/infrastructure/arquivos/classes-do-jogo";

// `classes.json` vem da change treino-das-redes: ordem das categorias e peso do ensemble.
const CLASSES_DO_ENSAIO = resolve(import.meta.dirname, "..", "..", "..", "saida", "ensaio", "classes.json");

const valido = {
  categorias: [
    { indice: 0, en: "cow", pt: "vaca" },
    { indice: 1, en: "horse", pt: "cavalo" },
  ],
  w_cnn: 0.6,
};

describe("leitura do classes.json", () => {
  it("devolve os nomes em português na ordem dos índices e o w_cnn", () => {
    expect(lerClassesDoJogo(valido)).toEqual({
      ok: true,
      valor: { nomesDasCategorias: ["vaca", "cavalo"], pesoDaCnn: 0.6 },
    });
  });

  it.each([
    ["sem categorias", { w_cnn: 0.6 }],
    ["índice fora de ordem", { ...valido, categorias: [{ indice: 1, pt: "cavalo" }] }],
    ["nome que não é texto", { ...valido, categorias: [{ indice: 0, pt: 3 }] }],
    ["w_cnn fora de [0, 1]", { ...valido, w_cnn: 1.5 }],
    ["não é objeto", "classes"],
  ])("recusa arquivo fora do formato (%s) dizendo o que esperava", (_, conteudo) => {
    const lido = lerClassesDoJogo(conteudo);
    expect(lido.ok).toBe(false);
    if (!lido.ok) expect(lido.erro.detalhe).toContain("esperado");
  });

  it.skipIf(!existsSync(CLASSES_DO_ENSAIO))("lê o classes.json do ensaio local (30 categorias)", () => {
    const lido = lerClassesDoJogo(JSON.parse(readFileSync(CLASSES_DO_ENSAIO, "utf8")));
    expect(lido.ok && lido.valor.nomesDasCategorias).toHaveLength(30);
  });
});
