/** Capítulos da vitrine, na ordem da história (spec `vitrine-da-abertura`, requisito "Vitrine como primeira tela"). */

export type IdDoCapitulo =
  | "abertura"
  | "jogo"
  | "desenho"
  | "cnn"
  | "lstm"
  | "ze"
  | "destilacao"
  | "qlora"
  | "quantizacao"
  | "engenharia"
  | "convite";

export interface Capitulo {
  readonly id: IdDoCapitulo;
  readonly nome: string;
}

export const CAPITULOS: readonly Capitulo[] = [
  { id: "abertura", nome: "Início" },
  { id: "jogo", nome: "O jogo" },
  { id: "desenho", nome: "O desenho" },
  { id: "cnn", nome: "A CNN" },
  { id: "lstm", nome: "A LSTM" },
  { id: "ze", nome: "O Zé (SLM)" },
  { id: "destilacao", nome: "Destilação" },
  { id: "qlora", nome: "QLoRA" },
  { id: "quantizacao", nome: "Quantização GGUF" },
  { id: "engenharia", nome: "Engenharia" },
  { id: "convite", nome: "Sua vez, sô!" },
];

/**
 * Índice do desenho da próxima volta da história: sorteado entre todos na primeira volta e, depois, entre os
 * outros (nunca repete o anterior quando há mais de um). `sorteio` é um número em [0, 1).
 */
export function proximoDesenho(total: number, anterior: number | undefined, sorteio: number): number {
  if (total <= 1) return 0;
  if (anterior === undefined) return Math.min(total - 1, Math.floor(sorteio * total));
  const indice = Math.min(total - 2, Math.floor(sorteio * (total - 1)));
  return indice >= anterior ? indice + 1 : indice;
}
