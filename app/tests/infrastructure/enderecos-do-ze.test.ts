import { describe, expect, it } from "vitest";
import { enderecosDoZe } from "../../src/infrastructure/enderecos-do-ze";

// Spec `comparacao-base-destilado`, requisito "Dois endereços do Zé".
describe("endereços do Zé", () => {
  it("sem parâmetros: destilado em 8080 e base em 8081", () => {
    expect(enderecosDoZe("")).toEqual({ destilado: "http://127.0.0.1:8080", base: "http://127.0.0.1:8081" });
  });

  it("endereço do base pela URL: ?zebase= troca só o base", () => {
    expect(enderecosDoZe("?zebase=http://127.0.0.1:9090")).toEqual({
      destilado: "http://127.0.0.1:8080",
      base: "http://127.0.0.1:9090",
    });
  });

  it("?ze= troca o destilado e tira a barra do fim", () => {
    expect(enderecosDoZe("?ze=http://localhost:7000/").destilado).toBe("http://localhost:7000");
  });
});
