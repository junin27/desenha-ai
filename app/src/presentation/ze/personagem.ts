import { criar } from "../dom";
import type { Humor } from "./controle-de-humor";
import { DESENHO_DO_ZE } from "./desenho-do-ze";
import "./ze.css";

/** Intervalo entre letras quando o Zé "digita" a fala. */
const MS_POR_LETRA = 22;
const TEXTO_PENSANDO = "Pensando…";

/** Classe CSS de cada humor (ASCII para o seletor; o nome do humor segue a spec). */
const CLASSE_DO_HUMOR: Readonly<Record<Humor, string>> = {
  neutro: "humor-neutro",
  falando: "humor-falando",
  pensando: "humor-pensando",
  torcendo: "humor-torcendo",
  assustado: "humor-assustado",
  comemorando: "humor-comemorando",
  "coçando-a-cabeça": "humor-cocando",
  bravo: "humor-bravo",
  entediado: "humor-entediado",
};

export interface OpcoesDoPersonagem {
  /** Espera entre letras da fala; os testes passam uma espera instantânea. */
  readonly esperar?: (ms: number) => Promise<void>;
}

let instancias = 0;

/**
 * O Zé desenhado com balão de fala (spec `personagem-do-ze`). O humor da partida é o "humor de base";
 * a fala e o tédio se sobrepõem a ele e, ao acabarem, o Zé volta ao humor de base.
 *
 * @example
 * const ze = new PersonagemDoZe();
 * ze.mudarHumor("torcendo");
 * await ze.falar("Bora, sô!");
 */
export class PersonagemDoZe {
  readonly raiz: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly balao = criar("p", { classe: "balao", dados: { texto: "fala-do-ze" } });
  private readonly esperar: (ms: number) => Promise<void>;
  private humorDeBase: Humor = "neutro";
  private falasEmAndamento = 0;
  private entediado = false;

  constructor(opcoes: OpcoesDoPersonagem = {}) {
    this.esperar = opcoes.esperar ?? ((ms) => new Promise((resolver) => setTimeout(resolver, ms)));
    this.svg = criarSvg();
    this.raiz = criar("div", { classe: "ze", dados: { parte: "ze" } }, [this.svg, this.balao]);
    this.aplicar();
  }

  get humor(): Humor {
    if (this.entediado) return "entediado";
    return this.falasEmAndamento > 0 ? "falando" : this.humorDeBase;
  }

  mudarHumor(humor: Humor): void {
    this.humorDeBase = humor;
    this.aplicar();
  }

  /** "Pensando…" no balão, sem nada do que o SLM está gerando (spec `interface-do-jogo`). */
  pensar(): void {
    this.balao.textContent = TEXTO_PENSANDO;
    this.mudarHumor("pensando");
  }

  /** Digita a fala letra a letra com a boca mexendo; ao terminar volta ao humor de base. */
  async falar(texto: string): Promise<void> {
    this.falasEmAndamento += 1;
    this.aplicar();
    this.balao.textContent = "";
    try {
      for (const letra of texto) {
        this.balao.textContent += letra;
        await this.esperar(MS_POR_LETRA);
      }
    } finally {
      this.falasEmAndamento -= 1;
      this.aplicar();
    }
  }

  /** Mostra o texto de uma vez, sem animação de fala. */
  mostrarTexto(texto: string): void {
    this.balao.textContent = texto;
  }

  entediar(): void {
    this.entediado = true;
    this.aplicar();
  }

  acordar(): void {
    this.entediado = false;
    this.aplicar();
  }

  private aplicar(): void {
    for (const classe of Object.values(CLASSE_DO_HUMOR)) this.svg.classList.remove(classe);
    this.svg.classList.add(CLASSE_DO_HUMOR[this.humor]);
    this.svg.dataset["humor"] = this.humor;
  }
}

/** Monta o SVG pelo leitor de HTML (que já põe o namespace do SVG), sem endereço no código do jogo. */
function criarSvg(): SVGSVGElement {
  instancias += 1;
  const modelo = document.createElement("template");
  const desenho = DESENHO_DO_ZE.replaceAll("ID_DO_XADREZ", `xadrez-do-ze-${String(instancias)}`);
  modelo.innerHTML = `<svg class="ze-svg" viewBox="0 0 200 230" aria-hidden="true">${desenho}</svg>`;
  const svg = modelo.content.firstElementChild;
  if (!(svg instanceof SVGSVGElement)) throw new Error("desenho do Zé sem <svg> na raiz; esperado um SVG");
  return svg;
}
