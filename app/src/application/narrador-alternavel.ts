import { ok, type Resultado } from "../domain/resultado";
import type { ErroDoNarrador, FalaFinal, ModeloDoZe, NarradorDoJogo, OuvinteDaFala } from "./portas";

/**
 * Narrador que alterna entre o Zé destilado e o Qwen3 base (D2 do design da bancada-do-ze). A escolha é
 * lida no início de cada fala, então trocar no meio não muda quem termina a fala em andamento.
 *
 * @example
 * const narrador = new NarradorAlternavel(destilado, base);
 * narrador.escolher("base"); // vale a partir do próximo pedido
 */
export class NarradorAlternavel implements NarradorDoJogo {
  private escolha: ModeloDoZe = "destilado";
  private readonly narradores: Readonly<Record<ModeloDoZe, NarradorDoJogo>>;

  constructor(destilado: NarradorDoJogo, base: NarradorDoJogo) {
    this.narradores = { destilado, base };
  }

  get escolhido(): ModeloDoZe {
    return this.escolha;
  }

  escolher(modelo: ModeloDoZe): void {
    this.escolha = modelo;
  }

  async falar(entrada: string, aoLer: OuvinteDaFala): Promise<Resultado<FalaFinal, ErroDoNarrador>> {
    const modelo = this.escolha;
    const resposta = await this.narradores[modelo].falar(entrada, aoLer);
    return resposta.ok ? ok({ ...resposta.valor, modelo }) : resposta;
  }
}
