import { falha, ok, type Resultado } from "../../domain/resultado";
import type { Buscador } from "../narrador-llama-server";
import type { ErroDeArquivo } from "./classes-do-jogo";

/**
 * Busca um arquivo JSON servido pelo próprio jogo (modelos, classes, charadas). Arquivo ausente ou
 * ilegível vira erro com o endereço, para a tela dizer o que falta copiar.
 *
 * @example
 * await buscarJson(fetch.bind(window), "modelos/classes.json"); // ok({...}) ou falha
 */
export async function buscarJson(
  buscar: Buscador,
  endereco: string,
): Promise<Resultado<unknown, ErroDeArquivo>> {
  try {
    const resposta = await buscar(endereco, {});
    if (!resposta.ok) return invalido(`${endereco} respondeu HTTP ${resposta.status}; esperado 200`);
    return ok((await resposta.json()) as unknown);
  } catch (erro) {
    return invalido(`${endereco} não pôde ser lido como JSON: ${String(erro)}`);
  }
}

function invalido(detalhe: string): Resultado<never, ErroDeArquivo> {
  return falha({ codigo: "arquivo_invalido", detalhe });
}
