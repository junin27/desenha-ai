/** O que gasta: o lápis ao desenhar, a borracha ao apagar. */
export type PonteiroQueGasta = "lapis" | "borracha";

/** Medidas do desenho do lápis (no espaço do SVG): corpo amarelo e borracha rosa. */
export interface MedidasDoLapis {
  readonly corpo: number;
  readonly borracha: number;
}

export const LAPIS_INTEIRO: MedidasDoLapis = { corpo: 150, borracha: 30 };
export const LAPIS_MINIMO: MedidasDoLapis = { corpo: 40, borracha: 6 };
/** Quanto encolhe por pixel percorrido no quadro (calibrado no protótipo 13). */
const GASTO_DO_CORPO = 0.03;
const GASTO_DA_PONTA = 0.0025;
const GASTO_DA_BORRACHA = 0.012;

/**
 * Desgaste do lápis e da borracha (spec `lapis-no-quadro`): encolhem com a distância percorrida, param no
 * tamanho mínimo e continuam funcionando; `renovar` dá um lápis novo.
 *
 * @example
 * const desgaste = new DesgasteDoLapis();
 * desgaste.gastar("lapis", 12);
 */
export class DesgasteDoLapis {
  corpo = LAPIS_INTEIRO.corpo;
  borracha = LAPIS_INTEIRO.borracha;
  /** 1 = ponta afiada; 0 = rombuda. */
  ponta = 1;

  gastar(ponteiro: PonteiroQueGasta, distancia: number): void {
    if (ponteiro === "lapis") {
      this.corpo = Math.max(LAPIS_MINIMO.corpo, this.corpo - distancia * GASTO_DO_CORPO);
      this.ponta = Math.max(0, this.ponta - distancia * GASTO_DA_PONTA);
      return;
    }
    this.borracha = Math.max(LAPIS_MINIMO.borracha, this.borracha - distancia * GASTO_DA_BORRACHA);
  }

  renovar(): void {
    this.corpo = LAPIS_INTEIRO.corpo;
    this.borracha = LAPIS_INTEIRO.borracha;
    this.ponta = 1;
  }
}
