import type {
  EstadoDaPartida,
  PalpiteDaRodada,
  ResultadoDaRodada,
} from "../../application/estado-da-partida";
import type { Traco } from "../../domain/desenho/desenho";
import { RODADAS_POR_PARTIDA } from "../../domain/rodada/pontuacao";
import { desenharTracos, type EstiloDoTraco } from "../captura-do-desenho";
import { botao, criar, mostrarSelo } from "../dom";
import { falaAoVivoNaTela, palpitesComChance, seloDaFala, TITULO_DO_VEREDITO } from "../textos";
import { humorDaPartida } from "../ze/controle-de-humor";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

/** Mesma resolução do quadro de desenho, para redesenhar os traços na mesma escala. */
const LADO_DO_DESENHO = 560;
const REDES: readonly { readonly chave: keyof PalpiteDaRodada; readonly nome: string }[] = [
  { chave: "cnn", nome: "CNN (imagem)" },
  { chave: "lstm", nome: "LSTM (traços)" },
  { chave: "ensemble", nome: "Ensemble" },
];

export interface OpcoesDoVeredito extends OpcoesDoPersonagem {
  /** Dispara a comemoração (confete) no ACERTOU; os testes contam as chamadas. */
  readonly comemorar?: () => void;
}

/**
 * Veredito: enquanto julga, o Zé narrando ao vivo; depois, o desenho julgado com o selo, pontos e total,
 * o palpite de cada rede e a narração do Zé (spec `veredito-ilustrado`).
 */
export class TelaVeredito implements Tela {
  readonly raiz: HTMLElement;
  private readonly julgando = criar("div", { classe: "julgando cartao" });
  private readonly zeJulgando = criar("p", { classe: "ze-ao-vivo", dados: { texto: "ze-julgando" } });
  private readonly resultado = criar("div", { classe: "resultado" });
  private readonly meuDesenho = criar("canvas", { classe: "meu-desenho", dados: { parte: "meu-desenho" } });
  private readonly veredito = criar("p", { classe: "selo-do-veredito", dados: { texto: "veredito" } });
  private readonly desafio = criar("p", { classe: "desafio", dados: { texto: "desafio" } });
  private readonly pontos = criar("p", { classe: "pontos", dados: { texto: "pontos" } });
  private readonly redes = criar("ul", { classe: "redes", dados: { lista: "redes" } });
  private readonly narracao = criar("p", { classe: "narracao balao", dados: { texto: "narracao" } });
  private readonly selo = criar("p", { classe: "selo", dados: { texto: "selo" } });
  private readonly proxima: HTMLButtonElement;
  private readonly ze: PersonagemDoZe;
  private readonly comemorar: () => void;
  private tracos: readonly Traco[] = [];
  private estilos: readonly EstiloDoTraco[] = [];
  /** Rodada já reagida (quantos resultados e quais categorias), para o Zé e o confete não repetirem. */
  private rodadaReagida = "";

  constructor(
    comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
    opcoes: OpcoesDoVeredito = {},
  ) {
    this.ze = new PersonagemDoZe(opcoes);
    this.comemorar = opcoes.comemorar ?? (() => undefined);
    this.meuDesenho.width = LADO_DO_DESENHO;
    this.meuDesenho.height = LADO_DO_DESENHO;
    this.proxima = botao("Próxima rodada →", "proxima", () => void comandos.proximaRodada());
    this.proxima.classList.add("principal");
    this.julgando.append(criar("h2", { texto: "O Zé tá julgando…" }), this.zeJulgando);
    const quadro = criar("figure", { classe: "quadro-do-veredito" }, [
      this.meuDesenho,
      this.veredito,
      this.desafio,
    ]);
    const lateral = criar("div", { classe: "lado-do-resultado" }, [
      this.pontos,
      this.redes,
      criar("div", { classe: "ze-narrando" }, [this.ze.raiz, this.narracao]),
      this.selo,
      this.proxima,
    ]);
    this.resultado.append(quadro, lateral);
    this.raiz = criar("section", { classe: "tela tela-veredito", dados: { tela: "veredito" } }, [
      this.julgando,
      this.resultado,
    ]);
  }

