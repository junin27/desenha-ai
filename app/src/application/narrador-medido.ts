import type { Resultado } from "../domain/resultado";
import type { MedicoesDaSessao } from "./medicoes-da-sessao";
import type { ErroDoNarrador, FalaFinal, ModeloDoZe, NarradorDoJogo, OuvinteDaFala, Relogio } from "./portas";

/**
 * Decorador da porta `NarradorDoJogo` que mede cada fala de um modelo (D1 do design da bancada-do-ze):
 * tempo até o 1º pedaço, duração total, tokens e tokens/s; falhas são contadas por código.
 *
 * @example
 * const destilado = new NarradorMedido(narradorLlama8080, "destilado", medicoes, relogio);
 */
export class NarradorMedido implements NarradorDoJogo {
  constructor(
    private readonly narrador: NarradorDoJogo,
    private readonly modelo: ModeloDoZe,
    private readonly medicoes: MedicoesDaSessao,
    private readonly relogio: Relogio,
  ) {}

  async falar(entrada: string, aoLer: OuvinteDaFala): Promise<Resultado<FalaFinal, ErroDoNarrador>> {
    this.medicoes.registrarPedido(this.modelo);
    const inicio = this.relogio.instante();
    let primeiroPedaco: number | undefined;
    const resposta = await this.narrador.falar(entrada, (leitura) => {
      primeiroPedaco ??= this.relogio.instante();
      aoLer(leitura);
    });
    if (!resposta.ok) {
      this.medicoes.registrarFalha(this.modelo, resposta.erro.codigo);
      return resposta;
    }
    this.medicoes.registrarFala({
      modelo: this.modelo,
      ateOPrimeiroTokenMs: primeiroPedaco === undefined ? undefined : primeiroPedaco - inicio,
      duracaoMs: this.relogio.instante() - inicio,
      tokens: resposta.valor.tokens,
      tokensPorSegundo: resposta.valor.tokensPorSegundo,
    });
    return resposta;
  }
}
