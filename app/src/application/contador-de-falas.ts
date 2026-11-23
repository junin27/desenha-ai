import type { EstadoDaPartida } from "./estado-da-partida";
import type { MedicoesDaSessao } from "./medicoes-da-sessao";
import type { Partida } from "./partida";
import type { Cancelamento } from "./portas";

/**
 * Conta, por modelo, as falas do Zé usadas, as trocadas pela reserva e as discordâncias com a regra,
 * olhando o que a partida mostrou: uma charada nova ou um resultado novo.
 *
 * @example
 * contarFalasDaPartida(partida, medicoes);
 */
export function contarFalasDaPartida(partida: Partida, medicoes: MedicoesDaSessao): Cancelamento {
  let anterior = partida.estado;
  return partida.aoMudar((atual) => {
    registrarNovidades(anterior, atual, medicoes);
    anterior = atual;
  });
}

function registrarNovidades(
  anterior: EstadoDaPartida,
  atual: EstadoDaPartida,
  medicoes: MedicoesDaSessao,
): void {
  if (anterior.charada === undefined && atual.charada !== undefined) {
    medicoes.registrarUso(atual.charada.origem, false);
  }
  const novo = atual.resultados.length > anterior.resultados.length ? atual.resultados.at(-1) : undefined;
  if (novo !== undefined) medicoes.registrarUso(novo.origemDaNarracao, novo.discordanciaDoZe);
}
