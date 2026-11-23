import { SEGUNDOS_DA_RODADA } from "../domain/rodada/pontuacao";

/** O cronômetro confere o tempo 10 vezes por segundo: precisão suficiente para os pontos e a tela. */
export const INTERVALO_DO_CRONOMETRO_MS = 100;
const MILISSEGUNDOS_POR_SEGUNDO = 1000;
const LIMITE_DA_RODADA_MS = SEGUNDOS_DA_RODADA * MILISSEGUNDOS_POR_SEGUNDO;

/**
 * Segundos que faltam, contados do primeiro traço (spec `partida`); sem traço, o relógio não começou.
 *
 * @example
 * segundosRestantes(1000, 7000); // 14
 */
export function segundosRestantes(primeiroTracoMs: number | undefined, agoraMs: number): number {
  if (primeiroTracoMs === undefined) return SEGUNDOS_DA_RODADA;
  return Math.max(0, (LIMITE_DA_RODADA_MS - (agoraMs - primeiroTracoMs)) / MILISSEGUNDOS_POR_SEGUNDO);
}

export function segundosDecorridos(primeiroTracoMs: number, agoraMs: number): number {
  return (agoraMs - primeiroTracoMs) / MILISSEGUNDOS_POR_SEGUNDO;
}

/** Rodada sem nenhum traço até 20 s depois do início da etapa: é encerrada (e julgada como ERROU). */
export function esperaEsgotada(inicioDaEtapaMs: number, agoraMs: number): boolean {
  return agoraMs - inicioDaEtapaMs >= LIMITE_DA_RODADA_MS;
}

/** Parte dos 20 s já usada (0 a 1). */
export function fracaoDoTempo(primeiroTracoMs: number, agoraMs: number): number {
  return Math.min(1, segundosDecorridos(primeiroTracoMs, agoraMs) / SEGUNDOS_DA_RODADA);
}
