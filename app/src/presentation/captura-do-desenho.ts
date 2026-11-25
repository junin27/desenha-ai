import { tracosForaDaBorracha } from "../domain/desenho/borracha";
import type { Ponto, Traco } from "../domain/desenho/desenho";

/**
 * Lápis desenha; borracha apaga traços inteiros (spec `ferramentas-de-desenho`); balde e conta-gotas não
 * mexem nos traços (spec `paleta-de-desenho`): quem cuida deles é o `QuadroDeDesenho`.
 */
export type Ferramenta = "lapis" | "borracha" | "balde" | "contagotas";

/** Cor e espessura com que um traço foi feito: só visual, as redes recebem só os pontos. */
export interface EstiloDoTraco {
  readonly cor: string;
  readonly espessura: number;
}

export type OuvinteDoDesenho = (tracos: readonly Traco[], tracoTerminado: boolean) => void;

/** O que acabou de acontecer no quadro, para o lápis, as partículas e o som reagirem. */
export interface AcaoNoQuadro {
  readonly tipo: "encostar" | "arrastar" | "soltar" | "tocar";
  readonly ferramenta: Ferramenta;
  readonly ponto: Ponto;
  /** Distância desde o ponto anterior (px do quadro): a "velocidade" do traço. */
  readonly distancia: number;
  readonly dx: number;
}

export const ESTILO_PADRAO: EstiloDoTraco = { cor: "#2b1a0a", espessura: 8 };

/**
 * Captura o desenho no canvas com Pointer Events: mouse, toque e caneta pelo mesmo caminho (spec
 * `interface-do-jogo`). Os mesmos passos (`comecarEm`, `continuarEm`, `terminar`) servem à mão pela câmera
 * (D5 do design de `desenho-com-a-mao`). Os pontos ficam nas coordenadas internas do canvas.
 *
 * @example
 * new CapturaDoDesenho(canvas, (tracos, terminado) => partida.registrarTraco(...));
 */
