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
/** Rodinha (spec "Rodinha acompanha a transição"): segundos de história por pixel girado (0,5 s a cada 100 px). */
const SEGUNDOS_POR_PIXEL_DA_RODA = 0.005;
/** Ritmo com que o tempo alcança a rodinha: rápido para parecer preso à mão, sem saltar quadros. */
const VELOCIDADE_DA_RODINHA = 6;
/** Depois disso, a partir do início do capítulo, as entradas já terminaram e nada anda até a parada. */
const FIM_DAS_ENTRADAS = 3;

/** Trechos sem animação de cada capítulo (do fim das entradas até a parada): a rodinha passa direto por eles. */
const TRECHOS_PARADOS: readonly (readonly [number, number])[] = CAPITULOS.slice(1).map(({ id }, i) => [
  INICIO_DOS_CAPITULOS[id] + FIM_DAS_ENTRADAS,
  PARADAS_DOS_CAPITULOS[i + 1] ?? DURACAO_DA_HISTORIA,
]);

/** Se o tempo cair num trecho parado, pula para a borda dele no sentido do giro. */
export function atravessarTrechoParado(segundos: number, paraFrente: boolean): number {
  const trecho = TRECHOS_PARADOS.find(([inicio, fim]) => segundos > inicio && segundos < fim);
  if (trecho === undefined) return segundos;
  return paraFrente ? trecho[1] : trecho[0];
}
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
    // na abertura não há capítulo anterior: voltar ao segundo 0 desfazia o título e deixava a tela vazia
    if (anterior === undefined) return;
    this.alvo = anterior;
    this.velocidade = VELOCIDADE_PARA_TRAS;
  }

  /** A rodinha move a história na medida do giro; parar de girar para a história onde ela está. */
  rodinha(deltaY: number): void {
    if (deltaY === 0) return;
    // girar para cima (deltaY < 0) avança, para baixo volta (pedido do usuário, 27/11/2026)
    const paraFrente = deltaY < 0;
    const primeiraParada = PARADAS_DOS_CAPITULOS[0] ?? 0;
    const desejado = this.alvo - deltaY * SEGUNDOS_POR_PIXEL_DA_RODA;
    const limitado = Math.min(DURACAO_DA_HISTORIA, Math.max(primeiraParada, desejado));
    this.alvo = atravessarTrechoParado(limitado, paraFrente);
    this.velocidade = VELOCIDADE_DA_RODINHA;
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
