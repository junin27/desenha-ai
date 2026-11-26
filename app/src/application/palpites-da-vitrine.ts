import type { Desenho } from "../domain/desenho/desenho";
import { prefixo } from "../domain/desenho/prefixo";
import { combinar, topK, type Palpite } from "../domain/rodada/ensemble";
import type { ClassificadorDeDesenho } from "./portas";

/** A vitrine mostra os palpites a cada 25% dos pontos (spec `vitrine-da-abertura`, "Palpites reais das redes"). */
export const FRACOES_DA_VITRINE = [0.25, 0.5, 0.75, 1] as const;
const PALPITES_POR_REDE = 3;

export interface PalpitesNaFracao {
  readonly fracao: number;
  readonly cnn: readonly Palpite[];
  readonly lstm: readonly Palpite[];
  readonly ensemble: readonly Palpite[];
}

/**
 * Roda as redes do jogo sobre o desenho da vitrine em cada fração (D4 do design da change vitrine-viva). Calcula
 * tudo de uma vez quando a vitrine monta; a animação só mostra. O desenho completo vai como está (os desenhos da
 * vitrine já vêm normalizados do Quick, Draw!, como no script que os escolheu); os parciais passam pelo
 * `prefixo`, o mesmo do jogo. Qualquer falha das redes vira `undefined`: a vitrine mostra o desenho sem palpites.
 */
export async function palpitesDaVitrine(
  desenho: Desenho,
  classificador: ClassificadorDeDesenho,
  pesoDaCnn: number,
): Promise<PalpitesNaFracao[] | undefined> {
  const resultados: PalpitesNaFracao[] = [];
  for (const fracao of FRACOES_DA_VITRINE) {
    const palpites = await palpitesNaFracao(desenho, fracao, classificador, pesoDaCnn);
    if (palpites === undefined) return undefined;
    resultados.push(palpites);
  }
  return resultados;
}

function entradaNaFracao(desenho: Desenho, fracao: number): Desenho | undefined {
  if (fracao === 1) return desenho;
  const parcial = prefixo(desenho, fracao);
  return parcial.ok ? parcial.valor : undefined;
}

async function palpitesNaFracao(
  desenho: Desenho,
  fracao: number,
  classificador: ClassificadorDeDesenho,
  pesoDaCnn: number,
): Promise<PalpitesNaFracao | undefined> {
  const entrada = entradaNaFracao(desenho, fracao);
  if (entrada === undefined) return undefined;
  const saida = await classificador.classificar(entrada);
  if (!saida.ok) return undefined;
  const ensemble = combinar(saida.valor.cnn, saida.valor.lstm, pesoDaCnn);
  if (!ensemble.ok) return undefined;
  const cnn = topK(saida.valor.cnn, PALPITES_POR_REDE);
  const lstm = topK(saida.valor.lstm, PALPITES_POR_REDE);
  const juntas = topK(ensemble.valor, PALPITES_POR_REDE);
  if (!cnn.ok || !lstm.ok || !juntas.ok) return undefined;
  return { fracao, cnn: cnn.valor, lstm: lstm.valor, ensemble: juntas.valor };
}
