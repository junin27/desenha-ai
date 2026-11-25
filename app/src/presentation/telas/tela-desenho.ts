import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { desenhoDePontos, type Traco } from "../../domain/desenho/desenho";
import type { EstiloDoTraco } from "../captura-do-desenho";
import { criar } from "../dom";
import { botaoComIcone, comIcone } from "../icones";
import { PainelDeDesenho } from "../lapis/painel-de-desenho";
import { type OpcoesDoQuadro, QuadroDeDesenho } from "../lapis/quadro-de-desenho";
import { palpitesComChance, type PalpiteNaTela } from "../textos";
import { humorDaPartida } from "../ze/controle-de-humor";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import { RelogioEmAnel } from "./relogio-em-anel";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

const FALA_DO_COMECO = "Bora, sô! Capricha no traço!";
const FALA_DO_SUSTO = "Eita, tá acabando o tempo!";

export type OpcoesDaTelaDeDesenho = OpcoesDoPersonagem &
  Omit<OpcoesDoQuadro, "aoEscolherCor"> & {
    /** O visitante ligou ou desligou o som do desenho (para lembrar no navegador do estande). */
    readonly aoMudarSom?: (ligado: boolean) => void;
  };

/**
 * Desenho: painel (ferramentas, espessuras, cores), quadro em camadas com o lápis no ponteiro, "Limpar" e
 * "Pronto", cronômetro em anel, palpites ao vivo e o Zé torcendo.
 */
export class TelaDesenho implements Tela {
  readonly raiz: HTMLElement;
  private readonly relogio = new RelogioEmAnel();
  private readonly charada = criar("p", {
    classe: "charada-pequena",
    dados: { texto: "charada-no-desenho" },
  });
  private readonly palpites = criar("ol", { classe: "palpites", dados: { lista: "palpites" } });
  private readonly semPalpite = criar("p", {
    classe: "dica",
    texto: "Desenhe que as redes já vão palpitando…",
  });
  private readonly quadro: QuadroDeDesenho;
  private readonly painel: PainelDeDesenho;
  private readonly ze: PersonagemDoZe;
  private ativa = false;
  private humorAnterior = "";

  constructor(
    private readonly comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
    opcoes: OpcoesDaTelaDeDesenho = {},
  ) {
    this.ze = new PersonagemDoZe(opcoes);
    this.quadro = new QuadroDeDesenho(
      (tracos, terminado) => {
        this.enviar(tracos, terminado);
      },
      {
        ...opcoes,
        aoEscolherCor: (cor) => {
          this.painel.pintar(cor);
        },
      },
    );
    this.painel = new PainelDeDesenho(this.quadro);
    this.painel.raiz.append(this.criarBotaoDoSom(opcoes.aoMudarSom));
    const acoes = criar("div", { classe: "ferramentas" }, [
      botaoComIcone("lixeira", "Limpar", "limpar", () => {
        this.limpar();
      }),
      botaoComIcone("raio", "Pronto!", "pronto", () => void this.comandos.pronto()),
    ]);
    const coluna = criar("div", { classe: "coluna-do-quadro" }, [this.charada, this.quadro.raiz, acoes]);
    const palpites = criar("div", { classe: "cartao palpites-ao-vivo" }, [
      comIcone("redes", criar("h2", { texto: "O que as redes acham" })),
      this.palpites,
      this.semPalpite,
    ]);
    const lateral = criar("aside", { classe: "lateral" }, [this.relogio.raiz, palpites, this.ze.raiz]);
    this.raiz = criar("section", { classe: "tela tela-desenho", dados: { tela: "desenho" } }, [
      this.painel.raiz,
      coluna,
      lateral,
    ]);
  }

  /** Traços atuais (já sem os apagados): o veredito mostra exatamente o que foi julgado. */
  get tracos(): readonly Traco[] {
    return this.quadro.tracosAtuais;
  }

