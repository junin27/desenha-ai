import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { botaoComIcone, comIcone } from "../icones";
import { desenhoDePontos, type Traco } from "../../domain/desenho/desenho";
import { CapturaDoDesenho, type Ferramenta } from "../captura-do-desenho";
import { criar } from "../dom";
import { palpitesComChance, type PalpiteNaTela } from "../textos";
import { humorDaPartida } from "../ze/controle-de-humor";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import { RelogioEmAnel } from "./relogio-em-anel";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

/** Resolução interna do canvas; o CSS ajusta o tamanho na tela e a captura converte as coordenadas. */
const LADO_DO_CANVAS = 560;
const FALA_DO_COMECO = "Bora, sô! Capricha no traço!";
const FALA_DO_SUSTO = "Eita, tá acabando o tempo!";

/** Desenho: quadro com lápis, borracha e limpar, cronômetro em anel, palpites ao vivo e o Zé torcendo. */
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
  private readonly botoesDeFerramenta: Readonly<Record<Ferramenta, HTMLButtonElement>>;
  private readonly captura: CapturaDoDesenho;
  private readonly ze: PersonagemDoZe;
  private ativa = false;
  private humorAnterior = "";

  constructor(
    private readonly comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
    opcoesDoZe: OpcoesDoPersonagem = {},
  ) {
    this.ze = new PersonagemDoZe(opcoesDoZe);
    const canvas = criar("canvas", { classe: "quadro" });
    canvas.width = LADO_DO_CANVAS;
    canvas.height = LADO_DO_CANVAS;
    this.captura = new CapturaDoDesenho(canvas, (tracos, terminado) => {
      this.enviar(tracos, terminado);
    });
    this.botoesDeFerramenta = {
      lapis: this.botaoDeFerramenta("lapis", "Lápis"),
      borracha: this.botaoDeFerramenta("borracha", "Borracha"),
    };
    const ferramentas = criar("div", { classe: "ferramentas" }, [
      this.botoesDeFerramenta.lapis,
      this.botoesDeFerramenta.borracha,
      botaoComIcone("lixeira", "Limpar", "limpar", () => {
        this.limpar();
      }),
      botaoComIcone("raio", "Pronto!", "pronto", () => void this.comandos.pronto()),
    ]);
    const coluna = criar("div", { classe: "coluna-do-quadro" }, [
      this.charada,
      criar("div", { classe: "moldura-do-quadro" }, [canvas]),
      ferramentas,
    ]);
    const palpites = criar("div", { classe: "cartao palpites-ao-vivo" }, [
      comIcone("redes", criar("h2", { texto: "O que as redes acham" })),
      this.palpites,
      this.semPalpite,
    ]);
    const lateral = criar("aside", { classe: "lateral" }, [this.relogio.raiz, palpites, this.ze.raiz]);
    this.raiz = criar("section", { classe: "tela tela-desenho", dados: { tela: "desenho" } }, [
      coluna,
      lateral,
    ]);
  }

  /** Traços atuais (já sem os apagados): o veredito mostra exatamente o que foi julgado. */
  get tracos(): readonly Traco[] {
    return this.captura.tracos;
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

  private botaoDeFerramenta(ferramenta: Ferramenta, texto: string): HTMLButtonElement {
    const elemento = botaoComIcone(ferramenta, texto, `ferramenta-${ferramenta}`, () => {
      this.escolher(ferramenta);
    });
    elemento.classList.add("ferramenta");
    elemento.dataset["ferramenta"] = ferramenta;
    return elemento;
  }

  private escolher(ferramenta: Ferramenta): void {
    this.captura.usar(ferramenta);
    for (const [nome, elemento] of Object.entries(this.botoesDeFerramenta)) {
      elemento.setAttribute("aria-pressed", String(nome === ferramenta));
    }
  }

  /** Ao entrar no desenho, o canvas começa limpo e com o lápis; fora dele, não captura. */
  private ativarCaptura(desenhando: boolean): void {
    if (desenhando === this.ativa) return;
    this.ativa = desenhando;
    if (desenhando) {
      this.captura.limpar();
      this.escolher("lapis");
      this.humorAnterior = "";
      this.captura.ligar();
    } else {
      this.captura.desligar();
    }
  }

  /** Com traços, reclassifica; se a borracha apagou tudo, zera os palpites como o "Limpar". */
  private enviar(tracos: readonly Traco[], terminado: boolean): void {
    const desenho = desenhoDePontos(tracos);
    if (desenho.ok) void this.comandos.registrarTraco(desenho.valor, terminado);
    else if (terminado) this.comandos.limparDesenho();
  }

  private limpar(): void {
    this.captura.limpar();
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
