import { falha, ok, type Resultado } from "../resultado";
import { normalizarEspacos } from "../texto";
import type { ErroDeRegra } from "./erros";
import type { Veredito } from "./veredito";

export const SEGUNDOS_DA_RODADA = 20;
export const RODADAS_POR_PARTIDA = 3;
const PONTOS_ACERTOU = 100;
const PONTOS_QUASE = 30;
const BONUS_MAXIMO = 50;
const TAMANHO_DO_PLACAR = 10;
const TAMANHO_MAXIMO_DO_NOME = 16;

export interface PartidaNoPlacar {
  readonly nome: string;
  readonly pontos: number;
  readonly terminadaEmMs: number;
}

/**
 * 100 + ⌊50 × restantes ÷ 20⌋ se acertou, 30 se quase, 0 se errou. Piso porque `Math.round` e o
 * `round()` do Python divergem em empates (D3 do design).
 *
 * @example
 * pontosDaRodada("ACERTOU", 10); // 125
 */
export function pontosDaRodada(veredito: Veredito, segundosRestantes: number): number {
  if (veredito === "QUASE") return PONTOS_QUASE;
  if (veredito === "ERROU") return 0;
  const restantes = Math.min(Math.max(segundosRestantes, 0), SEGUNDOS_DA_RODADA);
  return PONTOS_ACERTOU + Math.floor((BONUS_MAXIMO * restantes) / SEGUNDOS_DA_RODADA);
}

export function pontosDaPartida(pontosDasRodadas: readonly number[]): number {
  return pontosDasRodadas.reduce((a, b) => a + b, 0);
}

/** Tira espaços das pontas e repetidos; conta pontos de código (um emoji vale 1, como no Python). */
export function limparNome(nome: string): Resultado<string, ErroDeRegra> {
  const limpo = normalizarEspacos(nome);
  const tamanho = Array.from(limpo).length; // pontos de código, como len() no Python (D7)
  if (tamanho < 1 || tamanho > TAMANHO_MAXIMO_DO_NOME) {
    const detalhe = `nome "${limpo}" com ${tamanho} caracteres; esperado de 1 a ${TAMANHO_MAXIMO_DO_NOME}`;
    return falha({ codigo: "nome_invalido", detalhe });
  }
  return ok(limpo);
}

/** Mais pontos primeiro; empate fica com quem terminou antes; corta nas 10 melhores. */
export function ordenarPlacar(partidas: readonly PartidaNoPlacar[]): PartidaNoPlacar[] {
  return [...partidas]
    .sort((a, b) => b.pontos - a.pontos || a.terminadaEmMs - b.terminadaEmMs)
    .slice(0, TAMANHO_DO_PLACAR);
}
