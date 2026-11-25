import { ordemOficialDoPlacar, TAMANHO_DO_PLACAR, type PartidaNoPlacar } from "./pontuacao";

export type OrdemDaLista = "pontos" | "nome" | "recentes";

export interface OpcoesDaListagem {
  /** Texto procurado no apelido, sem diferenciar acento nem caixa. Vazio = sem busca. */
  readonly busca?: string;
  readonly ordem?: OrdemDaLista;
  /** Partida que acabou de terminar: sai destacada e, fora do top 10, anexada abaixo da 10ª. */
  readonly recemJogada?: PartidaNoPlacar;
}

export interface LinhaDoPlacar {
  /** Posição na ordem oficial (1 = primeiro), mesmo com busca ou outra ordem. */
  readonly posicao: number;
  readonly partida: PartidaNoPlacar;
  readonly destaque: boolean;
}

/**
 * Linhas da lista do placar (specs `pontuacao-e-placar` e `placar-com-busca`): sem busca, as 10 primeiras
 * da ordem oficial; com busca, todas as que casam. Cada linha leva a posição oficial.
 *
 * @example
 * listarPlacar(partidas, { busca: "peao", ordem: "nome" });
 */
export function listarPlacar(
  partidas: readonly PartidaNoPlacar[],
  opcoes: OpcoesDaListagem = {},
): LinhaDoPlacar[] {
  const busca = comparavel(opcoes.busca ?? "");
  const todas = ordemOficialDoPlacar(partidas).map((partida, indice) => ({
    posicao: indice + 1,
    partida,
    destaque: partida === opcoes.recemJogada,
  }));
  const filtradas =
    busca === ""
      ? todas.slice(0, TAMANHO_DO_PLACAR)
      : todas.filter((linha) => comparavel(linha.partida.nome).includes(busca));
  const comRecente = anexarRecemJogada(filtradas, todas, busca === "");
  return ordenarLinhas(comRecente, opcoes.ordem ?? "pontos");
}

function anexarRecemJogada(
  linhas: LinhaDoPlacar[],
  todas: readonly LinhaDoPlacar[],
  semBusca: boolean,
): LinhaDoPlacar[] {
  const recente = todas.find((linha) => linha.destaque);
  if (!semBusca || recente === undefined || linhas.includes(recente)) return linhas;
  return [...linhas, recente];
}

function ordenarLinhas(linhas: LinhaDoPlacar[], ordem: OrdemDaLista): LinhaDoPlacar[] {
  if (ordem === "nome")
    return [...linhas].sort((a, b) => comparavel(a.partida.nome).localeCompare(comparavel(b.partida.nome)));
  if (ordem === "recentes")
    return [...linhas].sort((a, b) => b.partida.terminadaEmMs - a.partida.terminadaEmMs);
  return linhas;
}

/** Forma de comparação: sem acentos, minúscula e sem espaços nas pontas. */
function comparavel(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .trim();
}
