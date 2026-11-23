import type { Sorteador } from "../application/portas";

/**
 * Fisher-Yates sobre uma cópia (todas as ordens com a mesma chance). O gerador é injetável para o teste
 * ser determinístico.
 *
 * @example
 * new SorteadorAleatorio().embaralhar([0, 1, 2]); // ex.: [2, 0, 1]
 */
export class SorteadorAleatorio implements Sorteador {
  constructor(private readonly aleatorio: () => number = Math.random) {}

  embaralhar<T>(lista: readonly T[]): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(this.aleatorio() * (i + 1));
      [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
    }
    return copia;
  }
}
