/** O confete termina sozinho antes deste tempo e limpa a tela (spec `veredito-ilustrado`). */
export const DURACAO_DO_CONFETE_MS = 3500;
const QUANTIDADE_DE_PAPEIS = 170;
const GRAVIDADE = 0.5;
const CORES = ["#b5401f", "#c98a00", "#2f7d32", "#e9a184", "#2b1a0a"] as const;

interface Papel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angulo: number;
  giro: number;
  fase: number;
  cor: string;
}

/**
 * Confete do ACERTOU num canvas por cima de tudo (sem receber cliques). Com movimento reduzido não
 * dispara. Ao acabar o tempo, limpa o canvas: não sobra papel parado na tela.
 *
 * @example
 * new Confete(canvas).disparar();
 */
export class Confete {
  private papeis: Papel[] = [];
  private inicio = 0;
  private quadro: number | undefined;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly pincel: () => CanvasRenderingContext2D | null = () => canvas.getContext("2d"),
  ) {}

  get ativo(): boolean {
    return this.quadro !== undefined;
  }

  disparar(): void {
    if (movimentoReduzido() || this.pincel() === null) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.papeis = Array.from({ length: QUANTIDADE_DE_PAPEIS }, () =>
      novoPapel(this.canvas.width, this.canvas.height),
    );
    this.inicio = performance.now();
    if (this.quadro === undefined) this.quadro = requestAnimationFrame(this.passo);
  }

  private readonly passo = (agora: number): void => {
    const pincel = this.pincel();
    if (pincel === null) return;
    pincel.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (agora - this.inicio >= DURACAO_DO_CONFETE_MS) {
      this.quadro = undefined;
      return;
    }
    for (const papel of this.papeis) pintar(pincel, mover(papel));
    this.quadro = requestAnimationFrame(this.passo);
  };
}

function novoPapel(largura: number, altura: number): Papel {
  const cor = CORES[Math.floor(Math.random() * CORES.length)] ?? CORES[0];
  return {
    x: largura * 0.3,
    y: altura * 0.45,
    vx: (Math.random() - 0.3) * 22,
    vy: -Math.random() * 18 - 5,
    angulo: Math.random() * 6,
    giro: Math.random() * 0.3,
    fase: Math.random() * 6,
    cor,
  };
}

function mover(papel: Papel): Papel {
  papel.vy += GRAVIDADE;
  papel.vx *= 0.99;
  papel.x += papel.vx;
  papel.y += papel.vy;
  papel.angulo += papel.giro;
  papel.fase += 0.25;
  return papel;
}

/** Retângulo que "gira em 3D": a escala no X imita a rotação. */
function pintar(pincel: CanvasRenderingContext2D, papel: Papel): void {
  pincel.save();
  pincel.translate(papel.x, papel.y);
  pincel.rotate(papel.angulo);
  pincel.scale(Math.cos(papel.fase), 1);
  pincel.fillStyle = papel.cor;
  pincel.fillRect(-7, -4, 14, 8);
  pincel.restore();
}

function movimentoReduzido(): boolean {
  return (
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
