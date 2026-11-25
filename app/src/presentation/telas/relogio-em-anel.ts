import { SEGUNDOS_DA_RODADA } from "../../domain/rodada/pontuacao";
import { criar } from "../dom";
import { segundosNaTela } from "../textos";
import { SEGUNDOS_DE_SUSTO } from "../ze/controle-de-humor";

/** Comprimento do anel (2πr com r = 50), para o traço do tempo encolher. */
const COMPRIMENTO_DO_ANEL = 314;

/** Cronômetro do desenho: número no centro e um anel que se esvazia; treme nos últimos 5 s. */
export class RelogioEmAnel {
  readonly raiz: HTMLElement;
  private readonly numero = criar("b", { classe: "cronometro", dados: { texto: "cronometro" } });
  private readonly anel: SVGCircleElement | null;

  constructor() {
    const modelo = document.createElement("template");
    modelo.innerHTML =
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fundo-do-anel" cx="60" cy="60" r="50"/>' +
      `<circle class="anel" cx="60" cy="60" r="50" stroke-dasharray="${String(COMPRIMENTO_DO_ANEL)}"/></svg>`;
    this.anel = modelo.content.querySelector<SVGCircleElement>("circle.anel");
    this.raiz = criar("div", { classe: "relogio" }, [...modelo.content.childNodes, this.numero]);
  }

  mostrar(segundosRestantes: number): void {
    this.numero.textContent = segundosNaTela(segundosRestantes);
    const usado = 1 - Math.max(0, segundosRestantes) / SEGUNDOS_DA_RODADA;
    this.anel?.setAttribute("stroke-dashoffset", String(COMPRIMENTO_DO_ANEL * usado));
    this.raiz.classList.toggle("urgente", segundosRestantes > 0 && segundosRestantes <= SEGUNDOS_DE_SUSTO);
  }
}
