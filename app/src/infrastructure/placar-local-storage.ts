import type { RepositorioDePlacar } from "../application/portas";
import type { PartidaNoPlacar } from "../domain/rodada/pontuacao";

/** Versão na chave: se o formato mudar, o placar antigo é ignorado em vez de quebrar a leitura. */
export const CHAVE_DO_PLACAR = "desenha-ai-so:placar:v1";

/** Parte do `Storage` do navegador que o placar usa (o `localStorage` satisfaz). */
export type ArmazenamentoDoNavegador = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Placar no `localStorage` (spec `placar-local`). Guarda uma cópia em memória: se o navegador recusar a
 * gravação (modo privado, sem espaço), o placar segue funcionando até a página fechar.
 *
 * @example
 * const placar = new PlacarLocalStorage(window.localStorage);
 * placar.gravar({ nome: "Ana", pontos: 165, terminadaEmMs: Date.now() });
 */
export class PlacarLocalStorage implements RepositorioDePlacar {
  private partidas: PartidaNoPlacar[];

  constructor(private readonly armazenamento: ArmazenamentoDoNavegador) {
    this.partidas = lerPartidas(armazenamento.getItem(CHAVE_DO_PLACAR));
  }

  ler(): readonly PartidaNoPlacar[] {
    return this.partidas;
  }

  gravar(partida: PartidaNoPlacar): void {
    this.partidas = [...this.partidas, partida];
    this.persistir();
  }

  zerar(): void {
    this.partidas = [];
    this.armazenamento.removeItem(CHAVE_DO_PLACAR);
  }

  private persistir(): void {
    try {
      this.armazenamento.setItem(CHAVE_DO_PLACAR, JSON.stringify(this.partidas));
    } catch (erro) {
      // Não trava o jogo no fim da partida; o aviso fica no console para a organização ver.
      console.warn("Placar não gravado no navegador; segue só em memória.", erro);
    }
  }
}

function lerPartidas(valor: string | null): PartidaNoPlacar[] {
  if (valor === null) return [];
  const lido = jsonOuNada(valor);
  if (!Array.isArray(lido) || !lido.every(ehPartidaNoPlacar)) return [];
  return lido;
}

function jsonOuNada(valor: string): unknown {
  try {
    return JSON.parse(valor);
  } catch {
    return undefined; // JSON corrompido vale placar vazio (spec "Dados corrompidos")
  }
}

function ehPartidaNoPlacar(item: unknown): item is PartidaNoPlacar {
  if (typeof item !== "object" || item === null) return false;
  const campos = item as Record<string, unknown>;
  return (
    typeof campos["nome"] === "string" &&
    Number.isFinite(campos["pontos"]) &&
    Number.isFinite(campos["terminadaEmMs"])
  );
}
