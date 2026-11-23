import type { InferenceSession, Tensor } from "onnxruntime-web";

/** Uma rede pronta para rodar: recebe o tensor achatado e a forma, devolve as probabilidades. */
export interface ExecutorDeRede {
  executar(valores: Float32Array, forma: readonly number[]): Promise<Float32Array>;
}

/**
 * Adapta uma sessão do onnxruntime (web no navegador, node nos testes: a API é a mesma) ao executor. A
 * classe `Tensor` vem de fora porque cada pacote tem a sua.
 *
 * @example
 * executorDeSessao(await ort.InferenceSession.create("modelos/cnn.onnx"), ort.Tensor);
 */
export function executorDeSessao(sessao: InferenceSession, ClasseTensor: typeof Tensor): ExecutorDeRede {
  const [entrada] = sessao.inputNames;
  const [saida] = sessao.outputNames;
  return {
    async executar(valores, forma) {
      if (entrada === undefined || saida === undefined) {
        throw new Error(
          `modelo sem entrada/saída: ${sessao.inputNames.join()} → ${sessao.outputNames.join()}`,
        );
      }
      const resultados = await sessao.run({ [entrada]: new ClasseTensor("float32", valores, forma) });
      const probabilidades = resultados[saida]?.data;
      if (!(probabilidades instanceof Float32Array)) {
        throw new Error(`saída "${saida}" não é float32; esperado as probabilidades das categorias`);
      }
      return probabilidades;
    },
  };
}
