/**
 * Utilidades de texto com conjunto explícito de espaços, iguais às de `desenha_ml.texto`: o `\s` e o `trim()`
 * do JavaScript não concordam com o `split()`/`strip()` do Python em todos os caracteres.
 *
 * @example
 * normalizarEspacos("  Zé   da  Roça "); // "Zé da Roça"
 */
export const ESPACOS = "[ \\t\\n\\r\\xa0]";
const SEQUENCIA_DE_ESPACOS = new RegExp(`${ESPACOS}+`, "g");
const ESPACOS_NO_INICIO = new RegExp(`^${ESPACOS}+`);
const ESPACOS_NO_FIM = new RegExp(`${ESPACOS}+$`);

export function normalizarEspacos(texto: string): string {
  return texto.replace(SEQUENCIA_DE_ESPACOS, " ").replace(/^ +| +$/g, "");
}

export function aparar(texto: string): string {
  return apararInicio(texto).replace(ESPACOS_NO_FIM, "");
}

/** Só no início: o texto parcial do streaming ainda pode crescer no fim. */
export function apararInicio(texto: string): string {
  return texto.replace(ESPACOS_NO_INICIO, "");
}
