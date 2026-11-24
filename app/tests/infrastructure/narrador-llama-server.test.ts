import { describe, expect, it } from "vitest";
import { RelogioFalso } from "../application/dubles";
import { NarradorLlamaServer, type Buscador } from "../../src/infrastructure/narrador-llama-server";
import { entradaCharada, type LeituraParcial } from "../../src/domain/ze/conversa";
import { promptDeInferencia } from "../../src/domain/ze/prompt";

// Spec `narrador-do-ze`.
interface PedidoRecebido {
  readonly url: string;
  readonly corpo: Record<string, unknown>;
}

function evento(conteudo: Record<string, unknown>): string {
  return `data: ${JSON.stringify(conteudo)}\n\n`;
}

/** Servidor falso: responde com os pedaços dados; se `travar`, não termina até o pedido ser abortado. */
function servidorFalso(pedacos: readonly string[], opcoes: { travar?: boolean; status?: number } = {}) {
  const pedidos: PedidoRecebido[] = [];
  const buscar: Buscador = (url, init) => {
    pedidos.push({ url, corpo: JSON.parse(init.body as string) as Record<string, unknown> });
    const corpo = new ReadableStream<Uint8Array>({
      start(controle) {
        const codificador = new TextEncoder();
        for (const pedaco of pedacos) controle.enqueue(codificador.encode(pedaco));
        if (opcoes.travar !== true) controle.close();
        init.signal?.addEventListener("abort", () => {
          controle.error(new DOMException("pedido abortado", "AbortError"));
        });
      },
    });
    return Promise.resolve(new Response(corpo, { status: opcoes.status ?? 200 }));
  };
  return { buscar, pedidos };
}

const FIM = evento({
  content: "",
  stop: true,
  timings: { predicted_n: 120, predicted_ms: 8000, predicted_per_second: 15 },
});
const ENTRADA = (() => {
  const entrada = entradaCharada("vaca", "fácil");
  if (!entrada.ok) throw new Error("entrada de teste inválida");
  return entrada.valor;
})();

describe("chamada ao llama-server", () => {
  it("pedido de charada leva o prompt do contrato, stop <|im_end|>, n_predict 300 e stream", async () => {
    const { buscar, pedidos } = servidorFalso([FIM]);
    await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(ENTRADA, () => undefined);
    expect(pedidos[0]?.url).toBe("http://127.0.0.1:8080/completion");
    expect(pedidos[0]?.corpo).toMatchObject({
      prompt: promptDeInferencia(ENTRADA),
      stop: ["<|im_end|>"],
      n_predict: 300,
      stream: true,
      cache_prompt: true,
    });
  });

  it("gera com temperatura 0,3 e repeat_penalty 1,1 (medido com o Zé treinado: sem laço, mais vereditos certos)", async () => {
    const { buscar, pedidos } = servidorFalso([FIM]);
    await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(ENTRADA, () => undefined);
    expect(pedidos[0]?.corpo).toMatchObject({ temperature: 0.3, repeat_penalty: 1.1 });
  });

  it("usa o endereço configurado", async () => {
    const { buscar, pedidos } = servidorFalso([FIM]);
    const narrador = new NarradorLlamaServer(buscar, new RelogioFalso(), {
      endereco: "http://localhost:8081",
    });
    await narrador.falar(ENTRADA, () => undefined);
    expect(pedidos[0]?.url).toBe("http://localhost:8081/completion");
  });
});

describe("fala progressiva", () => {
  it("pensando ao vivo: pedaços '<pensamento>Malha' e 'da e mansa' viram 'Malha' e 'Malhada e mansa'", async () => {
    const { buscar } = servidorFalso([
      evento({ content: "<pensamento>Malha" }),
      evento({ content: "da e mansa" }),
      FIM,
    ]);
    const leituras: LeituraParcial[] = [];
    await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(ENTRADA, (l) => leituras.push(l));
    expect(leituras.map((l) => [l.etapa, l.pensamento])).toEqual([
      ["pensando", "Malha"],
      ["pensando", "Malhada e mansa"],
    ]);
  });

  it("junta eventos SSE que chegam partidos no meio da linha", async () => {
    const inteiro = evento({ content: "<pensamento>Oi</pensamento>" }) + FIM;
    const { buscar } = servidorFalso([inteiro.slice(0, 17), inteiro.slice(17, 40), inteiro.slice(40)]);
    const resposta = await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(
      ENTRADA,
      () => undefined,
    );
    expect(resposta.ok && resposta.valor.texto).toBe("<pensamento>Oi</pensamento>");
  });
});

describe("limite de tempo e falhas", () => {
  it("servidor desligado devolve narrador_indisponivel", async () => {
    const buscar: Buscador = () => Promise.reject(new TypeError("fetch failed: ECONNREFUSED"));
    const resposta = await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(
      ENTRADA,
      () => undefined,
    );
    expect(resposta.ok).toBe(false);
    if (!resposta.ok) expect(resposta.erro.codigo).toBe("narrador_indisponivel");
  });

  it("servidor com erro HTTP devolve narrador_indisponivel com o status", async () => {
    const { buscar } = servidorFalso([], { status: 503 });
    const resposta = await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(
      ENTRADA,
      () => undefined,
    );
    expect(resposta.ok).toBe(false);
    if (!resposta.ok) {
      expect(resposta.erro.codigo).toBe("narrador_indisponivel");
      expect(resposta.erro.detalhe).toContain("503");
    }
  });

  it("servidor lento: depois de 25 s a geração é cancelada e devolve narrador_lento", async () => {
    const { buscar } = servidorFalso([evento({ content: "<pensamento>Hum" })], { travar: true });
    const relogio = new RelogioFalso();
    const falando = new NarradorLlamaServer(buscar, relogio).falar(ENTRADA, () => undefined);
    await new Promise((resolver) => setTimeout(resolver, 0));
    relogio.avancar(25_000);
    const resposta = await falando;
    expect(resposta.ok).toBe(false);
    if (!resposta.ok) expect(resposta.erro.codigo).toBe("narrador_lento");
    expect(relogio.agendamentosAtivos).toBe(0);
  });

  it("evento que não é JSON devolve narrador_indisponivel", async () => {
    const { buscar } = servidorFalso(["data: {quebrado\n\n"]);
    const resposta = await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(
      ENTRADA,
      () => undefined,
    );
    expect(resposta.ok).toBe(false);
  });
});

describe("medição de velocidade", () => {
  it("velocidade registrada: 120 tokens em 8 s informa 120 tokens e 15 tokens/s", async () => {
    const { buscar } = servidorFalso([evento({ content: "<pensamento>" }), FIM]);
    const resposta = await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(
      ENTRADA,
      () => undefined,
    );
    expect(resposta).toEqual({
      ok: true,
      valor: { texto: "<pensamento>", tokens: 120, tokensPorSegundo: 15 },
    });
  });

  it("calcula os tokens/s pelo tempo quando o servidor não informa a taxa", async () => {
    const fim = evento({ content: "", stop: true, timings: { predicted_n: 30, predicted_ms: 2000 } });
    const { buscar } = servidorFalso([fim]);
    const resposta = await new NarradorLlamaServer(buscar, new RelogioFalso()).falar(
      ENTRADA,
      () => undefined,
    );
    expect(resposta.ok && resposta.valor.tokensPorSegundo).toBe(15);
  });
});
