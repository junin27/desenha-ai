import { falha, ok, type Resultado } from "../resultado";
import {
  criarDesenho,
  totalDePontos,
  type Desenho,
  type ErroDePreProcessamento,
  type Traco,
} from "./desenho";
import { normalizar } from "./normalizacao";

const PONTOS_MINIMOS = 2;
// Tolerância para o teto não subir por erro de ponto flutuante (0,3 x 10 = 3,0000000000000004).
const TOLERANCIA_DO_TETO = 1e-9;

/**
 * Primeiros ⌈p × N⌉ pontos do desenho, renormalizados: o que o jogo vê enquanto a pessoa desenha.
 *
 * @example
 * prefixo(desenhoDe4Mais6Pontos, 0.5); // ok, com traços de 4 e 1 pontos
 */
export function prefixo(desenho: Desenho, fracao: number): Resultado<Desenho, ErroDePreProcessamento> {
  if (!(fracao > 0 && fracao <= 1)) {
    return falha({ codigo: "fracao_invalida", detalhe: `fração ${fracao} inválida; esperado 0 < p <= 1` });
  }
  const total = totalDePontos(desenho);
  const quantidade = Math.max(
    Math.min(PONTOS_MINIMOS, total),
    Math.ceil(fracao * total - TOLERANCIA_DO_TETO),
  );
  return ok(normalizar(primeirosPontos(desenho, quantidade)));
}

function primeirosPontos(desenho: Desenho, quantidade: number): Desenho {
  const tracos: Traco[] = [];
  let restante = quantidade;
  for (const traco of desenho.tracos) {
    if (restante <= 0) break;
    tracos.push(traco.slice(0, restante));
    restante -= traco.length;
  }
  return criarDesenho(tracos);
}
