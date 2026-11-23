import { falha, ok, type Resultado } from "../resultado";
import { topK } from "./ensemble";
import type { ErroDeRegra } from "./erros";

export type Veredito = "ACERTOU" | "QUASE" | "ERROU";

const POSICOES_DO_QUASE = 3;
export const PROBABILIDADE_DE_VITORIA_ANTECIPADA = 0.8;
export const SEGUNDOS_MINIMOS_PARA_VITORIA = 2; // evita vitória pelo ruído do primeiro traço

/**
 * ACERTOU (1º palpite = alvo), QUASE (alvo no top-3) ou ERROU. Espelha `desenha_ml.veredito`.
 *
 * @example
 * veredito(2, [0.1, 0.3, 0.6]); // ok("ACERTOU")
 */
export function veredito(alvo: number, probabilidades: readonly number[]): Resultado<Veredito, ErroDeRegra> {
  if (!(Number.isInteger(alvo) && alvo >= 0 && alvo < probabilidades.length)) {
    const detalhe = `alvo ${alvo} inválido; esperado 0 <= alvo < ${probabilidades.length}`;
    return falha({ codigo: "alvo_invalido", detalhe });
  }
  const palpites = topK(probabilidades, Math.min(POSICOES_DO_QUASE, probabilidades.length));
  if (!palpites.ok) return palpites;
  const posicoes = palpites.valor.map(([indice]) => indice);
  if (posicoes[0] === alvo) return ok("ACERTOU");
  return ok(posicoes.includes(alvo) ? "QUASE" : "ERROU");
}

export function deveEncerrarAntes(
  alvo: number,
  probabilidades: readonly number[],
  segundosDecorridos: number,
): Resultado<boolean, ErroDeRegra> {
  const resultado = veredito(alvo, probabilidades);
  if (!resultado.ok) return resultado;
  const confiante = (probabilidades[alvo] ?? 0) >= PROBABILIDADE_DE_VITORIA_ANTECIPADA;
  const tempoSuficiente = segundosDecorridos >= SEGUNDOS_MINIMOS_PARA_VITORIA;
  return ok(resultado.valor === "ACERTOU" && confiante && tempoSuficiente);
}
