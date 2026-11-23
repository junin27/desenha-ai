import { falha, ok, type Resultado } from "../resultado";

/** Ponto (x, y) na ordem em que foi desenhado. */
export type Ponto = readonly [number, number];
export type Traco = readonly Ponto[];

/** Desenho imutável: traços ordenados, todos com ao menos um ponto. Espelha `desenha_ml.desenho`. */
export interface Desenho {
  readonly tracos: readonly Traco[];
}

export interface ErroDePreProcessamento {
  readonly codigo: "desenho_vazio" | "fracao_invalida";
  readonly detalhe: string;
}

/**
 * Valida traços vindos de fora (canvas, arquivo), ignorando traços sem pontos.
 *
 * @example
 * desenhoDePontos([[[0, 0], [10, 5]], []]); // ok, com um traço
 */
export function desenhoDePontos(tracos: readonly Traco[]): Resultado<Desenho, ErroDePreProcessamento> {
  const comPontos = tracos.filter((traco) => traco.length > 0);
  if (comPontos.length === 0) {
    return falha({ codigo: "desenho_vazio", detalhe: "o desenho não tem pontos; esperado ao menos 1" });
  }
  return ok(criarDesenho(comPontos));
}

/** Cria o desenho sem validar (uso interno do domínio e de testes). */
export function criarDesenho(tracos: readonly Traco[]): Desenho {
  return { tracos: tracos.map((traco) => traco.map(([x, y]) => [x, y] as const)) };
}

export function totalDePontos(desenho: Desenho): number {
  return desenho.tracos.reduce((soma, traco) => soma + traco.length, 0);
}

export function todosOsPontos(desenho: Desenho): Ponto[] {
  return desenho.tracos.flat();
}
