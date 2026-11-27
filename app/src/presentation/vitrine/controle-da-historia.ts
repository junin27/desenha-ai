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

/**
 * Paradas da história (spec "Avançar e voltar a história"): uma por capítulo, logo antes do portal que leva ao
 * seguinte (os tempos dos portais estão em `PORTAIS`, em animacao-da-vitrine.ts); a última é o fim do convite.
 */
export const PARADAS_DOS_CAPITULOS: readonly number[] = [
  4.45,
  11.25,
  18.55,
  25.55,
  32.55,
  39.55,
  46.55,
  53.55,
  60.55,
  67.55,
  DURACAO_DA_HISTORIA,
];
/** Segundos de história por segundo de relógio: entrada do capítulo, passagem para a frente e para trás. */
const VELOCIDADE_DA_ENTRADA = 1;
const VELOCIDADE_PARA_A_FRENTE = 2;
const VELOCIDADE_PARA_TRAS = 2.5;
/** Quadro mais longo considerado: uma engasgada do navegador não faz a passagem pular um pedaço. */
const MAIOR_QUADRO_EM_SEGUNDOS = 1 / 60;
/** Eventos da roda mais próximos que isso são o mesmo gesto (trackpads mandam dezenas por giro). */
export const MS_ENTRE_GESTOS_DA_RODA = 400;
const PIXELS_DO_GESTO_DE_TOQUE = 50;

export function capituloEm(segundos: number): IdDoCapitulo {
  let atual: IdDoCapitulo = "abertura";
  for (const { id } of CAPITULOS) if (segundos >= INICIO_DOS_CAPITULOS[id]) atual = id;
  return atual;
}

/**
 * Tempo da história a cada quadro. Cada gesto move o alvo para a parada do capítulo seguinte (ou anterior) e o
 * tempo anda até ela num ritmo fixo, sem saltos; sem gesto, a história fica parada (spec "História só anda com o
 * visitante"). No começo, a abertura toca as animações de entrada até a primeira parada.
 */
export class ControleDaHistoria {
  private alvo = PARADAS_DOS_CAPITULOS[0] ?? 0;
  private tempo = 0;
  private velocidade = VELOCIDADE_DA_ENTRADA;
  private ultimoPasso: number | undefined;
  private ultimaRodinha = Number.NEGATIVE_INFINITY;

  constructor(private readonly agoraMs: () => number) {}

  get segundos(): number {
    return this.tempo;
  }

  avancarCapitulo(): void {
    const proxima = PARADAS_DOS_CAPITULOS.find((parada) => parada > this.alvo + 1e-6);
    if (proxima === undefined) return;
    this.alvo = proxima;
    this.velocidade = VELOCIDADE_PARA_A_FRENTE;
  }

  voltarCapitulo(): void {
    const anterior = [...PARADAS_DOS_CAPITULOS].reverse().find((parada) => parada < this.alvo - 1e-6);
    this.alvo = anterior ?? 0;
    this.velocidade = VELOCIDADE_PARA_TRAS;
  }

  /** Um giro da roda: só o primeiro evento de cada gesto conta. */
  rodinha(deltaY: number): void {
    const agora = this.agoraMs();
    const novoGesto = agora - this.ultimaRodinha > MS_ENTRE_GESTOS_DA_RODA;
    this.ultimaRodinha = agora;
    if (!novoGesto || deltaY === 0) return;
    if (deltaY > 0) this.avancarCapitulo();
    else this.voltarCapitulo();
  }

  irPara(segundos: number): void {
    this.alvo = this.tempo = Math.min(DURACAO_DA_HISTORIA, Math.max(0, segundos));
  }

  /** Avança um quadro e devolve o tempo da história. */
  passo(): number {
    const agora = this.agoraMs();
    const dt =
      this.ultimoPasso === undefined
        ? 0
        : Math.min(MAIOR_QUADRO_EM_SEGUNDOS, (agora - this.ultimoPasso) / 1000);
    this.ultimoPasso = agora;
    const falta = this.alvo - this.tempo;
    const andar = Math.min(Math.abs(falta), dt * this.velocidade);
    this.tempo += Math.sign(falta) * andar;
    return this.tempo;
  }
}

/** Liga rodinha, teclas e toque ao controle. A página nunca rola: a rodinha é consumida. */
export function ligarEntrada(alvo: EventTarget, controle: ControleDaHistoria, ativa: () => boolean): void {
  alvo.addEventListener(
    "wheel",
    (evento) => {
      if (!ativa()) return;
      evento.preventDefault();
      controle.rodinha((evento as WheelEvent).deltaY);
    },
    { passive: false },
  );
  alvo.addEventListener("keydown", (evento) => {
    const tecla = evento as KeyboardEvent;
    if (!ativa() || (tecla.target as HTMLElement | null)?.tagName === "INPUT") return;
    const sentido = DIRECAO_DA_TECLA[tecla.key];
    if (sentido === undefined) return;
    tecla.preventDefault();
    if (sentido > 0) controle.avancarCapitulo();
    else controle.voltarCapitulo();
  });
  ligarToque(alvo, controle, ativa);
}

/** Arrastar o dedo: um gesto por toque, quando passa de 50 px. */
function ligarToque(alvo: EventTarget, controle: ControleDaHistoria, ativa: () => boolean): void {
  let inicioY: number | undefined;
  alvo.addEventListener("touchstart", (evento) => {
    inicioY = (evento as TouchEvent).touches[0]?.clientY;
  });
  alvo.addEventListener("touchmove", (evento) => {
    const y = (evento as TouchEvent).touches[0]?.clientY;
    if (!ativa() || y === undefined || inicioY === undefined) return;
    if (Math.abs(inicioY - y) < PIXELS_DO_GESTO_DE_TOQUE) return;
    if (inicioY > y) controle.avancarCapitulo();
    else controle.voltarCapitulo();
    inicioY = undefined;
  });
}

const DIRECAO_DA_TECLA: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  PageDown: 1,
  " ": 1,
  ArrowUp: -1,
  PageUp: -1,
};
