import { combinar } from "../domain/rodada/ensemble";
import type { PalpiteDaRodada } from "./estado-da-partida";
import type { ProbabilidadesDasRedes } from "./portas";

/**
 * Junta as saídas das duas redes com o ensemble (`w_cnn` de `classes.json`). Probabilidades inválidas
 * (modelo trocado ou corrompido) não viram palpite: a rodada segue com o palpite anterior.
 *
 * @example
 * montarPalpite({ cnn: [1, 0], lstm: [0, 1] }, 0.6)?.ensemble; // [0.6, 0.4]
 */
export function montarPalpite(
  probabilidades: ProbabilidadesDasRedes,
  pesoDaCnn: number,
): PalpiteDaRodada | undefined {
  const ensemble = combinar(probabilidades.cnn, probabilidades.lstm, pesoDaCnn);
  if (!ensemble.ok) return undefined;
  return { cnn: probabilidades.cnn, lstm: probabilidades.lstm, ensemble: ensemble.valor };
}
