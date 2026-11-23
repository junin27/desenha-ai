/**
 * Erros esperados como valores (D3 do design da change pre-processamento-de-tracos).
 *
 * @example
 * const r = desenhoDePontos([]);
 * if (!r.ok) console.log(r.erro.codigo); // "desenho_vazio"
 */
export type Resultado<T, E> =
  { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly erro: E };

export function ok<T>(valor: T): Resultado<T, never> {
  return { ok: true, valor };
}

export function falha<E>(erro: E): Resultado<never, E> {
  return { ok: false, erro };
}
