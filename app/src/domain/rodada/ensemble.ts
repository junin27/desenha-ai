import { falha, ok, type Resultado } from "../resultado";
import type { ErroDeRegra } from "./erros";

const TOLERANCIA_DA_SOMA = 1e-3;

/** Par (índice da categoria, probabilidade). */
export type Palpite = readonly [number, number];

/**
 * w_cnn × p_cnn + (1 − w_cnn) × p_lstm, categoria por categoria, na mesma ordem de contas de
 * `desenha_ml.ensemble.combinar`.
 *
 * @example
 * combinar([0.6, 0.4], [0.2, 0.8], 1); // ok([0.6, 0.4])
 */
export function combinar(
  pCnn: readonly number[],
  pLstm: readonly number[],
  wCnn: number,
): Resultado<number[], ErroDeRegra> {
  if (!(wCnn >= 0 && wCnn <= 1)) {
    return falha({ codigo: "peso_invalido", detalhe: `w_cnn = ${wCnn} inválido; esperado 0 <= w_cnn <= 1` });
  }
  if (pCnn.length !== pLstm.length) {
    const detalhe = `CNN com ${pCnn.length} categorias e LSTM com ${pLstm.length}; esperado o mesmo tamanho`;
    return falha({ codigo: "probabilidades_invalidas", detalhe });
  }
  const problema = problemaNasProbabilidades("CNN", pCnn) ?? problemaNasProbabilidades("LSTM", pLstm);
  if (problema !== undefined) return falha({ codigo: "probabilidades_invalidas", detalhe: problema });
  return ok(pCnn.map((a, i) => wCnn * a + (1 - wCnn) * (pLstm[i] ?? Number.NaN)));
}

function problemaNasProbabilidades(nome: string, probabilidades: readonly number[]): string | undefined {
  if (probabilidades.length === 0) return `${nome}: lista vazia; esperado ao menos 1 categoria`;
  if (probabilidades.some((p) => !(p >= 0 && p <= 1))) return `${nome}: valores fora de [0, 1]`;
  const soma = probabilidades.reduce((a, b) => a + b, 0);
  if (Math.abs(soma - 1) > TOLERANCIA_DA_SOMA) return `${nome}: soma ${soma} fora de [0,999; 1,001]`;
  return undefined;
}

/** Palpites em ordem decrescente; empate exato fica com o menor índice (sort estável, ES2019+). */
export function topK(probabilidades: readonly number[], k: number): Resultado<Palpite[], ErroDeRegra> {
  if (!(Number.isInteger(k) && k >= 1 && k <= probabilidades.length)) {
    const detalhe = `k = ${k} inválido; esperado 1 <= k <= ${probabilidades.length}`;
    return falha({ codigo: "k_invalido", detalhe });
  }
  const ordenados = probabilidades
    .map((p, indice): Palpite => [indice, p])
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return ok(ordenados.slice(0, k));
}
