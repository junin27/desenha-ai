import type { DesenhoDaVitrine, DesenhosDaVitrine } from "../../application/desenhos-da-vitrine";
import { criarDesenho, type Traco } from "../../domain/desenho/desenho";
import { falha, ok, type Resultado } from "../../domain/resultado";
import type { ErroDeArquivo } from "./classes-do-jogo";

const FORMATO =
  'esperado {"fonte": "...", "desenhos": [{"categoria": "sol", "indice": 15, "tracos": [[[x, y], ...], ...]}, ...]}';

/**
 * Lê `vitrine_tracos.json` (gerado por `scripts/gerar_desenhos_da_vitrine.py`, change vitrine-viva).
 *
 * @example
 * lerDesenhosDaVitrine({ fonte: "Quick, Draw!", desenhos: [{ categoria: "sol", indice: 15, tracos: [[[0, 0]]] }] });
 */
export function lerDesenhosDaVitrine(conteudo: unknown): Resultado<DesenhosDaVitrine, ErroDeArquivo> {
  if (typeof conteudo !== "object" || conteudo === null) return invalido("o conteúdo não é um objeto");
  const { fonte, desenhos } = conteudo as Record<string, unknown>;
  if (typeof fonte !== "string" || !Array.isArray(desenhos) || desenhos.length === 0) {
    return invalido("faltam 'fonte' (texto) ou 'desenhos' (lista não vazia)");
  }
  const lidos = desenhos.map(desenhoOuNada);
  const problema = lidos.findIndex((d) => d === undefined);
  if (problema !== -1) return invalido(`desenho ${problema} fora do formato`);
  return ok({ fonte, desenhos: lidos as DesenhoDaVitrine[] });
}

function desenhoOuNada(item: unknown): DesenhoDaVitrine | undefined {
  if (typeof item !== "object" || item === null) return undefined;
  const { categoria, indice, tracos } = item as Record<string, unknown>;
  if (typeof categoria !== "string" || !Number.isInteger(indice) || !ehListaDeTracos(tracos))
    return undefined;
  return { categoria, indice: indice as number, desenho: criarDesenho(tracos) };
}

function ehListaDeTracos(valor: unknown): valor is Traco[] {
  const ehPonto = (p: unknown): boolean =>
    Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number");
  return (
    Array.isArray(valor) &&
    valor.length > 0 &&
    valor.every((traco) => Array.isArray(traco) && traco.length > 0 && traco.every(ehPonto))
  );
}

function invalido(problema: string): Resultado<never, ErroDeArquivo> {
  return falha({
    codigo: "arquivo_invalido",
    detalhe: `vitrine_tracos.json inválido: ${problema}; ${FORMATO}`,
  });
}
