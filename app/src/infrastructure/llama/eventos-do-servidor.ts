/** Um evento do *streaming* do `llama-server` (`POST /completion` com `stream: true`). */
export interface EventoDoServidor {
  readonly content?: string;
  readonly stop?: boolean;
  readonly timings?: {
    readonly predicted_n?: number;
    readonly predicted_ms?: number;
    readonly predicted_per_second?: number;
  };
}

const PREFIXO_DE_DADOS = "data: ";

/**
 * Junta os pedaços do corpo (que podem partir uma linha no meio) e devolve os eventos `data: {...}`
 * completos. Linha `data:` que não é JSON lança erro: é resposta de outro servidor ou bug.
 *
 * @example
 * new LeitorDeEventos().receber('data: {"content":"Oi"}\n\n'); // [{ content: "Oi" }]
 */
export class LeitorDeEventos {
  private resto = "";

  receber(pedaco: string): EventoDoServidor[] {
    const linhas = (this.resto + pedaco).split("\n");
    this.resto = linhas.pop() ?? "";
    return linhas.filter((linha) => linha.startsWith(PREFIXO_DE_DADOS)).map(lerEvento);
  }
}

function lerEvento(linha: string): EventoDoServidor {
  return JSON.parse(linha.slice(PREFIXO_DE_DADOS.length)) as EventoDoServidor;
}

const MILISSEGUNDOS_POR_SEGUNDO = 1000;

/** Tokens gerados e tokens por segundo, a partir dos tempos do próprio servidor (spec "Medição de velocidade"). */
export function velocidade(evento: EventoDoServidor): { tokens: number; tokensPorSegundo: number } {
  const tokens = evento.timings?.predicted_n ?? 0;
  const milissegundos = evento.timings?.predicted_ms ?? 0;
  const calculada = milissegundos > 0 ? (tokens * MILISSEGUNDOS_POR_SEGUNDO) / milissegundos : 0;
  return { tokens, tokensPorSegundo: evento.timings?.predicted_per_second ?? calculada };
}
