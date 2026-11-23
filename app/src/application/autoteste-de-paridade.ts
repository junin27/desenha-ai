import type { Desenho } from "../domain/desenho/desenho";
import type { ClassificadorDeDesenho } from "./portas";

/** Diferença máxima aceita entre o jogo e o treino (spec `palpites-ao-vivo`). */
export const TOLERANCIA_DE_PARIDADE = 1e-4;

/** Um desenho do conjunto de teste com as probabilidades que o treino gravou para ele. */
export interface CasoDeParidade {
  readonly desenho: Desenho;
  readonly probabilidadesCnn: readonly number[];
  readonly probabilidadesLstm: readonly number[];
}

export interface ResultadoDaParidade {
  readonly passou: boolean;
  readonly casos: number;
  readonly maiorDiferenca: number;
}

/**
 * Roda as redes do jogo nos desenhos de paridade e compara com o treino: pega modelo trocado, arquivo
 * corrompido ou pré-processamento divergente antes de o público jogar. Os desenhos vão como estão (já
 * vieram do Quick, Draw! simplificado), sem a preparação da captura.
 *
 * @example
 * const { passou } = await conferirParidade(classificador, casos);
 */
export async function conferirParidade(
  classificador: ClassificadorDeDesenho,
  casos: readonly CasoDeParidade[],
): Promise<ResultadoDaParidade> {
  let maiorDiferenca = casos.length === 0 ? Number.POSITIVE_INFINITY : 0;
  for (const caso of casos) {
    const resposta = await classificador.classificar(caso.desenho);
    const diferenca = resposta.ok
      ? Math.max(
          diferencaMaxima(resposta.valor.cnn, caso.probabilidadesCnn),
          diferencaMaxima(resposta.valor.lstm, caso.probabilidadesLstm),
        )
      : Number.POSITIVE_INFINITY;
    maiorDiferenca = Math.max(maiorDiferenca, diferenca);
  }
  return { passou: maiorDiferenca <= TOLERANCIA_DE_PARIDADE, casos: casos.length, maiorDiferenca };
}

/** Tamanhos diferentes também reprovam: outro modelo, com outro número de categorias. */
function diferencaMaxima(obtidas: readonly number[], esperadas: readonly number[]): number {
  if (obtidas.length !== esperadas.length) return Number.POSITIVE_INFINITY;
  return Math.max(0, ...obtidas.map((p, i) => Math.abs(p - (esperadas[i] ?? Number.NaN))));
}
