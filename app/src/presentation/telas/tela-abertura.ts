import { SEGUNDOS_DA_RODADA } from "../../domain/rodada/pontuacao";
import { botao, criar } from "../dom";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import type { InformacoesDoJogo } from "./tela";

/**
 * Demonstração ilustrativa (não passa pelas redes): uma casa traçada em 4 passos e os palpites que
 * mudam a cada traço até "casa" liderar (spec `tela-de-abertura`).
 */
const TRACOS_DA_DEMONSTRACAO = [
  "M45 140 L150 55 L255 140",
  "M65 128 L65 260 L235 260 L235 128",
  "M130 260 L130 195 L170 195 L170 260",
  "M88 160 L114 160 L114 186 L88 186 Z",
];
const PALPITES_DA_DEMONSTRACAO: readonly (readonly (readonly [string, number])[])[] = [
  [
    ["chapéu", 38],
    ["montanha", 27],
    ["casa", 14],
  ],
  [
    ["celeiro", 41],
    ["casa", 36],
    ["chapéu", 8],
  ],
  [
    ["casa", 71],
    ["celeiro", 19],
    ["igreja", 4],
  ],
  [
    ["casa", 94],
    ["celeiro", 4],
    ["igreja", 1],
  ],
];
const MS_POR_TRACO = 1300;
const MS_DE_PAUSA_NO_FIM = 2500;
const MS_ATE_O_ZE_CHAMAR = 2600;
const MS_DA_CONTAGEM = 1400;
const PASSOS_DA_CONTAGEM = 20;
const FALA_DO_CONVITE = "Bora desenhar, sô? Aposto que as redes adivinham!";

/** Abertura: título, chamada, números reais, demonstração em loop, os 3 passos e "Jogar agora". */
export class TelaAbertura {
  readonly raiz: HTMLElement;
  /** Quantas vezes as barras da demonstração mudaram (para os testes conferirem o loop). */
  trocasDePalpite = 0;
  private readonly desenho: HTMLElement;
  private readonly palpites = criar("ol", { classe: "palpites", dados: { demo: "palpites" } });
  private readonly numeros: HTMLElement;
  private readonly ze: PersonagemDoZe;
  private temporizadores: ReturnType<typeof setTimeout>[] = [];
  private visivel = false;

  constructor(
    private readonly informacoes: InformacoesDoJogo,
    aoJogar: () => void,
    opcoesDoZe: OpcoesDoPersonagem = {},
  ) {
    this.ze = new PersonagemDoZe(opcoesDoZe);
    this.ze.raiz.classList.add("ze-da-abertura");
    this.desenho = criarQuadroDaDemonstracao();
    this.numeros = this.criarNumeros();
    const jogar = botao("Jogar agora", "jogar-agora", aoJogar);
    jogar.classList.add("principal");
    const texto = criar("div", { classe: "chamada-da-abertura" }, [
      criarTitulo(),
      criar("p", {
        classe: "chamada",
        texto:
          "Você desenha e duas redes neurais adivinham enquanto o traço sai. O Zé, uma IA que roda aqui, sem internet, dá o veredito.",
      }),
      this.numeros,
      jogar,
    ]);
    const demonstracao = criar("div", { classe: "cartao demonstracao" }, [
      criar("div", { classe: "demo-grade" }, [this.desenho, this.palpites]),
      criarPassos(),
    ]);
    this.raiz = criar("section", { classe: "tela tela-abertura", dados: { tela: "abertura" } }, [
      texto,
      demonstracao,
      this.ze.raiz,
    ]);
  }

  /** Começa a demonstração, a contagem dos números e o convite do Zé. */
  mostrar(): void {
    if (this.visivel) return;
    this.visivel = true;
    this.contarNumeros();
    this.rodarDemonstracao(0);
    this.agendar(() => void this.ze.falar(FALA_DO_CONVITE), MS_ATE_O_ZE_CHAMAR);
  }

  /** Fora da abertura nada continua desenhando. */
  esconder(): void {
    this.visivel = false;
    for (const temporizador of this.temporizadores) clearTimeout(temporizador);
    this.temporizadores = [];
  }

  /** O Zé da abertura, para o vigia do tédio. */
  get personagem(): PersonagemDoZe {
    return this.ze;
  }

  private rodarDemonstracao(passo: number): void {
    if (!this.visivel) return;
    if (passo === 0) {
      this.desenho.querySelector("svg")?.replaceChildren();
      this.palpites.replaceChildren();
    }
    const traco = TRACOS_DA_DEMONSTRACAO[passo];
    const palpites = PALPITES_DA_DEMONSTRACAO[passo];
    if (traco === undefined || palpites === undefined) {
      this.agendar(() => {
        this.rodarDemonstracao(0);
      }, MS_DE_PAUSA_NO_FIM);
      return;
    }
    adicionarTraco(this.desenho, traco);
    this.agendar(() => {
      this.mostrarPalpites(palpites);
      this.rodarDemonstracao(passo + 1);
    }, MS_POR_TRACO);
  }

