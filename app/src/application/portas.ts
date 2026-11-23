import type { Desenho } from "../domain/desenho/desenho";
import type { Resultado } from "../domain/resultado";
import type { PartidaNoPlacar } from "../domain/rodada/pontuacao";
import type { Veredito } from "../domain/rodada/veredito";
import type { LeituraParcial } from "../domain/ze/conversa";

/**
 * Portas da aplicação (D1 do design da change jogo-web). Cada uma tem um adaptador real em
 * `infrastructure/` e um dublê nomeado nos testes; a aplicação só conhece estas interfaces.
 */

/** Probabilidades das 30 categorias, na ordem de `classes.json`. */
export interface ProbabilidadesDasRedes {
  readonly cnn: readonly number[];
  readonly lstm: readonly number[];
  /** Quanto cada rede levou, quando o adaptador mede (painel técnico). */
  readonly milissegundos?: { readonly cnn: number; readonly lstm: number };
}

export interface ErroDoClassificador {
  readonly codigo: "classificador_indisponivel";
  readonly detalhe: string;
}

/** Executa a CNN e a LSTM num desenho já preparado (normalizado e simplificado). */
export interface ClassificadorDeDesenho {
  classificar(desenho: Desenho): Promise<Resultado<ProbabilidadesDasRedes, ErroDoClassificador>>;
}

/** Qual SLM responde: o Zé destilado (fine-tuning) ou o Qwen3 base, para comparação (bancada-do-ze). */
export type ModeloDoZe = "destilado" | "base";

/** Texto completo gerado pelo Zé e a velocidade medida pelo próprio servidor. */
export interface FalaFinal {
  readonly texto: string;
  readonly tokens: number;
  readonly tokensPorSegundo: number;
  /** Quem gerou a fala, quando o narrador alterna modelos (bancada-do-ze). */
  readonly modelo?: ModeloDoZe;
}

export interface ErroDoNarrador {
  readonly codigo: "narrador_indisponivel" | "narrador_lento";
  readonly detalhe: string;
}

export type OuvinteDaFala = (leitura: LeituraParcial) => void;

/** Conversa com o SLM: recebe a entrada da tarefa e informa a leitura parcial a cada pedaço. */
export interface NarradorDoJogo {
  falar(entrada: string, aoLer: OuvinteDaFala): Promise<Resultado<FalaFinal, ErroDoNarrador>>;
}

export interface RepositorioDePlacar {
  ler(): readonly PartidaNoPlacar[];
  gravar(partida: PartidaNoPlacar): void;
  zerar(): void;
}

/** Função que, chamada, cancela o agendamento. */
export type Cancelamento = () => void;

export interface Relogio {
  /** Horário em milissegundos (`Date.now()`): vai para o placar. */
  agora(): number;
  /** Relógio monotônico de alta precisão, em milissegundos: só para medir durações (painel técnico). */
  instante(): number;
  aCada(milissegundos: number, tarefa: () => void): Cancelamento;
}

export interface Sorteador {
  embaralhar<T>(lista: readonly T[]): T[];
}

/** Falas de reserva usadas quando o Zé falha, demora, sai do formato ou vaza a palavra. */
export interface ReservaDoZe {
  charada(categoria: string): string;
  narracao(veredito: Veredito, desafio: string, primeiroPalpite: string): string;
  /** Resposta do "Pergunte ao Zé" quando ele falha (bancada-do-ze). */
  resposta(): string;
  /** Resposta educada para pergunta bloqueada; o Zé nem é chamado. */
  respostaBloqueada(): string;
}

/** Voz do Zé (bancada-do-ze): só fala com voz local em português; sem ela, fica indisponível. */
export interface VozDoZe {
  disponivel(): boolean;
  /** Avisa quando as vozes do sistema terminam de carregar (podem chegar depois de abrir o jogo). */
  aoMudarDisponibilidade(ouvinte: (disponivel: boolean) => void): Cancelamento;
  falar(texto: string): void;
  calar(): void;
}

/** Escolhas da organização que valem entre recarregamentos da página (bancada-do-ze). */
export interface PreferenciasDoEstande {
  /** `undefined` quando ninguém escolheu ainda. */
  vozLigada(): boolean | undefined;
  gravarVozLigada(ligada: boolean): void;
}
