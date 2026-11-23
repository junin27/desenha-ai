import { topK } from "../domain/rodada/ensemble";
import type { PartidaNoPlacar } from "../domain/rodada/pontuacao";
import type { Veredito } from "../domain/rodada/veredito";
import { porcentagem, type LeituraParcial } from "../domain/ze/conversa";

const PALPITES_NA_TELA = 3;

/** Selo de quem gerou a fala mostrada (spec `comparacao-base-destilado`). */
export function seloDaFala(origem: "ze" | "reserva", modelo: "destilado" | "base" | undefined): string {
  if (origem === "reserva") return "Reserva";
  return modelo === "base" ? "Qwen3 base (sem fine-tuning)" : "Zé destilado";
}

export const TITULO_DO_VEREDITO: Readonly<Record<Veredito, string>> = {
  ACERTOU: "Acertou!",
  QUASE: "Quase!",
  ERROU: "Errou!",
};

/** "vaca 85%" para os 3 primeiros palpites do ensemble. */
export function palpitesNaTela(probabilidades: readonly number[], nomes: readonly string[]): string[] {
  const melhores = topK(probabilidades, Math.min(PALPITES_NA_TELA, probabilidades.length));
  if (!melhores.ok) return [];
  return melhores.valor.map(([indice, chance]) => `${nomes[indice] ?? indice} ${porcentagem(chance)}%`);
}

/** O que o Zé está gerando agora: o raciocínio enquanto pensa, depois a resposta. */
export function falaAoVivoNaTela(leitura: LeituraParcial | undefined): string {
  if (leitura === undefined) return "";
  return leitura.etapa === "pensando" ? leitura.pensamento : leitura.resposta;
}

/**
 * Posição da partida que acabou de terminar: ela já está no placar e perde os empates para quem terminou
 * antes, então a posição é o número de partidas com pelo menos os mesmos pontos.
 *
 * @example
 * posicaoNoPlacar([{ pontos: 200 }, { pontos: 165 }, { pontos: 30 }], 165); // 2
 */
export function posicaoNoPlacar(partidas: readonly Pick<PartidaNoPlacar, "pontos">[], total: number): number {
  return Math.max(1, partidas.filter((partida) => partida.pontos >= total).length);
}

export function segundosNaTela(segundosRestantes: number): string {
  return String(Math.ceil(segundosRestantes));
}
