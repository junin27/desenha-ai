import type {
  ErroDoNarrador,
  FalaFinal,
  NarradorDoJogo,
  OuvinteDaFala,
  Relogio,
} from "../application/portas";
import { falha, ok, type Resultado } from "../domain/resultado";
import { lerParcial } from "../domain/ze/conversa";
import { PARADA, promptDeInferencia } from "../domain/ze/prompt";
import { LeitorDeEventos, velocidade, type EventoDoServidor } from "./llama/eventos-do-servidor";

/** Assinatura do `fetch` que o narrador usa (injetada para os testes usarem um servidor falso). */
export type Buscador = (url: string, init: RequestInit) => Promise<Response>;

export interface ConfiguracaoDoNarrador {
  readonly endereco: string;
  readonly limiteMs: number;
}

const CONFIGURACAO_PADRAO: ConfiguracaoDoNarrador = { endereco: "http://127.0.0.1:8080", limiteMs: 25_000 };
const MAXIMO_DE_TOKENS_NOVOS = 300;
// Medido com o Zé treinado (design D8): 0,3 erra menos o veredito que 0,7. Sem penalidade de repetição (1,0):
// o raciocínio termina com "o veredito é ERROU" e a penalidade fazia o Zé trocar o rótulo ("VEREDITO: PELADO").
const TEMPERATURA = 0.3;
const PENALIDADE_DE_REPETICAO = 1.0;

/**
 * Zé rodando no `llama-server` (D5 do design): pedido com *streaming*, leitura parcial a cada pedaço e
 * limite de 25 s pelo `AbortController`. Toda falha vira valor, para a partida usar a reserva.
 *
 * @example
 * const narrador = new NarradorLlamaServer(fetch.bind(window), new RelogioDoNavegador());
 * await narrador.falar("TAREFA: PERGUNTA\nVisitante: oi?", (leitura) => mostrar(leitura));
 */
export class NarradorLlamaServer implements NarradorDoJogo {
  private readonly configuracao: ConfiguracaoDoNarrador;

  constructor(
    private readonly buscar: Buscador,
    private readonly relogio: Relogio,
    configuracao: Partial<ConfiguracaoDoNarrador> = {},
  ) {
    this.configuracao = { ...CONFIGURACAO_PADRAO, ...configuracao };
  }

  async falar(entrada: string, aoLer: OuvinteDaFala): Promise<Resultado<FalaFinal, ErroDoNarrador>> {
    const controle = new AbortController();
    const cancelar = this.relogio.aCada(this.configuracao.limiteMs, () => {
      controle.abort();
    });
    try {
      return await this.conversar(entrada, aoLer, controle.signal);
    } catch (erro) {
      // Rede recusada, pedido abortado ou resposta ilegível: todos são falhas esperadas do SLM local.
      // Só o limite de tempo aborta o pedido: sinal abortado significa que o Zé demorou demais.
      if (controle.signal.aborted) {
        const detalhe = `sem resposta completa em ${this.configuracao.limiteMs} ms`;
        return falha({ codigo: "narrador_lento", detalhe });
      }
      return falha({
        codigo: "narrador_indisponivel",
        detalhe: `llama-server em ${this.configuracao.endereco}: ${String(erro)}`,
      });
    } finally {
      cancelar();
    }
  }

  private async conversar(
    entrada: string,
    aoLer: OuvinteDaFala,
    sinal: AbortSignal,
  ): Promise<Resultado<FalaFinal, ErroDoNarrador>> {
    const resposta = await this.buscar(`${this.configuracao.endereco}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpoDoPedido(entrada)),
      signal: sinal,
    });
    if (!resposta.ok || resposta.body === null) {
      return falha({
        codigo: "narrador_indisponivel",
        detalhe: `llama-server respondeu HTTP ${resposta.status}; esperado 200`,
      });
    }
    return ok(await lerStreaming(resposta.body, aoLer));
  }
}

function corpoDoPedido(entrada: string): Record<string, unknown> {
  return {
    prompt: promptDeInferencia(entrada),
    n_predict: MAXIMO_DE_TOKENS_NOVOS,
    stop: [PARADA],
    stream: true,
    temperature: TEMPERATURA,
    repeat_penalty: PENALIDADE_DE_REPETICAO,
    // Reaproveita o prefixo do system prompt entre pedidos: menos latência em CPU (D5).
    cache_prompt: true,
  };
}

async function lerStreaming(corpo: ReadableStream<Uint8Array>, aoLer: OuvinteDaFala): Promise<FalaFinal> {
  const leitor = new LeitorDeEventos();
  const decodificador = new TextDecoder();
  let texto = "";
  let ultimo: EventoDoServidor = {};
  for await (const bytes of corpo) {
    for (const evento of leitor.receber(decodificador.decode(bytes, { stream: true }))) {
      ultimo = evento;
      if (evento.content === undefined || evento.content === "") continue;
      texto += evento.content;
      aoLer(lerParcial(texto));
    }
  }
  return { texto, ...velocidade(ultimo) };
}
