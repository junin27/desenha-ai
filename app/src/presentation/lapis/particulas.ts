import type { Ponto } from "../../domain/desenho/desenho";
import type { PonteiroQueGasta } from "./desgaste";

/** Nunca mais que isto de partículas vivas; acima, as mais antigas desbotam depressa (spec `lapis-no-quadro`). */
export const LIMITE_DE_PARTICULAS = 600;
const GRAVIDADE = 0.32;
const ATRITO = 0.985;
const ATRITO_DA_FAISCA = 0.9;
/** Velocidade vertical abaixo da qual a partícula trava no chão (sem isso ela "tremia" e piscava). */
const QUIQUE_MINIMO = 1.2;
const QUIQUES_ATE_PARAR = 2;
const DESBOTE_RAPIDO = 0.05;
/** A opacidade cai suave nos últimos 40% da vida. */
const FIM_DA_VIDA = 0.4;
/** Distância percorrida (px) em que o traço conta como "rápido" (força 1). */
const DISTANCIA_RAPIDA = 14;

export type TipoDeParticula = "po" | "lasca" | "faisca" | "minhoca";

export interface Particula {
  readonly tipo: TipoDeParticula;
  readonly cor: string;
  readonly tamanho: number;
  /** Abertura da curva (lascas e minhoquinhas). */
  readonly curva: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  giro: number;
  vgiro: number;
  vida: number;
  duracao: number;
  quiques: number;
  parada: boolean;
  readonly opacidade: number;
}

export interface ConfiguracaoDasParticulas {
  /** Altura (px) do fundo do quadro, onde as partículas quicam e assentam. */
  readonly chao: number;
  readonly largura: number;
  /** Fonte de aleatoriedade (os testes passam uma fixa). */
  readonly aleatorio?: () => number;
}

/**
 * Física das partículas do lápis e da borracha, sem desenho (o canvas fica em `CamadaDeParticulas`).
 * O passo usa tempo real (`dt` = 1 num quadro de 60 fps), para um quadro lento não fazer tudo pular.
 */
export class SistemaDeParticulas {
  private lista: Particula[] = [];
  private readonly aleatorio: () => number;

  constructor(private readonly configuracao: ConfiguracaoDasParticulas) {
    this.aleatorio = configuracao.aleatorio ?? Math.random;
  }

  get ativas(): readonly Particula[] {
    return this.lista;
  }

  /** Solta partículas no ponto: pó, lascas e faíscas na cor do traço; farelo e minhoquinhas na borracha. */
  soltar(ponteiro: PonteiroQueGasta, ponto: Ponto, distancia: number, tons: readonly string[]): void {
    const forca = Math.min(1, distancia / DISTANCIA_RAPIDA);
    if (ponteiro === "lapis") {
      this.varias("po", 2 + forca * 6, ponto, forca, tons);
      if (this.aleatorio() < 0.25 + forca * 0.5) this.varias("lasca", 1, ponto, forca, tons);
      if (this.aleatorio() < 0.4 * forca) this.varias("faisca", 3, ponto, forca, tons);
    } else {
      this.varias("minhoca", 1 + forca * 3, ponto, forca, tons);
      this.varias("po", 2 + forca * 4, ponto, forca, tons);
    }
    this.desbotarExcesso();
  }

  /** Um punhado ao encostar no quadro. */
  encostar(ponteiro: PonteiroQueGasta, ponto: Ponto, tons: readonly string[]): void {
    this.varias(ponteiro === "lapis" ? "po" : "minhoca", 10, ponto, 0.8, tons);
    this.desbotarExcesso();
  }

  passo(dt: number): void {
    for (const particula of this.lista) this.mover(particula, dt);
    this.lista = this.lista.filter((p) => p.vida > 0 && p.x > -20 && p.x < this.configuracao.largura + 20);
  }

  limpar(): void {
    this.lista = [];
  }

