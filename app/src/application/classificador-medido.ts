import type { Desenho } from "../domain/desenho/desenho";
import type { Resultado } from "../domain/resultado";
import type { MedicoesDaSessao } from "./medicoes-da-sessao";
import type { ClassificadorDeDesenho, ErroDoClassificador, ProbabilidadesDasRedes, Relogio } from "./portas";

/**
 * Decorador da porta `ClassificadorDeDesenho` que registra os tempos de cada palpite (D1 do design da
 * bancada-do-ze). O total inclui o pré-processamento; os tempos por rede vêm do adaptador.
 *
 * @example
 * const classificador = new ClassificadorMedido(classificadorOnnx, medicoes, relogio);
 */
export class ClassificadorMedido implements ClassificadorDeDesenho {
  constructor(
    private readonly classificador: ClassificadorDeDesenho,
    private readonly medicoes: MedicoesDaSessao,
    private readonly relogio: Relogio,
  ) {}

  async classificar(desenho: Desenho): Promise<Resultado<ProbabilidadesDasRedes, ErroDoClassificador>> {
    const inicio = this.relogio.instante();
    const resposta = await this.classificador.classificar(desenho);
    if (resposta.ok) {
      const totalMs = this.relogio.instante() - inicio;
      const { cnn, lstm } = resposta.valor.milissegundos ?? { cnn: Number.NaN, lstm: Number.NaN };
      this.medicoes.registrarRedes({ cnnMs: cnn, lstmMs: lstm, totalMs });
    }
    return resposta;
  }
}
