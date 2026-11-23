import { topK } from "../domain/rodada/ensemble";
import { pontosDaRodada } from "../domain/rodada/pontuacao";
import { veredito as vereditoDaRegra, type Veredito } from "../domain/rodada/veredito";
import { entradaVeredito, lerFala, lerVeredito, type Palpites } from "../domain/ze/conversa";
import type { PalpiteDaRodada, ResultadoDaRodada } from "./estado-da-partida";
import type { ModeloDoZe, NarradorDoJogo, OuvinteDaFala, ReservaDoZe } from "./portas";

/** Mesmo número de palpites por rede das entradas VEREDITO do dataset do Zé. */
const PALPITES_POR_REDE = 5;
const SEM_PALPITE = "nada";

export interface RodadaParaJulgar {
  readonly categoria: number;
  readonly nomesDasCategorias: readonly string[];
  readonly palpite: PalpiteDaRodada | undefined;
  readonly segundosRestantes: number;
  /** Quanto do desenho as redes viram (1 = completo), informado ao Zé. */
  readonly fracaoDoDesenho: number;
}

interface Narracao {
  readonly texto: string;
  readonly origem: "ze" | "reserva";
  readonly discordanciaDoZe: boolean;
  readonly modelo?: ModeloDoZe | undefined;
}

/**
 * Veredito e pontos pela regra (D-08); a fala do Zé só é usada se concordar com ela. Sem palpite (nenhum
 * traço), a rodada vale ERROU e nem pergunta ao Zé, porque não há palpites para ele narrar.
 *
 * @example
 * await julgarRodada(narrador, reserva, rodada, aoLer); // { veredito: "QUASE", pontos: 30, ... }
 */
export async function julgarRodada(
  narrador: NarradorDoJogo,
  reserva: ReservaDoZe,
  rodada: RodadaParaJulgar,
  aoLer: OuvinteDaFala,
): Promise<ResultadoDaRodada> {
  const veredito = vereditoDoPalpite(rodada);
  const narracao =
    rodada.palpite === undefined
      ? narracaoDeReserva(reserva, rodada, veredito, false)
      : await narracaoDoZe(narrador, reserva, rodada, rodada.palpite, veredito, aoLer);
  return {
    categoria: rodada.categoria,
    veredito,
    pontos: pontosDaRodada(veredito, rodada.segundosRestantes),
    segundosRestantes: rodada.segundosRestantes,
    narracao: narracao.texto,
    origemDaNarracao: narracao.origem,
    modeloDaNarracao: narracao.modelo,
    discordanciaDoZe: narracao.discordanciaDoZe,
  };
}

function vereditoDoPalpite(rodada: RodadaParaJulgar): Veredito {
  if (rodada.palpite === undefined) return "ERROU";
  const resultado = vereditoDaRegra(rodada.categoria, rodada.palpite.ensemble);
  return resultado.ok ? resultado.valor : "ERROU";
}

async function narracaoDoZe(
  narrador: NarradorDoJogo,
  reserva: ReservaDoZe,
  rodada: RodadaParaJulgar,
  palpite: PalpiteDaRodada,
  veredito: Veredito,
  aoLer: OuvinteDaFala,
): Promise<Narracao> {
  const resposta = await narrador.falar(entradaDaRodada(rodada, palpite), aoLer);
  const fala = resposta.ok ? lerFala(resposta.valor.texto) : resposta;
  const doZe = fala.ok ? lerVeredito(fala.valor.resposta) : fala;
  if (!doZe.ok) return narracaoDeReserva(reserva, rodada, veredito, false);
  const [vereditoDoZe, texto] = doZe.valor;
  if (vereditoDoZe !== veredito) return narracaoDeReserva(reserva, rodada, veredito, true);
  const modelo = resposta.ok ? resposta.valor.modelo : undefined;
  return { texto, origem: "ze", discordanciaDoZe: false, modelo };
}

function narracaoDeReserva(
  reserva: ReservaDoZe,
  rodada: RodadaParaJulgar,
  veredito: Veredito,
  discordanciaDoZe: boolean,
): Narracao {
  const texto = reserva.narracao(veredito, nomeDa(rodada, rodada.categoria), primeiroPalpite(rodada));
  return { texto, origem: "reserva", discordanciaDoZe };
}

/** Nome do 1º palpite do ensemble, ou "nada" quando não houve traço. */
function primeiroPalpite(rodada: RodadaParaJulgar): string {
  if (rodada.palpite === undefined) return SEM_PALPITE;
  return palpitesComNome(rodada, rodada.palpite.ensemble)[0]?.[0] ?? SEM_PALPITE;
}

function entradaDaRodada(rodada: RodadaParaJulgar, palpite: PalpiteDaRodada): string {
  return entradaVeredito(
    nomeDa(rodada, rodada.categoria),
    rodada.fracaoDoDesenho,
    palpitesComNome(rodada, palpite.cnn),
    palpitesComNome(rodada, palpite.lstm),
    palpitesComNome(rodada, palpite.ensemble),
  );
}

function palpitesComNome(rodada: RodadaParaJulgar, probabilidades: readonly number[]): Palpites {
  const melhores = topK(probabilidades, Math.min(PALPITES_POR_REDE, probabilidades.length));
  if (!melhores.ok) return [];
  return melhores.valor.map(([indice, chance]) => [nomeDa(rodada, indice), chance] as const);
}

function nomeDa(rodada: RodadaParaJulgar, indice: number): string {
  return rodada.nomesDasCategorias[indice] ?? `categoria ${indice}`;
}
