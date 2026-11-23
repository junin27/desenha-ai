import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ort from "onnxruntime-node";
import { describe, expect, it } from "vitest";
import { ClassificadorOnnx } from "../../src/infrastructure/onnx/classificador-onnx";
import { executorDeSessao, type ExecutorDeRede } from "../../src/infrastructure/onnx/executor-de-rede";
import { criarDesenho, type Traco } from "../../src/domain/desenho/desenho";

// Spec `palpites-ao-vivo`. Os modelos do ensaio local ficam fora do Git: sem eles, o teste de paridade é pulado.
const PASTA_DO_ENSAIO = resolve(import.meta.dirname, "..", "..", "..", "saida", "ensaio");
const TEM_MODELOS = ["cnn.onnx", "lstm.onnx", "teste_paridade_redes.json"].every((nome) =>
  existsSync(resolve(PASTA_DO_ENSAIO, nome)),
);
const TOLERANCIA_DE_PARIDADE = 1e-4;

interface CasoDeParidade {
  readonly rotulo: number;
  readonly tracos: readonly Traco[];
  readonly probs_cnn: readonly number[];
  readonly probs_lstm: readonly number[];
}

async function sessao(nome: string): Promise<ExecutorDeRede> {
  return executorDeSessao(await ort.InferenceSession.create(resolve(PASTA_DO_ENSAIO, nome)), ort.Tensor);
}

function maiorDiferenca(a: readonly number[], b: readonly number[]): number {
  return Math.max(...a.map((valor, i) => Math.abs(valor - (b[i] ?? Number.NaN))));
}

/** Executor que só registra o que recebeu e devolve probabilidades uniformes. */
class ExecutorEspiao implements ExecutorDeRede {
  readonly formas: (readonly number[])[] = [];

  executar(valores: Float32Array, forma: readonly number[]): Promise<Float32Array> {
    this.formas.push(forma);
    expect(valores.length).toBe(forma.reduce((a, b) => a * b, 1));
    return Promise.resolve(new Float32Array(30).fill(1 / 30));
  }
}

describe("palpite a cada traço (adaptador ONNX)", () => {
  it("envia a imagem [1, 1, 28, 28] à CNN e a sequência [1, pontos, 3] à LSTM", async () => {
    const cnn = new ExecutorEspiao();
    const lstm = new ExecutorEspiao();
    const desenho = criarDesenho([
      [
        [0, 0],
        [100, 50],
      ],
      [[30, 200]],
    ]);
    const resposta = await new ClassificadorOnnx(cnn, lstm).classificar(desenho);
    expect(resposta.ok).toBe(true);
    expect(cnn.formas).toEqual([[1, 1, 28, 28]]);
    expect(lstm.formas).toEqual([[1, 3, 3]]);
  });

  it("falha da sessão vira classificador_indisponivel, sem exceção", async () => {
    const quebrado: ExecutorDeRede = { executar: () => Promise.reject(new Error("sessão encerrada")) };
    const resposta = await new ClassificadorOnnx(quebrado, quebrado).classificar(criarDesenho([[[0, 0]]]));
    expect(resposta.ok).toBe(false);
    if (!resposta.ok) expect(resposta.erro.detalhe).toContain("sessão encerrada");
  });
});

describe.skipIf(!TEM_MODELOS)("paridade com o treino (modelos do ensaio local)", () => {
  it("as redes no runtime ONNX repetem as probabilidades do treino (diferença máxima 1e-4)", async () => {
    const classificador = new ClassificadorOnnx(await sessao("cnn.onnx"), await sessao("lstm.onnx"));
    const texto = readFileSync(resolve(PASTA_DO_ENSAIO, "teste_paridade_redes.json"), "utf8");
    const casos = JSON.parse(texto) as CasoDeParidade[];
    for (const caso of casos) {
      const resposta = await classificador.classificar(criarDesenho(caso.tracos));
      if (!resposta.ok) throw new Error(resposta.erro.detalhe);
      expect(maiorDiferenca(resposta.valor.cnn, caso.probs_cnn)).toBeLessThan(TOLERANCIA_DE_PARIDADE);
      expect(maiorDiferenca(resposta.valor.lstm, caso.probs_lstm)).toBeLessThan(TOLERANCIA_DE_PARIDADE);
    }
  });
});
