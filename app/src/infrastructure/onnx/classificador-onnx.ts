import type {
  ClassificadorDeDesenho,
  ErroDoClassificador,
  ProbabilidadesDasRedes,
} from "../../application/portas";
import type { Desenho } from "../../domain/desenho/desenho";
import { LADO_DA_IMAGEM, rasterizar } from "../../domain/desenho/rasterizacao";
import { sequenciar } from "../../domain/desenho/sequencia";
import { falha, ok, type Resultado } from "../../domain/resultado";
import type { ExecutorDeRede } from "./executor-de-rede";

const CANAIS_DA_IMAGEM = 1;
const VALORES_POR_PONTO = 3; // (Δx, Δy, fim do traço)

/**
 * CNN e LSTM do treino rodando no navegador (D4 do design). Usa o mesmo pré-processamento de domínio que
 * o contrato com o Python garante; as sessões vêm prontas (injetadas), para o teste usar o onnxruntime-node.
 *
 * @example
 * await new ClassificadorOnnx(cnn, lstm).classificar(desenhoPreparado); // ok({ cnn: [...30], lstm: [...30] })
 */
export class ClassificadorOnnx implements ClassificadorDeDesenho {
  constructor(
    private readonly cnn: ExecutorDeRede,
    private readonly lstm: ExecutorDeRede,
  ) {}

  async classificar(desenho: Desenho): Promise<Resultado<ProbabilidadesDasRedes, ErroDoClassificador>> {
    const imagem = rasterizar(desenho);
    const sequencia = sequenciar(desenho);
    try {
      // Uma rede de cada vez: o wasm roda com 1 thread (D4), então em paralelo não ganharia nada.
      const cnn = await this.cnn.executar(imagem, [1, CANAIS_DA_IMAGEM, LADO_DA_IMAGEM, LADO_DA_IMAGEM]);
      const lstm = await this.lstm.executar(sequencia.valores, [1, sequencia.pontos, VALORES_POR_PONTO]);
      return ok({ cnn: Array.from(cnn), lstm: Array.from(lstm) });
    } catch (erro) {
      return falha({ codigo: "classificador_indisponivel", detalhe: `redes ONNX falharam: ${String(erro)}` });
    }
  }
}