  private varias(
    tipo: TipoDeParticula,
    quantidade: number,
    ponto: Ponto,
    forca: number,
    tons: readonly string[],
  ): void {
    for (let i = 0; i < quantidade; i++) this.lista.push(this.nova(tipo, ponto, forca, tons));
  }

  private nova(tipo: TipoDeParticula, [x, y]: Ponto, forca: number, tons: readonly string[]): Particula {
    const sorteio = this.aleatorio;
    const angulo = sorteio() * Math.PI * 2;
    const cor = tons[Math.floor(sorteio() * tons.length)] ?? tons[0] ?? "#2b1a0a";
    const comum = {
      tipo,
      cor,
      x,
      y,
      giro: sorteio() * 6,
      vgiro: (sorteio() - 0.5) * 0.5,
      vida: 1,
      quiques: 0,
      parada: false,
    };
    const movimento = MOVIMENTOS[tipo](sorteio, angulo, forca);
    const particula = {
      ...comum,
      ...movimento,
      get opacidade(): number {
        return opacidadeDa(this.vida);
      },
    };
    return particula;
  }

  private mover(p: Particula, dt: number): void {
    if (p.parada) {
      p.vida -= p.duracao * 0.6 * dt;
      return;
    }
    p.vida -= p.duracao * dt;
    if (p.tipo !== "faisca") p.vy += GRAVIDADE * dt;
    const atrito = Math.pow(p.tipo === "faisca" ? ATRITO_DA_FAISCA : ATRITO, dt);
    p.vx *= atrito;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.giro += p.vgiro * dt;
    if (p.y >= this.configuracao.chao) this.quicar(p);
  }

  private quicar(p: Particula): void {
    p.y = this.configuracao.chao;
    p.vx *= 0.6;
    p.vgiro *= 0.5;
    p.vy = -p.vy * (p.tipo === "minhoca" ? 0.45 : 0.25);
    p.quiques += 1;
    if (p.quiques > QUIQUES_ATE_PARAR || Math.abs(p.vy) < QUIQUE_MINIMO) {
      p.parada = true;
      p.vx = 0;
      p.vy = 0;
      p.vgiro = 0;
    }
  }

  private desbotarExcesso(): void {
    const excesso = this.lista.length - LIMITE_DE_PARTICULAS;
    for (let i = 0; i < excesso; i++) {
      const particula = this.lista[i];
      if (particula !== undefined) particula.duracao = Math.max(particula.duracao, DESBOTE_RAPIDO);
    }
  }
}

export function opacidadeDa(vida: number): number {
  return Math.max(0, Math.min(1, vida / FIM_DA_VIDA));
}

type Movimento = Pick<Particula, "vx" | "vy" | "tamanho" | "curva" | "duracao">;

/** Como cada tipo nasce: velocidade, tamanho e quanto tempo dura (valores do protótipo 13). */
const MOVIMENTOS: Readonly<
  Record<TipoDeParticula, (sorteio: () => number, angulo: number, forca: number) => Movimento>
> = {
  po: (s) => ({ vx: (s() - 0.5) * 3, vy: -s() * 2, tamanho: 2 + s() * 3, curva: 0, duracao: 0.016 }),
  lasca: (s, a, f) => ({
    vx: Math.cos(a) * (2 + f * 4),
    vy: -2 - s() * 4 * f,
    tamanho: 6 + s() * 8,
    curva: 0.6 + s() * 0.8,
    duracao: 0.01,
  }),
  faisca: (s, a, f) => ({
    vx: Math.cos(a) * (3 + f * 5),
    vy: Math.sin(a) * (3 + f * 5),
    tamanho: 3 + s() * 3,
    curva: 0,
    duracao: 0.05,
  }),
  minhoca: (s, _a, f) => ({
    vx: (s() - 0.5) * (3 + f * 5),
    vy: -1 - s() * 3 * f,
    tamanho: 8 + s() * 10,
    curva: 1 + s(),
    duracao: 0.004,
  }),
};
