import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lerCasosDeParidade } from "../../src/infrastructure/arquivos/casos-de-paridade";

// `teste_paridade_redes.json` vem da change treino-das-redes.
const ARQUIVO_DO_ENSAIO = resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "saida",
  "ensaio",
  "teste_paridade_redes.json",
);

describe("leitura do teste_paridade_redes.json", () => {
  it("converte traços e probabilidades de cada caso", () => {
    const lido = lerCasosDeParidade([
      {
        rotulo: 0,
        tracos: [
          [
            [0, 0],
            [10, 5],
          ],
        ],
        probs_cnn: [1, 0],
        probs_lstm: [0, 1],
      },
    ]);
    expect(lido).toEqual({
      ok: true,
      valor: [
        {
          desenho: {
            tracos: [
              [
                [0, 0],
                [10, 5],
              ],
            ],
          },
          probabilidadesCnn: [1, 0],
          probabilidadesLstm: [0, 1],
        },
      ],
    });
  });

  it.each([
    ["não é lista", { casos: [] }],
    ["caso sem probabilidades", [{ tracos: [[[0, 0]]] }]],
    ["traço com ponto de 3 valores", [{ tracos: [[[0, 0, 1]]], probs_cnn: [1], probs_lstm: [1] }]],
  ])("recusa arquivo fora do formato (%s)", (_, conteudo) => {
    const lido = lerCasosDeParidade(conteudo);
    expect(lido.ok).toBe(false);
    if (!lido.ok) expect(lido.erro.detalhe).toContain("esperado");
  });

  it.skipIf(!existsSync(ARQUIVO_DO_ENSAIO))("lê o arquivo do ensaio local", () => {
    const lido = lerCasosDeParidade(JSON.parse(readFileSync(ARQUIVO_DO_ENSAIO, "utf8")));
    expect(lido.ok && lido.valor.length).toBeGreaterThan(0);
  });
});
