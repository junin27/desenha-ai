import { formaComparavel } from "../rodada/vazamento";

/*
 * Lista de bloqueio do "Pergunte ao Zé" (D4 do design da bancada-do-ze). As palavras passam pela mesma
 * forma comparável do vazamento (minúsculas, sem acento, qu→c, gu→g). Raízes bloqueiam a palavra e as
 * derivadas; palavras inteiras ficam para termos curtos que apareceriam dentro de palavras inocentes
 * ("cu" em "cuscuz", "bost" em "Boston", "viad" em "viaduto").
 */
const RAIZES_BLOQUEADAS = [
  "porr",
  "caralh",
  "merd",
  "fod",
  "put",
  "arrombad",
  "desgracad",
  "vagabund",
  "bucet",
  "piroc",
  "babac",
  "otari",
  "imbecil",
  "cacet",
] as const;
const PALAVRAS_BLOQUEADAS = new Set(
  ["cu", "bosta", "viado", "corno", "idiota", "fdp", "pqp", "vsf", "tnc"].flatMap(formaComparavel),
);
const RAIZES_COMPARAVEIS = RAIZES_BLOQUEADAS.flatMap(formaComparavel);

/**
 * Verdadeiro se a pergunta tem palavra ofensiva da lista. Falso positivo só troca a resposta por uma
 * educada; por isso a lista é curta e conservadora.
 *
 * @example
 * perguntaBloqueada("Qual é a PÓRRA do jogo?"); // true
 * perguntaBloqueada("Cuscuz é de Goiás?"); // false
 */
export function perguntaBloqueada(pergunta: string): boolean {
  return formaComparavel(pergunta).some(
    (palavra) =>
      PALAVRAS_BLOQUEADAS.has(palavra) || RAIZES_COMPARAVEIS.some((raiz) => palavra.startsWith(raiz)),
  );
}
