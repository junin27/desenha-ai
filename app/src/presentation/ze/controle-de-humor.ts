import type { EstadoDaPartida } from "../../application/estado-da-partida";

/** Humores do Zé (spec `personagem-do-ze`). */
export type Humor =
  | "neutro"
  | "falando"
  | "pensando"
  | "torcendo"
  | "assustado"
  | "comemorando"
  | "coçando-a-cabeça"
  | "bravo"
  | "entediado";

/** Faltando este tanto de segundos ou menos, o Zé fica assustado. */
export const SEGUNDOS_DE_SUSTO = 5;

export interface ContextoDoHumor {
  /** A rodada terminou sem nenhum traço (o Zé fica bravo no veredito). */
  readonly semTracos: boolean;
}

/**
 * Humor que o Zé deve ter na etapa atual da partida. "falando" e "entediado" não saem daqui: a fala e o
 * tédio são sobrepostos pelo personagem e pelo temporizador.
 *
 * @example
 * humorDaPartida({ ...estado, etapa: "desenhando", segundosRestantes: 4 }, { semTracos: false }); // "assustado"
 */
export function humorDaPartida(estado: EstadoDaPartida, contexto: ContextoDoHumor): Humor {
  switch (estado.etapa) {
    case "charada":
      return estado.charada === undefined ? "pensando" : "neutro";
    case "desenhando":
      return estado.segundosRestantes <= SEGUNDOS_DE_SUSTO ? "assustado" : "torcendo";
    case "julgando":
      return "pensando";
    case "resultado":
      return humorDoVeredito(estado, contexto);
    default:
      return "neutro";
  }
}

function humorDoVeredito(estado: EstadoDaPartida, contexto: ContextoDoHumor): Humor {
  if (contexto.semTracos) return "bravo";
  return estado.resultados.at(-1)?.veredito === "ACERTOU" ? "comemorando" : "coçando-a-cabeça";
}
