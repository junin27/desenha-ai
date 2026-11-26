import type { Desenho } from "../domain/desenho/desenho";

/** Um desenho real do conjunto de teste do Quick, Draw! (D5 do design da change vitrine-viva). */
export interface DesenhoDaVitrine {
  /** Nome da categoria em português, como em `classes.json`. */
  readonly categoria: string;
  /** Índice da categoria nas redes. */
  readonly indice: number;
  readonly desenho: Desenho;
}

export interface DesenhosDaVitrine {
  /** Crédito do dataset, mostrado na vitrine ("Quick, Draw! · CC BY 4.0"). */
  readonly fonte: string;
  readonly desenhos: readonly DesenhoDaVitrine[];
}
