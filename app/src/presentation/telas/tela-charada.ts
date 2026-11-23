import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { RODADAS_POR_PARTIDA } from "../../domain/rodada/pontuacao";
import { botao, criar } from "../dom";
import { falaAoVivoNaTela } from "../textos";
import type { ComandosDoJogo, Tela } from "./tela";

/** Charada: o Zé pensando ao vivo, depois a charada e o botão para começar a desenhar. */
export class TelaCharada implements Tela {
  readonly raiz: HTMLElement;
  private readonly rodada = criar("p", { classe: "rodada", dados: { texto: "rodada" } });
  private readonly pensando = criar("p", { classe: "ze-ao-vivo", dados: { texto: "ze-ao-vivo" } });
  private readonly charada = criar("p", { classe: "charada", dados: { texto: "charada" } });
  private readonly desenhar: HTMLButtonElement;

  constructor(comandos: ComandosDoJogo) {
    this.desenhar = botao("Bora desenhar!", "desenhar", () => {
      comandos.desenhar();
    });
    this.raiz = criar("section", { classe: "tela tela-charada", dados: { tela: "charada" } }, [
      this.rodada,
      criar("h2", { texto: "O Zé do Rabisco tem uma charada pra você…" }),
      this.pensando,
      this.charada,
      this.desenhar,
    ]);
  }

  atualizar(estado: EstadoDaPartida): void {
    this.rodada.textContent = `Rodada ${estado.rodada + 1} de ${RODADAS_POR_PARTIDA}`;
    const pronta = estado.charada !== undefined;
    this.pensando.hidden = pronta;
    this.pensando.textContent = falaAoVivoNaTela(estado.falaAoVivo) || "Pensando…";
    this.charada.textContent = estado.charada?.texto ?? "";
    this.desenhar.disabled = !pronta;
  }
}
