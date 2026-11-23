import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { desenhoDePontos, type Traco } from "../../domain/desenho/desenho";
import { CapturaDoDesenho } from "../captura-do-desenho";
import { botao, criar, preencherLista } from "../dom";
import { palpitesNaTela, segundosNaTela } from "../textos";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

/** Resolução interna do canvas; o CSS ajusta o tamanho na tela e a captura converte as coordenadas. */
const LADO_DO_CANVAS = 560;

/** Desenho: canvas, cronômetro, charada e os 3 primeiros palpites ao vivo. */
export class TelaDesenho implements Tela {
  readonly raiz: HTMLElement;
  private readonly cronometro = criar("p", { classe: "cronometro", dados: { texto: "cronometro" } });
  private readonly charada = criar("p", {
    classe: "charada-pequena",
    dados: { texto: "charada-no-desenho" },
  });
  private readonly palpites = criar("ol", { classe: "palpites", dados: { lista: "palpites" } });
  private readonly semPalpite = criar("p", {
    classe: "dica",
    texto: "Desenhe que as redes já vão palpitando…",
  });
  private readonly captura: CapturaDoDesenho;
  private ativa = false;

  constructor(
    private readonly comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
  ) {
    const canvas = criar("canvas", { classe: "quadro" });
    canvas.width = LADO_DO_CANVAS;
    canvas.height = LADO_DO_CANVAS;
    this.captura = new CapturaDoDesenho(canvas, (tracos, terminado) => {
      this.enviar(tracos, terminado);
    });
    const lateral = criar("aside", { classe: "lateral" }, [
      this.cronometro,
      this.charada,
      criar("h2", { texto: "As redes acham que é…" }),
      this.palpites,
      this.semPalpite,
      criar("div", { classe: "linha" }, [
        botao("Limpar", "limpar", () => {
          this.limpar();
        }),
        botao("Pronto!", "pronto", () => void this.comandos.pronto()),
      ]),
    ]);
    this.raiz = criar("section", { classe: "tela tela-desenho", dados: { tela: "desenho" } }, [
      canvas,
      lateral,
    ]);
  }

  atualizar(estado: EstadoDaPartida): void {
    this.ativarCaptura(estado.etapa === "desenhando");
    this.cronometro.textContent = segundosNaTela(estado.segundosRestantes);
    this.charada.textContent = estado.charada?.texto ?? "";
    const textos =
      estado.palpite === undefined
        ? []
        : palpitesNaTela(estado.palpite.ensemble, this.informacoes.nomesDasCategorias);
    preencherLista(this.palpites, textos);
    this.semPalpite.hidden = textos.length > 0;
  }

  /** Ao entrar no desenho, o canvas começa limpo; fora dele, não captura. */
  private ativarCaptura(desenhando: boolean): void {
    if (desenhando === this.ativa) return;
    this.ativa = desenhando;
    if (desenhando) {
      this.captura.limpar();
      this.captura.ligar();
    } else {
      this.captura.desligar();
    }
  }

  private enviar(tracos: readonly Traco[], terminado: boolean): void {
    const desenho = desenhoDePontos(tracos);
    if (desenho.ok) void this.comandos.registrarTraco(desenho.valor, terminado);
  }

  private limpar(): void {
    this.captura.limpar();
    this.comandos.limparDesenho();
  }
}
