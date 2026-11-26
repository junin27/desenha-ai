import { CAPITULOS, type IdDoCapitulo } from "../../domain/vitrine/capitulos";

/**
 * Onde cada capítulo começa na linha do tempo da vitrine, em segundos (o roteiro aprovado no protótipo 16).
 * A transição para um capítulo começa ~1,5 s antes do início dele.
 */
export const INICIO_DOS_CAPITULOS: Readonly<Record<IdDoCapitulo, number>> = {
  abertura: 0,
  jogo: 6.2,
  desenho: 13,
  cnn: 20.3,
  lstm: 27.3,
  ze: 34.3,
  destilacao: 41.3,
  qlora: 48.3,
  quantizacao: 55.3,
  engenharia: 62.3,
  convite: 69.3,
};
export const DURACAO_DA_HISTORIA = 75;

/** Spec `vitrine-da-abertura`, "Avançar e voltar a história" e "História anda sozinha". */
export const SEGUNDOS_POR_TECLA = 3;
export const SEGUNDOS_POR_PIXEL_DA_RODINHA = 0.006;
export const MS_PARADO_PARA_ANDAR_SOZINHA = 4000;
export const MS_NO_FIM_PARA_RECOMECAR = 10_000;
/** Fração do caminho até o alvo, por quadro, enquanto o visitante mexe (dá o "deslizar" da rolagem). */
const SUAVIZACAO = 0.08;
const QUASE_NO_FIM = 0.05;

export function capituloEm(segundos: number): IdDoCapitulo {
  let atual: IdDoCapitulo = "abertura";
  for (const { id } of CAPITULOS) if (segundos >= INICIO_DOS_CAPITULOS[id]) atual = id;
  return atual;
}

/**
 * Tempo da história a cada quadro: o visitante move um alvo (rodinha, teclas, toque) e o tempo desliza até ele;
 * parado por 4 s, a história anda sozinha em tempo real; parada no fim por 10 s, recomeça.
 */
export class ControleDaHistoria {
  private alvo = 0;
  private tempo = 0;
  private ultimaInteracao = Number.NEGATIVE_INFINITY;
  private ultimoPasso: number | undefined;
  private fimDesde: number | undefined;
  private andarSozinha = true;

  constructor(
    private readonly agoraMs: () => number,
    private readonly duracao = DURACAO_DA_HISTORIA,
  ) {}

  get segundos(): number {
    return this.tempo;
  }

  /** Desliga o andar sozinho (movimento reduzido pede que a história só ande quando o visitante quiser). */
  definirAndarSozinha(ligado: boolean): void {
    this.andarSozinha = ligado;
  }

  mexer(segundos: number): void {
    this.alvo = Math.min(this.duracao, Math.max(0, this.alvo + segundos));
    this.ultimaInteracao = this.agoraMs();
  }

  irPara(segundos: number): void {
    this.alvo = this.tempo = Math.min(this.duracao, Math.max(0, segundos));
    this.ultimaInteracao = this.agoraMs();
    this.fimDesde = undefined;
  }

  /** Avança um quadro e devolve o tempo da história. */
  passo(): number {
    const agora = this.agoraMs();
    const dt = this.ultimoPasso === undefined ? 0 : (agora - this.ultimoPasso) / 1000;
    this.ultimoPasso = agora;
    const parado = agora - this.ultimaInteracao > MS_PARADO_PARA_ANDAR_SOZINHA;
    if (parado && this.andarSozinha) this.alvo = Math.min(this.duracao, this.alvo + dt);
    this.tempo = parado ? this.alvo : this.tempo + (this.alvo - this.tempo) * SUAVIZACAO;
    if (Math.abs(this.alvo - this.tempo) < 1e-3) this.tempo = this.alvo;
    this.recomecarSeFicouNoFim(agora, parado);
    return this.tempo;
  }

  private recomecarSeFicouNoFim(agora: number, parado: boolean): void {
    if (this.tempo < this.duracao - QUASE_NO_FIM || !parado) {
      this.fimDesde = undefined;
      return;
    }
    this.fimDesde ??= agora;
    if (agora - this.fimDesde >= MS_NO_FIM_PARA_RECOMECAR) {
      this.alvo = this.tempo = 0;
      this.fimDesde = undefined;
    }
  }
}

/** Liga rodinha, teclas e toque ao controle. A página nunca rola: a rodinha é consumida. */
export function ligarEntrada(alvo: EventTarget, controle: ControleDaHistoria, ativa: () => boolean): void {
  alvo.addEventListener(
    "wheel",
    (evento) => {
      if (!ativa()) return;
      evento.preventDefault();
      controle.mexer((evento as WheelEvent).deltaY * SEGUNDOS_POR_PIXEL_DA_RODINHA);
    },
    { passive: false },
  );
  alvo.addEventListener("keydown", (evento) => {
    const tecla = evento as KeyboardEvent;
    if (!ativa() || (tecla.target as HTMLElement | null)?.tagName === "INPUT") return;
    const sentido = DIRECAO_DA_TECLA[tecla.key];
    if (sentido === undefined) return;
    tecla.preventDefault();
    controle.mexer(sentido * SEGUNDOS_POR_TECLA);
  });
  let toqueY: number | undefined;
  alvo.addEventListener("touchstart", (evento) => {
    toqueY = (evento as TouchEvent).touches[0]?.clientY;
  });
  alvo.addEventListener("touchmove", (evento) => {
    const y = (evento as TouchEvent).touches[0]?.clientY;
    if (!ativa() || y === undefined || toqueY === undefined) return;
    controle.mexer((toqueY - y) * SEGUNDOS_POR_PIXEL_DA_RODINHA * 3);
    toqueY = y;
  });
}

const DIRECAO_DA_TECLA: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  PageDown: 1,
  " ": 1,
  ArrowUp: -1,
  PageUp: -1,
};
