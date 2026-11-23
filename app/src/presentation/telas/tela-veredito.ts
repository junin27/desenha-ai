import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { RODADAS_POR_PARTIDA } from "../../domain/rodada/pontuacao";
import { botao, criar } from "../dom";
import { falaAoVivoNaTela, seloDaFala, TITULO_DO_VEREDITO } from "../textos";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

/** Veredito: o Zé julgando ao vivo e, depois, veredito, pontos, desafio e narração. */
export class TelaVeredito implements Tela {
  readonly raiz: HTMLElement;
  private readonly julgando = criar("div", { classe: "julgando" });
  private readonly zeJulgando = criar("p", { classe: "ze-ao-vivo", dados: { texto: "ze-julgando" } });
  private readonly resultado = criar("div", { classe: "resultado" });
  private readonly veredito = criar("p", { classe: "veredito", dados: { texto: "veredito" } });
  private readonly pontos = criar("p", { classe: "pontos", dados: { texto: "pontos" } });
  private readonly desafio = criar("p", { classe: "desafio", dados: { texto: "desafio" } });
  private readonly narracao = criar("p", { classe: "narracao", dados: { texto: "narracao" } });
  private readonly selo = criar("p", { classe: "selo", dados: { texto: "selo" } });
  private readonly proxima: HTMLButtonElement;

  constructor(
    comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
  ) {
    this.proxima = botao("Próxima rodada", "proxima", () => void comandos.proximaRodada());
    this.julgando.append(criar("h2", { texto: "O Zé tá julgando…" }), this.zeJulgando);
    this.resultado.append(this.veredito, this.pontos, this.desafio, this.narracao, this.selo, this.proxima);
    this.raiz = criar("section", { classe: "tela tela-veredito", dados: { tela: "veredito" } }, [
      this.julgando,
      this.resultado,
    ]);
  }

  atualizar(estado: EstadoDaPartida): void {
    const julgando = estado.etapa === "julgando";
    this.julgando.hidden = !julgando;
    this.resultado.hidden = julgando;
    this.zeJulgando.textContent = falaAoVivoNaTela(estado.falaAoVivo);
    const ultimo = estado.resultados.at(-1);
    if (julgando || ultimo === undefined) return;
    this.veredito.textContent = TITULO_DO_VEREDITO[ultimo.veredito];
    this.veredito.dataset["veredito"] = ultimo.veredito;
    this.pontos.textContent = `+${ultimo.pontos} pontos`;
    this.desafio.textContent = `Era: ${this.informacoes.nomesDasCategorias[ultimo.categoria] ?? ""}`;
    this.narracao.textContent = ultimo.narracao;
    this.selo.textContent = seloDaFala(ultimo.origemDaNarracao, ultimo.modeloDaNarracao);
    const ultimaRodada = estado.rodada + 1 >= RODADAS_POR_PARTIDA;
    this.proxima.textContent = ultimaRodada ? "Ver resultado" : "Próxima rodada";
  }
}
