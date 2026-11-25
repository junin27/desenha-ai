import { tracosForaDaBorracha } from "../domain/desenho/borracha";
import type { Ponto, Traco } from "../domain/desenho/desenho";

/** Lápis desenha; borracha apaga traços inteiros (spec `ferramentas-de-desenho`). */
export type Ferramenta = "lapis" | "borracha";

export type OuvinteDoDesenho = (tracos: readonly Traco[], tracoTerminado: boolean) => void;

const ESPESSURA_DA_LINHA = 8;
const COR_DA_LINHA = "#2b1a0a";

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
  private apagando = false;
  private ferramentaAtual: Ferramenta = "lapis";
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

  get ferramenta(): Ferramenta {
    return this.ferramentaAtual;
  }

  usar(ferramenta: Ferramenta): void {
    this.ferramentaAtual = ferramenta;
    this.desenhando = false;
    this.apagando = false;
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
    if (this.ferramentaAtual === "borracha") {
      this.apagando = true;
      this.apagarEm(this.pontoDo(evento));
      return;
    }
    this.desenhando = true;
    this.tracosCapturados.push([this.pontoDo(evento)]);
    this.aoMudar(this.tracosCapturados, false);
  }

  private continuarTraco(evento: PointerEvent): void {
    if (this.apagando) {
      this.apagarEm(this.pontoDo(evento));
      return;
    }
    if (!this.desenhando) return;
    evento.preventDefault();
    this.adicionar(this.pontoDo(evento));
    this.aoMudar(this.tracosCapturados, false);
  }

  private terminarTraco(evento: PointerEvent): void {
    this.apagando = false;
    if (!this.desenhando) return;
    this.adicionar(this.pontoDo(evento));
    this.encerrar();
  }

  private encerrar(): void {
    this.apagando = false;
    if (!this.desenhando) return;
    this.desenhando = false;
    this.aoMudar(this.tracosCapturados, true);
  }

  /** Remove os traços tocados e, se algum saiu, redesenha e avisa o desenho que sobrou (D3 do design). */
  private apagarEm(ponto: Ponto): void {
    const restantes = tracosForaDaBorracha(this.tracosCapturados, ponto);
    if (restantes.length === this.tracosCapturados.length) return;
    this.tracosCapturados = restantes.map((traco) => [...traco]);
    this.redesenhar();
    this.aoMudar(this.tracosCapturados, true);
  }

  private redesenhar(): void {
    this.contexto?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.contexto !== null) desenharTracos(this.contexto, this.tracosCapturados);
  }

  private adicionar(ponto: Ponto): void {
    const traco = this.tracosCapturados.at(-1);
    const anterior = traco?.at(-1);
    if (traco === undefined || anterior === undefined) return;
    traco.push(ponto);
    this.desenharSegmento(anterior, ponto);
  }

  private desenharSegmento(inicio: Ponto, fim: Ponto): void {
    if (this.contexto === null) return; // sem 2D (ex.: DOM de teste): captura sem pintar
    desenharTracos(this.contexto, [[inicio, fim]]);
  }

  /** Converte a posição na tela para as coordenadas internas do canvas (o CSS pode redimensioná-lo). */
  private pontoDo(evento: PointerEvent): Ponto {
    const caixa = this.canvas.getBoundingClientRect();
    const escalaX = caixa.width > 0 ? this.canvas.width / caixa.width : 1;
    const escalaY = caixa.height > 0 ? this.canvas.height / caixa.height : 1;
    return [(evento.clientX - caixa.left) * escalaX, (evento.clientY - caixa.top) * escalaY];
  }
}

/** Pinta traços com o traço do jogo (usado também pelo veredito para mostrar o desenho julgado). */
export function desenharTracos(contexto: CanvasRenderingContext2D, tracos: readonly Traco[]): void {
  contexto.lineWidth = ESPESSURA_DA_LINHA;
  contexto.lineCap = "round";
  contexto.lineJoin = "round";
  contexto.strokeStyle = COR_DA_LINHA;
  for (const traco of tracos) {
    const [primeiro, ...resto] = traco;
    if (primeiro === undefined) continue;
    contexto.beginPath();
    contexto.moveTo(...primeiro);
    for (const ponto of resto) contexto.lineTo(...ponto);
    if (resto.length === 0) contexto.lineTo(...primeiro);
    contexto.stroke();
  }
}
