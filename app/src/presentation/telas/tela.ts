import type { EstadoDaPartida } from "../../application/estado-da-partida";
import type { Desenho } from "../../domain/desenho/desenho";
import type { PartidaNoPlacar } from "../../domain/rodada/pontuacao";

/** Comandos da partida que a tela pode chamar (a `Partida` da aplicação os implementa). */
export interface ComandosDoJogo {
  comecar(nome: string): Promise<void>;
  desenhar(): void;
  registrarTraco(desenho: Desenho, tracoTerminado: boolean): Promise<void>;
  limparDesenho(): void;
  pronto(): Promise<void>;
  proximaRodada(): Promise<void>;
  novaPartida(): void;
}

/** O que a tela precisa ler fora do estado da partida. */
export interface InformacoesDoJogo {
  readonly nomesDasCategorias: readonly string[];
  lerPlacar(): readonly PartidaNoPlacar[];
}

/** Uma tela por etapa: montada uma vez, atualizada a cada mudança do estado. */
export interface Tela {
  readonly raiz: HTMLElement;
  atualizar(estado: EstadoDaPartida): void;
}
