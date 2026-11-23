import * as ort from "onnxruntime-web/wasm";
import enderecoDoWasm from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import type { ErroDoClassificador } from "../../application/portas";
import { falha, ok, type Resultado } from "../../domain/resultado";
import { ClassificadorOnnx } from "./classificador-onnx";
import { executorDeSessao } from "./executor-de-rede";

/**
 * Cria as sessões da CNN e da LSTM no navegador (D4 do design). O `.wasm` entra no build pelo Vite
 * (`?url`), então nada é buscado fora do jogo; 1 thread dispensa *cross-origin isolation* no estande.
 *
 * @example
 * const redes = await carregarRedesNoNavegador("modelos");
 */
export async function carregarRedesNoNavegador(
  pastaDosModelos: string,
): Promise<Resultado<ClassificadorOnnx, ErroDoClassificador>> {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = { wasm: enderecoDoWasm };
  try {
    const cnn = await ort.InferenceSession.create(`${pastaDosModelos}/cnn.onnx`);
    const lstm = await ort.InferenceSession.create(`${pastaDosModelos}/lstm.onnx`);
    return ok(new ClassificadorOnnx(executorDeSessao(cnn, ort.Tensor), executorDeSessao(lstm, ort.Tensor)));
  } catch (erro) {
    const detalhe = `não deu para abrir ${pastaDosModelos}/cnn.onnx e lstm.onnx: ${String(erro)}`;
    return falha({ codigo: "classificador_indisponivel", detalhe });
  }
}
