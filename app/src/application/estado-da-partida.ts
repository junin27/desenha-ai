import type { ErroDeRegra } from "../domain/rodada/erros";
import { SEGUNDOS_DA_RODADA } from "../domain/rodada/pontuacao";
import type { Veredito } from "../domain/rodada/veredito";
import type { LeituraParcial } from "../domain/ze/conversa";

/** Etapas da spec `partida`, na ordem em que acontecem. */
export type Etapa = "inicio" | "charada" | "desenhando" | "julgando" | "resultado" | "fim";

/** De onde veio a fala mostrada: do Zé (SLM) ou da reserva (quando ele falha ou sai da regra). */
export type OrigemDaFala = "ze" | "reserva";

export interface CharadaDaRodada {
  readonly texto: string;
  readonly origem: OrigemDaFala;
}

/** Probabilidades das 30 categorias por rede e do ensemble, na ordem de `classes.json`. */
export interface PalpiteDaRodada {
  readonly cnn: readonly number[];
  readonly lstm: readonly number[];
  readonly ensemble: readonly number[];
}

export interface ResultadoDaRodada {
  readonly categoria: number;
  readonly veredito: Veredito;
  readonly pontos: number;
  readonly segundosRestantes: number;
  readonly narracao: string;
  readonly origemDaNarracao: OrigemDaFala;
  /** O Zé respondeu no formato, mas com um veredito diferente do da regra (métrica do SLM, D-08). */
  readonly discordanciaDoZe: boolean;
}

/** Retrato imutável da partida; cada comando produz um novo. */
export interface EstadoDaPartida {
  readonly etapa: Etapa;
  readonly nome: string;
  readonly erro: ErroDeRegra | undefined;
  /** Índices das categorias das 3 rodadas, sem repetição. */
  readonly categorias: readonly number[];
  /** Rodada atual, a partir de 0. */
  readonly rodada: number;
  readonly charada: CharadaDaRodada | undefined;
  /** O que o Zé está gerando agora (charada ou narração), para a tela mostrá-lo "pensando". */
  readonly falaAoVivo: LeituraParcial | undefined;
  readonly segundosRestantes: number;
  readonly palpite: PalpiteDaRodada | undefined;
  readonly resultados: readonly ResultadoDaRodada[];
  /** Soma das rodadas, preenchida no fim. */
  readonly total: number;
}

export const ESTADO_INICIAL: EstadoDaPartida = {
  etapa: "inicio",
  nome: "",
  erro: undefined,
  categorias: [],
  rodada: 0,
  charada: undefined,
  falaAoVivo: undefined,
  segundosRestantes: SEGUNDOS_DA_RODADA,
  palpite: undefined,
  resultados: [],
  total: 0,
};
