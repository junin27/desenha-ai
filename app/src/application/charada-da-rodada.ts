import { vaza } from "../domain/rodada/vazamento";
import { entradaCharada, lerCharada, lerFala, NIVEIS, type Nivel } from "../domain/ze/conversa";
import type { CharadaDaRodada } from "./estado-da-partida";
import type { NarradorDoJogo, OuvinteDaFala, ReservaDoZe } from "./portas";

/** Rodada 1 fácil, 2 médio, 3 difícil: a partida fica mais desafiadora (decisão no design.md). */
export function nivelDaRodada(rodada: number): Nivel {
  return NIVEIS[Math.min(rodada, NIVEIS.length - 1)] ?? "fácil";
}

/**
 * Pede a charada ao Zé e cai na reserva se ele falhar, sair do formato ou vazar a palavra secreta
 * (spec `partida`, "Charada com reserva").
 *
 * @example
 * await obterCharada(narrador, reserva, "vaca", "fácil", aoLer); // { texto, origem: "ze" | "reserva" }
 */
export async function obterCharada(
  narrador: NarradorDoJogo,
  reserva: ReservaDoZe,
  categoria: string,
  nivel: Nivel,
  aoLer: OuvinteDaFala,
): Promise<CharadaDaRodada> {
  const doZe = await charadaDoZe(narrador, categoria, nivel, aoLer);
  if (doZe !== undefined) return { texto: doZe, origem: "ze" };
  return { texto: reserva.charada(categoria), origem: "reserva" };
}

async function charadaDoZe(
  narrador: NarradorDoJogo,
  categoria: string,
  nivel: Nivel,
  aoLer: OuvinteDaFala,
): Promise<string | undefined> {
  const entrada = entradaCharada(categoria, nivel);
  if (!entrada.ok) return undefined;
  const resposta = await narrador.falar(entrada.valor, aoLer);
  if (!resposta.ok) return undefined;
  const fala = lerFala(resposta.valor.texto);
  const charada = fala.ok ? lerCharada(fala.valor.resposta) : fala;
  if (!charada.ok || vaza(categoria, charada.valor)) return undefined;
  return charada.valor;
}