export class CapturaDoDesenho {
  private tracosCapturados: Ponto[][] = [];
  private estilosDosTracos: EstiloDoTraco[] = [];
  private estiloAtual: EstiloDoTraco = ESTILO_PADRAO;
  private desenhando = false;
  private apagando = false;
  private ferramentaAtual: Ferramenta = "lapis";
  private ligada = true;
  private ultimo: Ponto | undefined;
  private readonly contexto: CanvasRenderingContext2D | null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly aoMudar: OuvinteDoDesenho,
    private readonly aoAgir: (acao: AcaoNoQuadro) => void = () => undefined,
  ) {
    this.contexto = canvas.getContext("2d");
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (evento) => {
      if (!this.ligada) return;
      evento.preventDefault();
      canvas.setPointerCapture(evento.pointerId);
      this.comecarEm(this.pontoDo(evento));
    });
    canvas.addEventListener("pointermove", (evento) => {
      if (this.desenhando) evento.preventDefault();
      this.continuarEm(this.pontoDo(evento));
    });
    canvas.addEventListener("pointerup", (evento) => {
      // o último ponto entra no traço sem aviso próprio: o aviso é o do traço terminado
      if (this.desenhando) this.adicionar(this.pontoDo(evento));
      this.terminar();
    });
    for (const tipo of ["pointercancel", "pointerleave"] as const) {
      canvas.addEventListener(tipo, () => {
        this.terminar();
      });
    }
  }

  get tracos(): readonly Traco[] {
    return this.tracosCapturados;
  }

  get estilos(): readonly EstiloDoTraco[] {
    return this.estilosDosTracos;
  }

  get ferramenta(): Ferramenta {
    return this.ferramentaAtual;
  }

  usar(ferramenta: Ferramenta): void {
    this.terminar();
    this.ferramentaAtual = ferramenta;
  }

  /** Cor e espessura dos próximos traços (o traço em andamento não muda). */
  definirEstilo(estilo: EstiloDoTraco): void {
    this.estiloAtual = estilo;
  }

  ligar(): void {
    this.ligada = true;
  }

  desligar(): void {
    this.terminar();
    this.ligada = false;
  }

  limpar(): void {
    this.tracosCapturados = [];
    this.estilosDosTracos = [];
    this.desenhando = false;
    this.apagando = false;
    this.contexto?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Encosta no ponto: começa um traço (lápis), apaga (borracha) ou avisa o toque (balde, conta-gotas). */
  comecarEm(ponto: Ponto): void {
    if (!this.ligada) return;
    this.ultimo = ponto;
    if (this.ferramentaAtual === "lapis") {
      this.desenhando = true;
      this.tracosCapturados.push([ponto]);
      this.estilosDosTracos.push(this.estiloAtual);
      this.aoMudar(this.tracosCapturados, false);
    } else if (this.ferramentaAtual === "borracha") {
      this.apagando = true;
      this.apagarEm(ponto);
    }
    this.agir(
      this.ferramentaAtual === "balde" || this.ferramentaAtual === "contagotas" ? "tocar" : "encostar",
      ponto,
    );
  }

  continuarEm(ponto: Ponto): void {
    if (this.apagando) {
      this.agir("arrastar", ponto);
      this.apagarEm(ponto);
      return;
    }
    if (!this.desenhando) return;
    this.agir("arrastar", ponto);
    this.adicionar(ponto);
    this.aoMudar(this.tracosCapturados, false);
  }

  /** Levanta o lápis (ou a borracha): o traço em andamento termina e as redes reclassificam. */
  terminar(): void {
    const estava = this.desenhando || this.apagando;
    this.apagando = false;
    if (estava && this.ultimo !== undefined) this.agir("soltar", this.ultimo);
    if (!this.desenhando) return;
    this.desenhando = false;
    this.aoMudar(this.tracosCapturados, true);
  }

  /** Remove os traços tocados e, se algum saiu, redesenha e avisa o desenho que sobrou (D3 do design). */
  apagarEm(ponto: Ponto): void {
    const restantes = tracosForaDaBorracha(this.tracosCapturados, ponto);
    if (restantes.length === this.tracosCapturados.length) return;
    const ficam = new Set(restantes);
    this.estilosDosTracos = this.estilosDosTracos.filter((_, indice) =>
      ficam.has(this.tracosCapturados[indice] ?? []),
    );
    this.tracosCapturados = this.tracosCapturados.filter((traco) => ficam.has(traco));
    this.redesenhar();
    this.aoMudar(this.tracosCapturados, true);
  }

  private agir(tipo: AcaoNoQuadro["tipo"], ponto: Ponto): void {
    const anterior = this.ultimo ?? ponto;
    const dx = ponto[0] - anterior[0];
    const distancia = Math.hypot(dx, ponto[1] - anterior[1]);
    this.ultimo = ponto;
    this.aoAgir({ tipo, ferramenta: this.ferramentaAtual, ponto, distancia, dx });
  }

  private redesenhar(): void {
    this.contexto?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.contexto !== null) desenharTracos(this.contexto, this.tracosCapturados, this.estilosDosTracos);
  }

  private adicionar(ponto: Ponto): void {
    const traco = this.tracosCapturados.at(-1);
    const anterior = traco?.at(-1);
    if (traco === undefined || anterior === undefined) return;
    traco.push(ponto);
    if (this.contexto === null) return; // sem 2D (ex.: DOM de teste): captura sem pintar
    desenharTracos(this.contexto, [[anterior, ponto]], [this.estilosDosTracos.at(-1) ?? ESTILO_PADRAO]);
  }

  /** Converte a posição na tela para as coordenadas internas do canvas (o CSS pode redimensioná-lo). */
  private pontoDo(evento: PointerEvent): Ponto {
    const caixa = this.canvas.getBoundingClientRect();
    const escalaX = caixa.width > 0 ? this.canvas.width / caixa.width : 1;
    const escalaY = caixa.height > 0 ? this.canvas.height / caixa.height : 1;
    return [(evento.clientX - caixa.left) * escalaX, (evento.clientY - caixa.top) * escalaY];
  }
}

/** Pinta traços, cada um no seu estilo (usado também pelo veredito para mostrar o desenho julgado). */
export function desenharTracos(
  contexto: CanvasRenderingContext2D,
  tracos: readonly Traco[],
  estilos: readonly EstiloDoTraco[] = [],
): void {
  contexto.lineCap = "round";
  contexto.lineJoin = "round";
  tracos.forEach((traco, indice) => {
    const [primeiro, ...resto] = traco;
    if (primeiro === undefined) return;
    const estilo = estilos[indice] ?? ESTILO_PADRAO;
    contexto.lineWidth = estilo.espessura;
    contexto.strokeStyle = estilo.cor;
    contexto.beginPath();
    contexto.moveTo(...primeiro);
    for (const ponto of resto) contexto.lineTo(...ponto);
    if (resto.length === 0) contexto.lineTo(...primeiro);
    contexto.stroke();
  });
}
