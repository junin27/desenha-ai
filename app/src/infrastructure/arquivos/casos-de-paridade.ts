import type { CasoDeParidade } from "../../application/autoteste-de-paridade";
import { criarDesenho, type Traco } from "../../domain/desenho/desenho";
import { falha, ok, type Resultado } from "../../domain/resultado";
import type { ErroDeArquivo } from "./classes-do-jogo";

const FORMATO = 'esperado [{"tracos": [[[x, y], ...], ...], "probs_cnn": [...], "probs_lstm": [...]}, ...]';

/**
 * Lê `teste_paridade_redes.json` (gerado pelo `desenha_ml.artefatos.paridade_das_redes_json`).
 *
 * @example
 * lerCasosDeParidade([{ tracos: [[[0, 0]]], probs_cnn: [1], probs_lstm: [1] }]); // ok([...])
 */
export function lerCasosDeParidade(conteudo: unknown): Resultado<CasoDeParidade[], ErroDeArquivo> {
  if (!Array.isArray(conteudo)) return invalido("o arquivo não é uma lista");
  const casos = conteudo.map(casoOuNada);
  const problema = casos.findIndex((caso) => caso === undefined);
  if (problema !== -1) return invalido(`caso ${problema} fora do formato`);
  return ok(casos as CasoDeParidade[]);
}

function casoOuNada(item: unknown): CasoDeParidade | undefined {
  if (typeof item !== "object" || item === null) return undefined;
  const { tracos, probs_cnn: cnn, probs_lstm: lstm } = item as Record<string, unknown>;
  if (!ehListaDeTracos(tracos) || !ehListaDeNumeros(cnn) || !ehListaDeNumeros(lstm)) return undefined;
  return { desenho: criarDesenho(tracos), probabilidadesCnn: cnn, probabilidadesLstm: lstm };
}

function ehListaDeNumeros(valor: unknown): valor is number[] {
  return Array.isArray(valor) && valor.every((numero) => typeof numero === "number");
}

function ehListaDeTracos(valor: unknown): valor is Traco[] {
  const ehPonto = (ponto: unknown): boolean => ehListaDeNumeros(ponto) && ponto.length === 2;
  return Array.isArray(valor) && valor.every((traco) => Array.isArray(traco) && traco.every(ehPonto));
}

function invalido(problema: string): Resultado<never, ErroDeArquivo> {
  const detalhe = `teste_paridade_redes.json inválido: ${problema}; ${FORMATO}`;
  return falha({ codigo: "arquivo_invalido", detalhe });
}
