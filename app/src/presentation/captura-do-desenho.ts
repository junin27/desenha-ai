import type { Ponto, Traco } from "../domain/desenho/desenho";

export type OuvinteDoDesenho = (tracos: readonly Traco[], tracoTerminado: boolean) => void;

const ESPESSURA_DA_LINHA = 8;
const COR_DA_LINHA = "#1f1300";

/**
 * Captura o desenho no canvas com Pointer Events: mouse, toque e caneta pelo mesmo caminho (spec
 * `interface-do-jogo`). Os pontos ficam nas coordenadas internas do canvas; a normalização do domínio
 * cuida da escala. `touch-action: none` impede que o dedo role a página.
 *
 * @example
 * new CapturaDoDesenho(canvas, (tracos, terminado) => partida.registrarTraco(...));
 */
export class CapturaDoDesenho {
  private tracosCapturados: Ponto[][] = [];
  private desenhando = false;
  private ligada = true;
  private readonly contexto: CanvasRenderingContext2D | null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly aoMudar: OuvinteDoDesenho,
  ) {
    this.contexto = canvas.getContext("2d");
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (evento) => {
      this.comecarTraco(evento);
    });
    canvas.addEventListener("pointermove", (evento) => {
      this.continuarTraco(evento);
    });
    canvas.addEventListener("pointerup", (evento) => {
      this.terminarTraco(evento);
    });
    for (const tipo of ["pointercancel", "pointerleave"] as const) {
      canvas.addEventListener(tipo, () => {
        this.encerrar();
      });
    }
  }

  get tracos(): readonly Traco[] {
    return this.tracosCapturados;
  }

  ligar(): void {
    this.ligada = true;
  }

  desligar(): void {
    this.ligada = false;
    this.desenhando = false;
  }

  limpar(): void {
    this.tracosCapturados = [];
    this.desenhando = false;
    this.contexto?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private comecarTraco(evento: PointerEvent): void {
    if (!this.ligada) return;
    evento.preventDefault();
    this.canvas.setPointerCapture(evento.pointerId);
    this.desenhando = true;
    this.tracosCapturados.push([this.pontoDo(evento)]);
    this.aoMudar(this.tracosCapturados, false);
  }

  private continuarTraco(evento: PointerEvent): void {
    if (!this.desenhando) return;
    evento.preventDefault();
    this.adicionar(this.pontoDo(evento));
    this.aoMudar(this.tracosCapturados, false);
  }

  private terminarTraco(evento: PointerEvent): void {
    if (!this.desenhando) return;
    this.adicionar(this.pontoDo(evento));
    this.encerrar();
  }

  private encerrar(): void {
    if (!this.desenhando) return;
    this.desenhando = false;
    this.aoMudar(this.tracosCapturados, true);
  }

  private adicionar(ponto: Ponto): void {
    const traco = this.tracosCapturados.at(-1);
    const anterior = traco?.at(-1);
    if (traco === undefined || anterior === undefined) return;
    traco.push(ponto);
    this.desenharSegmento(anterior, ponto);
  }

  private desenharSegmento([x0, y0]: Ponto, [x1, y1]: Ponto): void {
    const contexto = this.contexto;
    if (contexto === null) return; // sem 2D (ex.: DOM de teste): captura sem pintar
    contexto.lineWidth = ESPESSURA_DA_LINHA;
    contexto.lineCap = "round";
    contexto.strokeStyle = COR_DA_LINHA;
    contexto.beginPath();
    contexto.moveTo(x0, y0);
    contexto.lineTo(x1, y1);
    contexto.stroke();
  }

  /** Converte a posição na tela para as coordenadas internas do canvas (o CSS pode redimensioná-lo). */
  private pontoDo(evento: PointerEvent): Ponto {
    const caixa = this.canvas.getBoundingClientRect();
    const escalaX = caixa.width > 0 ? this.canvas.width / caixa.width : 1;
    const escalaY = caixa.height > 0 ? this.canvas.height / caixa.height : 1;
    return [(evento.clientX - caixa.left) * escalaX, (evento.clientY - caixa.top) * escalaY];
  }
}