  /** Traços que as redes julgaram (já sem os apagados), vindos da tela de desenho. */
  definirTracos(tracos: readonly Traco[], estilos: readonly EstiloDoTraco[] = []): void {
    this.tracos = tracos.map((traco) => [...traco]);
    this.estilos = [...estilos];
  }

  /** O Zé desta tela, para o vigia do tédio. */
  get personagem(): PersonagemDoZe {
    return this.ze;
  }

  atualizar(estado: EstadoDaPartida): void {
    const julgando = estado.etapa === "julgando";
    this.julgando.hidden = !julgando;
    this.resultado.hidden = julgando;
    this.zeJulgando.textContent = falaAoVivoNaTela(estado.falaAoVivo);
    const ultimo = estado.resultados.at(-1);
    if (julgando || ultimo === undefined) return;
    this.mostrarResultado(estado, ultimo);
    const rodada = `${String(estado.resultados.length)}:${estado.categorias.join(",")}`;
    if (rodada === this.rodadaReagida) return;
    this.rodadaReagida = rodada;
    this.reagir(estado, ultimo);
  }

  private mostrarResultado(estado: EstadoDaPartida, ultimo: ResultadoDaRodada): void {
    this.desenharMeuDesenho();
    this.veredito.textContent = TITULO_DO_VEREDITO[ultimo.veredito];
    this.veredito.dataset["veredito"] = ultimo.veredito;
    const total = estado.resultados.reduce((soma, rodada) => soma + rodada.pontos, 0);
    this.pontos.textContent = `+${String(ultimo.pontos)} pontos · total ${String(total)}`;
    this.desafio.textContent = `Era: ${this.informacoes.nomesDasCategorias[ultimo.categoria] ?? ""}`;
    this.redes.replaceChildren(
      ...REDES.map((rede) => this.itemDaRede(rede, estado.palpite, ultimo.categoria)),
    );
    this.narracao.textContent = ultimo.narracao;
    mostrarSelo(this.selo, seloDaFala(ultimo.origemDaNarracao, ultimo.modeloDaNarracao));
    const ultimaRodada = estado.rodada + 1 >= RODADAS_POR_PARTIDA;
    this.proxima.textContent = ultimaRodada ? "Ver placar →" : "Próxima rodada →";
  }

  /** Só uma vez por resultado: humor do Zé, a fala e o confete do acerto. */
  private reagir(estado: EstadoDaPartida, ultimo: ResultadoDaRodada): void {
    this.ze.mostrarTexto("");
    this.ze.mudarHumor(humorDaPartida(estado, { semTracos: this.tracos.length === 0 }));
    void this.ze.falar(ultimo.narracao).then(() => {
      this.ze.mostrarTexto("");
    });
    if (ultimo.veredito === "ACERTOU") this.comemorar();
  }

  private itemDaRede(
    rede: (typeof REDES)[number],
    palpite: PalpiteDaRodada | undefined,
    categoria: number,
  ): HTMLLIElement {
    const principal =
      this.tracos.length === 0 || palpite === undefined
        ? undefined
        : palpitesComChance(palpite[rede.chave], this.informacoes.nomesDasCategorias)[0];
    const certo = principal?.nome === this.informacoes.nomesDasCategorias[categoria];
    const texto = principal === undefined ? "—" : `${principal.nome} ${String(principal.chance)}%`;
    const item = criar("li", { classe: "rede", dados: { rede: rede.chave } }, [
      criar("span", { classe: "nome-da-rede", texto: rede.nome }),
      criar("span", { classe: "palpite-da-rede", texto }),
    ]);
    item.dataset["acerto"] = principal === undefined ? "vazio" : certo ? "certa" : "errada";
    return item;
  }

  private desenharMeuDesenho(): void {
    this.meuDesenho.dataset["tracos"] = String(this.tracos.length);
    const contexto = this.meuDesenho.getContext("2d");
    if (contexto === null) return; // sem 2D (DOM de teste): só a contagem de traços
    contexto.clearRect(0, 0, LADO_DO_DESENHO, LADO_DO_DESENHO);
    desenharTracos(contexto, this.tracos, this.estilos);
  }
}