  private mostrarPalpites(palpites: readonly (readonly [string, number])[]): void {
    this.trocasDePalpite += 1;
    this.palpites.replaceChildren(
      ...palpites.map(([nome, chance], indice) => {
        const barra = criar("span", { classe: "barra" });
        barra.style.width = `${String(chance)}%`;
        return criar("li", { classe: indice === 0 ? "palpite lider" : "palpite" }, [
          barra,
          criar("span", { classe: "nome", texto: nome }),
          document.createTextNode(" "),
          criar("span", { classe: "chance", texto: `${String(chance)}%` }),
        ]);
      }),
    );
  }

  private criarNumeros(): HTMLElement {
    const itens: HTMLElement[] = [];
    const acuracia = this.informacoes.acuraciaDoEnsemble;
    if (acuracia !== undefined) itens.push(numero("acuracia", acuracia * 100, 1, "% de acerto"));
    itens.push(numero("categorias", this.informacoes.nomesDasCategorias.length, 0, "desenhos"));
    itens.push(numero("segundos", SEGUNDOS_DA_RODADA, 0, "segundos"));
    return criar("div", { classe: "numeros" }, itens);
  }

  /** Os números sobem de 0 até o valor real em ~1,4 s. */
  private contarNumeros(): void {
    for (const elemento of this.numeros.querySelectorAll<HTMLElement>("[data-numero]")) {
      const alvo = Number(elemento.dataset["alvo"]);
      const casas = Number(elemento.dataset["casas"]);
      for (let passo = 1; passo <= PASSOS_DA_CONTAGEM; passo++) {
        const fracao = 1 - (1 - passo / PASSOS_DA_CONTAGEM) ** 3;
        this.agendar(
          () => {
            elemento.textContent = formatarNumero(alvo * fracao, casas);
          },
          (MS_DA_CONTAGEM * passo) / PASSOS_DA_CONTAGEM,
        );
      }
    }
  }

  private agendar(acao: () => void, ms: number): void {
    this.temporizadores.push(setTimeout(acao, ms));
  }
}

function numero(chave: string, alvo: number, casas: number, legenda: string): HTMLElement {
  const valor = criar("strong", { texto: formatarNumero(alvo, casas), dados: { numero: chave } });
  valor.dataset["alvo"] = String(alvo);
  valor.dataset["casas"] = String(casas);
  return criar("div", { classe: "numero" }, [valor, document.createTextNode(legenda)]);
}

/** "94,7" com vírgula decimal. */
function formatarNumero(valor: number, casas: number): string {
  return valor.toFixed(casas).replace(".", ",");
}

/** Título em SVG para o traço "se desenhar" (contorno que depois preenche, só CSS). */
function criarTitulo(): HTMLElement {
  const modelo = document.createElement("template");
  modelo.innerHTML =
    '<svg class="titulo" viewBox="0 0 720 340" role="img" aria-label="Desenha Aí, Sô!">' +
    '<text x="4" y="130">Desenha</text><text x="4" y="270">Aí, <tspan class="so">Sô!</tspan></text>' +
    '<path class="risco" pathLength="1" d="M14 310 C 170 292, 400 326, 580 300 S 700 308, 710 302"/></svg>';
  return criar("h1", { classe: "titulo-do-jogo" }, [...modelo.content.childNodes]);
}

function criarQuadroDaDemonstracao(): HTMLElement {
  const modelo = document.createElement("template");
  modelo.innerHTML = '<svg viewBox="0 0 300 300" aria-hidden="true"></svg>';
  return criar("div", { classe: "quadrinho", dados: { demo: "desenho" } }, [...modelo.content.childNodes]);
}

/** Traço que se desenha só com CSS: `pathLength=1` dispensa medir o caminho. */
function adicionarTraco(quadro: HTMLElement, caminho: string): void {
  const svg = quadro.querySelector("svg");
  if (svg === null) return;
  const modelo = document.createElement("template");
  modelo.innerHTML = `<svg><path class="traco-que-se-desenha" pathLength="1" d="${caminho}"/></svg>`;
  const traco = modelo.content.querySelector("path");
  if (traco !== null) svg.append(traco);
}

function criarPassos(): HTMLElement {
  const passos = ["O Zé dá a charada", "Você desenha em 20 s", "As redes adivinham"];
  return criar(
    "ol",
    { classe: "passos" },
    passos.map((texto) => criar("li", { classe: "passo", texto })),
  );
}
