import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { botao, criar } from "../dom";
import { posicaoNoPlacar } from "../textos";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

/** Fim: total da partida e posição no placar. */
export class TelaFim implements Tela {
  readonly raiz: HTMLElement;
  private readonly total = criar("p", { classe: "total", dados: { texto: "total" } });
  private readonly posicao = criar("p", { classe: "posicao", dados: { texto: "posicao" } });

  constructor(
    comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
  ) {
    this.raiz = criar("section", { classe: "tela tela-fim", dados: { tela: "fim" } }, [
      criar("h2", { texto: "Fim de rodeio!" }),
      this.total,
      this.posicao,
      botao("Jogar de novo", "nova-partida", () => {
        comandos.novaPartida();
      }),
    ]);
  }

  atualizar(estado: EstadoDaPartida): void {
    this.total.textContent = `${estado.nome}, você fez ${estado.total} pontos`;
    const posicao = posicaoNoPlacar(this.informacoes.lerPlacar(), estado.total);
    this.posicao.textContent = `${posicao}º lugar no placar`;
  }
}
