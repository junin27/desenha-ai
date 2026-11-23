import { describe, expect, it } from "vitest";
import { buscarJson } from "../../src/infrastructure/arquivos/buscar-json";
import type { Buscador } from "../../src/infrastructure/narrador-llama-server";

const responder =
  (corpo: string, status = 200): Buscador =>
  () =>
    Promise.resolve(new Response(corpo, { status }));

describe("busca dos arquivos do jogo", () => {
  it("devolve o JSON lido", async () => {
    expect(await buscarJson(responder('{"a": 1}'), "modelos/classes.json")).toEqual({
      ok: true,
      valor: { a: 1 },
    });
  });

  it("arquivo ausente (404) vira erro com o endereço e o status", async () => {
    const lido = await buscarJson(responder("", 404), "modelos/classes.json");
    expect(lido.ok).toBe(false);
    if (!lido.ok) {
      expect(lido.erro.detalhe).toContain("modelos/classes.json");
      expect(lido.erro.detalhe).toContain("404");
    }
  });

  it("JSON inválido vira erro, não exceção", async () => {
    const lido = await buscarJson(responder("{quebrado"), "modelos/classes.json");
    expect(lido.ok).toBe(false);
  });

  it("falha de rede vira erro, não exceção", async () => {
    const lido = await buscarJson(() => Promise.reject(new TypeError("offline")), "modelos/classes.json");
    expect(lido.ok).toBe(false);
  });
});
