import { falha, ok, type Resultado } from "../../domain/resultado";

/** O que o jogo usa de `classes.json` (change treino-das-redes). */
export interface ClassesDoJogo {
  readonly nomesDasCategorias: readonly string[];
  readonly pesoDaCnn: number;
}

export interface ErroDeArquivo {
  readonly codigo: "arquivo_invalido";
  readonly detalhe: string;
}

const FORMATO = 'esperado {"categorias": [{"indice": 0, "pt": "vaca"}, ...], "w_cnn": 0..1}';

/**
 * Confere e lê `classes.json`: a posição de cada nome tem de ser o índice da saída das redes, senão o
 * jogo mostraria o nome errado para cada probabilidade.
 *
 * @example
 * lerClassesDoJogo({ categorias: [{ indice: 0, pt: "vaca" }], w_cnn: 0.6 }); // ok({ nomesDasCategorias: ["vaca"], pesoDaCnn: 0.6 })
 */
export function lerClassesDoJogo(conteudo: unknown): Resultado<ClassesDoJogo, ErroDeArquivo> {
  if (typeof conteudo !== "object" || conteudo === null) return invalido(`recebido ${typeof conteudo}`);
  const { categorias, w_cnn: pesoDaCnn } = conteudo as Record<string, unknown>;
  if (!Array.isArray(categorias) || categorias.length === 0) return invalido("sem a lista de categorias");
  const nomes = categorias.map((categoria: unknown, posicao) => nomeNaPosicao(categoria, posicao));
  const problema = nomes.findIndex((nome) => nome === undefined);
  if (problema !== -1) return invalido(`categoria na posição ${problema} sem "pt" ou com índice diferente`);
  if (typeof pesoDaCnn !== "number" || !(pesoDaCnn >= 0 && pesoDaCnn <= 1)) {
    return invalido(`w_cnn = ${String(pesoDaCnn)}`);
  }
  return ok({ nomesDasCategorias: nomes as string[], pesoDaCnn });
}

function nomeNaPosicao(categoria: unknown, posicao: number): string | undefined {
  if (typeof categoria !== "object" || categoria === null) return undefined;
  const { indice, pt } = categoria as Record<string, unknown>;
  return indice === posicao && typeof pt === "string" ? pt : undefined;
}

function invalido(problema: string): Resultado<never, ErroDeArquivo> {
  return falha({ codigo: "arquivo_invalido", detalhe: `classes.json inválido: ${problema}; ${FORMATO}` });
}
