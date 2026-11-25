/** Nunca mais que isto de rabiscos ao mesmo tempo: o notebook do estande não tem GPU (risco do design). */
export const MAXIMO_DE_RABISCOS = 6;
const MS_ENTRE_RABISCOS = 900;
const MS_DE_VIDA = 3900;
const MS_PARA_SUMIR = 800;
const CORES = ["#b5401f", "#c98a00", "#2f7d32", "#d9b98a"] as const;
/** Formas soltas (onda, triângulo, círculo, casinha, estrela...) que lembram rabiscos de desenho. */
const FORMAS = [
  "M0 40 C 20 0, 60 0, 80 40 S 140 80, 160 40",
  "M10 60 L40 10 L70 60 Z",
  "M40 0 A40 40 0 1 0 40.1 0",
  "M0 30 C 30 -10, 50 70, 80 30 C 100 0, 120 60, 150 30",
  "M10 70 L10 20 L50 0 L90 20 L90 70 Z",
  "M20 0 L30 30 L60 32 L36 50 L46 80 L20 62 L-6 80 L4 50 L-20 32 L10 30 Z",
] as const;

/**
 * Rabiscos que se desenham e somem atrás das telas (spec `identidade-visual`), sem receber cliques. Com
 * movimento reduzido não começa.
 *
 * @example
 * const fundo = new FundoDeRabiscos();
 * document.body.prepend(fundo.raiz);
 * fundo.comecar();
 */
export class FundoDeRabiscos {
  readonly raiz: HTMLElement;
  private readonly svg: SVGSVGElement | null;
  private intervalo: ReturnType<typeof setInterval> | undefined;

  constructor() {
    const modelo = document.createElement("template");
    modelo.innerHTML = '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"></svg>';
    this.svg = modelo.content.querySelector("svg");
    this.raiz = document.createElement("div");
    this.raiz.className = "fundo-de-rabiscos";
    this.raiz.setAttribute("aria-hidden", "true");
    this.raiz.append(...modelo.content.childNodes);
  }

  comecar(): void {
    if (this.intervalo !== undefined || movimentoReduzido()) return;
    this.intervalo = setInterval(() => {
      this.brotar();
    }, MS_ENTRE_RABISCOS);
  }

  parar(): void {
    clearInterval(this.intervalo);
    this.intervalo = undefined;
    this.svg?.replaceChildren();
  }

  private brotar(): void {
    if (this.svg === null || this.svg.childElementCount >= MAXIMO_DE_RABISCOS) return;
    const modelo = document.createElement("template");
    const forma = FORMAS[Math.floor(Math.random() * FORMAS.length)] ?? FORMAS[0];
    const cor = CORES[Math.floor(Math.random() * CORES.length)] ?? CORES[0];
    const x = Math.round(Math.random() * 1500);
    const y = Math.round(Math.random() * 820);
    const giro = Math.round(Math.random() * 40 - 20);
    modelo.innerHTML =
      `<svg><path pathLength="1" stroke="${cor}" d="${forma}" ` +
      `transform="translate(${String(x)} ${String(y)}) rotate(${String(giro)})"/></svg>`;
    const rabisco = modelo.content.querySelector("path");
    if (rabisco === null) return;
    this.svg.append(rabisco);
    setTimeout(() => {
      rabisco.classList.add("sumindo");
    }, MS_DE_VIDA - MS_PARA_SUMIR);
    setTimeout(() => {
      rabisco.remove();
    }, MS_DE_VIDA);
  }
}

function movimentoReduzido(): boolean {
  return (
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
