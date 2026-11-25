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

/** Comandos do "Pergunte ao Zé" (a `ConversaComOZe` da aplicação os implementa). */
export interface ComandosDaConversa {
  abrir(): void;
  perguntar(pergunta: string): Promise<void>;
  voltar(): void;
}

/** O que a tela precisa ler fora do estado da partida. */
export interface InformacoesDoJogo {
  readonly nomesDasCategorias: readonly string[];
  lerPlacar(): readonly PartidaNoPlacar[];
  /** Acurácia de teste do ensemble (0 a 1), das métricas do treino; ausente quando o arquivo não existe. */
  readonly acuraciaDoEnsemble?: number | undefined;
}

/** Uma tela por etapa: montada uma vez, atualizada a cada mudança do estado. */
export interface Tela {
  readonly raiz: HTMLElement;
  atualizar(estado: EstadoDaPartida): void;
}