  /** Cor e espessura de cada traço, na mesma ordem de `tracos`. */
  get estilos(): readonly EstiloDoTraco[] {
    return this.quadro.estilos;
  }

  /** O quadro, para o modo Mão mandar os passos do dedo pelo mesmo caminho do mouse. */
  get quadroDeDesenho(): QuadroDeDesenho {
    return this.quadro;
  }

  atualizar(estado: EstadoDaPartida): void {
    this.ativarCaptura(estado.etapa === "desenhando");
    this.relogio.mostrar(estado.segundosRestantes);
    this.charada.textContent = estado.charada?.texto ?? "";
    const palpites =
      estado.palpite === undefined
        ? []
        : palpitesComChance(estado.palpite.ensemble, this.informacoes.nomesDasCategorias);
    this.palpites.replaceChildren(...palpites.map((palpite, indice) => itemDoPalpite(palpite, indice === 0)));
    this.semPalpite.hidden = palpites.length > 0;
    if (estado.etapa === "desenhando") this.atualizarZe(estado);
  }

  /** Torcendo no começo e assustado nos últimos 5 s; cada troca vem com uma fala. */
  private atualizarZe(estado: EstadoDaPartida): void {
    const humor = humorDaPartida(estado, { semTracos: this.tracos.length === 0 });
    this.ze.mudarHumor(humor);
    if (humor === this.humorAnterior) return;
    this.humorAnterior = humor;
    void this.ze.falar(humor === "assustado" ? FALA_DO_SUSTO : FALA_DO_COMECO);
  }

  /** Ao entrar no desenho: quadro limpo, lápis novo, Lápis/média/tinta; fora dele, não captura. */
  private ativarCaptura(desenhando: boolean): void {
    if (desenhando === this.ativa) return;
    this.ativa = desenhando;
    if (desenhando) {
      this.quadro.limpar();
      this.painel.reiniciar();
      this.humorAnterior = "";
      this.quadro.captura.ligar();
    } else {
      this.quadro.captura.desligar();
      this.quadro.apontar(undefined);
    }
  }

  /** Liga e desliga o som do lápis (spec `lapis-no-quadro`, "Som do desenho"). */
  private criarBotaoDoSom(aoMudar: ((ligado: boolean) => void) | undefined): HTMLButtonElement {
    const nome = criar("span", { texto: "Som" });
    const elemento = criar("button", { classe: "som-do-desenho", dados: { acao: "som-do-desenho" } }, [nome]);
    elemento.type = "button";
    const mostrar = (): void => {
      elemento.setAttribute("aria-pressed", String(this.quadro.som.ligado));
      nome.textContent = this.quadro.som.ligado ? "🔊 Som" : "🔇 Som";
    };
    elemento.addEventListener("click", () => {
      this.quadro.som.ligar(!this.quadro.som.ligado);
      aoMudar?.(this.quadro.som.ligado);
      mostrar();
    });
    mostrar();
    return elemento;
  }

  /** Com traços, reclassifica; se a borracha apagou tudo, zera os palpites como o "Limpar". */
  private enviar(tracos: readonly Traco[], terminado: boolean): void {
    const desenho = desenhoDePontos(tracos);
    if (desenho.ok) void this.comandos.registrarTraco(desenho.valor, terminado);
    else if (terminado) this.comandos.limparDesenho();
  }

  private limpar(): void {
    this.quadro.limpar();
    this.comandos.limparDesenho();
  }
}

/** "vaca 85%" com a barra de marcador do tamanho da chance; o primeiro é o líder. */
function itemDoPalpite({ nome, chance }: PalpiteNaTela, lider: boolean): HTMLLIElement {
  const barra = criar("span", { classe: "barra" });
  barra.style.width = `${String(chance)}%`;
  return criar("li", { classe: lider ? "palpite lider" : "palpite" }, [
    barra,
    criar("span", { classe: "nome", texto: nome }),
    document.createTextNode(" "),
    criar("span", { classe: "chance", texto: `${String(chance)}%` }),
  ]);
}
