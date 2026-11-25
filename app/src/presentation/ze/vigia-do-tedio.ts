/** Sem interação por este tempo, o Zé fica entediado (spec `personagem-do-ze`). */
export const TEMPO_DO_TEDIO_MS = 30_000;
const EVENTOS_DE_INTERACAO = ["pointerdown", "pointermove", "keydown"] as const;

export interface ReacoesAoTedio {
  entediar(): void;
  acordar(): void;
}

/**
 * Conta o tempo sem toque, mouse ou teclado; aos 30 s avisa para o Zé se entediar e, na primeira
 * interação, para acordar. Pausado (tela de desenho), não conta e acorda quem estiver entediado.
 *
 * @example
 * const vigia = new VigiaDoTedio(window, { entediar: () => ze.entediar(), acordar: () => ze.acordar() });
 */
export class VigiaDoTedio {
  private temporizador: ReturnType<typeof setTimeout> | undefined;
  private entediado = false;
  private pausado = false;
  private readonly aoInteragir = (): void => {
    this.acordarSeEntediado();
    this.armar();
  };

  constructor(
    private readonly alvo: EventTarget,
    private readonly reacoes: ReacoesAoTedio,
  ) {
    for (const evento of EVENTOS_DE_INTERACAO)
      alvo.addEventListener(evento, this.aoInteragir, { passive: true });
    this.armar();
  }

  /** `true` na tela de desenho: o Zé não se entedia ali. */
  pausar(pausado: boolean): void {
    this.pausado = pausado;
    if (pausado) this.acordarSeEntediado();
    this.armar();
  }

  desligar(): void {
    clearTimeout(this.temporizador);
    for (const evento of EVENTOS_DE_INTERACAO) this.alvo.removeEventListener(evento, this.aoInteragir);
  }

  private armar(): void {
    clearTimeout(this.temporizador);
    if (this.pausado) return;
    this.temporizador = setTimeout(() => {
      this.entediado = true;
      this.reacoes.entediar();
    }, TEMPO_DO_TEDIO_MS);
  }

  private acordarSeEntediado(): void {
    if (!this.entediado) return;
    this.entediado = false;
    this.reacoes.acordar();
  }
}
