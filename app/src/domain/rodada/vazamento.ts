const TAMANHO_MINIMO_DA_PALAVRA = 3;
const PREPOSICOES_IGNORADAS = new Set(["de", "da", "do"]);
// Plurais irregulares do português que não começam pela raiz do singular (aviões, sóis).
const TERMINACOES: readonly (readonly [string, string])[] = [
  ["oes", "ao"],
  ["aes", "ao"],
  ["aos", "ao"],
  ["ois", "ol"],
];

/**
 * Minúsculas, sem acento (marcas Mn, como `unicodedata` no Python), palavras [a-z0-9]+, qu→c, gu→g e
 * terminações. Espelha `desenha_ml.vazamento.forma_comparavel`.
 *
 * @example
 * formaComparavel("Vaquinha e aviões"); // ["vacinha", "e", "aviao"]
 */
export function formaComparavel(texto: string): string[] {
  const semAcento = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "");
  const palavras = semAcento.match(/[a-z0-9]+/g) ?? [];
  return palavras.map((p) => trocarTerminacao(p.replaceAll("qu", "c").replaceAll("gu", "g")));
}

/** Conservadora: falso positivo só troca a charada; falso negativo entrega a resposta. */
export function vaza(palavraSecreta: string, texto: string): boolean {
  const palavrasDoTexto = formaComparavel(texto);
  return palavrasRelevantes(palavraSecreta).some((secreta) =>
    palavrasDoTexto.some((palavra) => palavra === secreta || palavra.startsWith(raiz(secreta))),
  );
}

function palavrasRelevantes(palavraSecreta: string): string[] {
  return formaComparavel(palavraSecreta).filter(
    (p) => p.length >= TAMANHO_MINIMO_DA_PALAVRA && !PREPOSICOES_IGNORADAS.has(p),
  );
}

function raiz(palavra: string): string {
  return palavra.slice(0, Math.max(TAMANHO_MINIMO_DA_PALAVRA, palavra.length - 1));
}

function trocarTerminacao(palavra: string): string {
  const regra = TERMINACOES.find(([terminacao]) => palavra.endsWith(terminacao));
  return regra === undefined ? palavra : palavra.slice(0, -regra[0].length) + regra[1];
}
